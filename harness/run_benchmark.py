"""Preliminary FYP1 verifyAccess burst harness."""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any
from uuid import uuid4

ROOT_DIR = Path(__file__).resolve().parents[1]
VENV_SITE_PACKAGES = ROOT_DIR / ".venv" / "Lib" / "site-packages"

if VENV_SITE_PACKAGES.exists() and str(VENV_SITE_PACKAGES) not in sys.path:
    # Allow the documented `python harness/run_benchmark.py` entrypoint to reuse repo-local deps.
    sys.path.insert(0, str(VENV_SITE_PACKAGES))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import aiohttp

from clients.generate_identity import create_identity
from clients.sign_payload import sign_payload

ALLOWED_LOADS = {1, 10}
CSV_FIELDS = [
    "run_label",
    "concurrency",
    "request_id",
    "principal",
    "http_status",
    "granted",
    "tx_hash",
    "block_number",
    "gas_used",
    "client_started_at",
    "client_completed_at",
    "client_round_trip_ms",
    "middleware_submitted_at",
    "middleware_received_at",
    "middleware_tol_ms",
    "receipt_status",
]


class BenchmarkError(RuntimeError):
    """Raised when the preliminary benchmark cannot complete truthfully."""


@dataclass(frozen=True)
class Identity:
    principal: str
    private_key: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso8601(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def duration_ms(start: str, end: str) -> float:
    return round((parse_iso8601(end) - parse_iso8601(start)).total_seconds() * 1000, 3)


def parse_loads(raw: str) -> list[int]:
    loads: list[int] = []
    seen: set[int] = set()
    for chunk in raw.split(","):
        value = chunk.strip()
        if not value:
            continue
        try:
            load = int(value)
        except ValueError as error:
            raise BenchmarkError(f"Invalid load value '{value}'. Use only 1 and/or 10.") from error
        if load not in ALLOWED_LOADS:
            raise BenchmarkError(
                f"Load {load} is outside the FYP1 boundary. Allowed loads: {sorted(ALLOWED_LOADS)}."
            )
        if load not in seen:
            loads.append(load)
            seen.add(load)
    if not loads:
        raise BenchmarkError("No loads provided. Use --loads 1,10 or a subset such as --loads 10.")
    return loads


def resolve_results_dir(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = ROOT_DIR / candidate
    return candidate


def create_identity_record() -> Identity:
    record = create_identity()
    return Identity(principal=record["address"], private_key=record["privateKey"])


def format_middleware_error(error_text: str) -> str:
    if "Nonce too high" in error_text or "replacement transaction underpriced" in error_text:
        return (
            f"{error_text} Restart 'npm run demo:middleware' to reset the in-memory nonce state "
            "before running the preliminary harness again."
        )
    return error_text


def build_register_signature(identity: Identity, attributes: str, timestamp: str) -> str:
    payload = {
        "principal": identity.principal,
        "attributes": attributes,
        "timestamp": timestamp,
    }
    return sign_payload(identity.private_key, payload)


async def request_json(
    session: aiohttp.ClientSession,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any]]:
    async with session.request(method, url, headers=headers, json=json_body) as response:
        try:
            payload = await response.json()
        except aiohttp.ContentTypeError as error:
            text = await response.text()
            raise BenchmarkError(f"Non-JSON response from {method} {url}: {text}") from error
        return response.status, payload


async def fetch_status(session: aiohttp.ClientSession, base_url: str) -> dict[str, Any]:
    status_code, payload = await request_json(session, "GET", f"{base_url}/status")
    if status_code != 200:
        raise BenchmarkError(f"/status returned HTTP {status_code}.")
    if not payload.get("ok"):
        raise BenchmarkError("Middleware /status returned ok=false.")
    if not payload.get("middlewareRunning"):
        raise BenchmarkError("Middleware reports middlewareRunning=false.")
    if not payload.get("evmReachable"):
        raise BenchmarkError("Middleware reports evmReachable=false.")
    chain_id = str(payload.get("chainId"))
    if chain_id != "31337":
        raise BenchmarkError(f"Expected local Hardhat chain 31337, but /status returned chainId={chain_id}.")
    return payload


async def register_identity(
    session: aiohttp.ClientSession,
    base_url: str,
    identity: Identity,
    attributes: str,
) -> None:
    request_id = str(uuid4())
    timestamp = utc_now()
    signature = build_register_signature(identity, attributes, timestamp)
    body = {
        "principal": identity.principal,
        "attributes": attributes,
        "signer": identity.principal,
        "signature": signature,
    }
    status_code, payload = await request_json(
        session,
        "POST",
        f"{base_url}/register",
        headers={"Content-Type": "application/json", "x-request-id": request_id},
        json_body=body,
    )
    if status_code != 200 or not payload.get("ok"):
        error_text = format_middleware_error(json.dumps(payload))
        raise BenchmarkError(
            f"Registration failed for {identity.principal}: HTTP {status_code} {error_text}"
        )


async def verify_access(
    session: aiohttp.ClientSession,
    base_url: str,
    identity: Identity,
    required_mask: str,
    run_label: str,
    concurrency: int,
) -> dict[str, Any]:
    request_id = str(uuid4())
    client_started_at = utc_now()
    timer_started = perf_counter()
    status_code = 0
    payload: dict[str, Any] = {}
    error_message: str | None = None

    try:
        status_code, payload = await request_json(
            session,
            "POST",
            f"{base_url}/verifyAccess",
            headers={"Content-Type": "application/json", "x-request-id": request_id},
            json_body={
                "principal": identity.principal,
                "target": identity.principal,
                "requiredMask": required_mask,
                "signer": identity.principal,
            },
        )
    except Exception as error:  # pragma: no cover - network failures are environment-dependent.
        error_message = str(error)

    client_completed_at = utc_now()
    row = {
        "run_label": run_label,
        "concurrency": concurrency,
        "request_id": request_id,
        "principal": identity.principal,
        "http_status": status_code,
        "granted": payload.get("granted"),
        "tx_hash": payload.get("txHash"),
        "block_number": payload.get("blockNumber"),
        "gas_used": payload.get("gasUsed"),
        "client_started_at": client_started_at,
        "client_completed_at": client_completed_at,
        "client_round_trip_ms": round((perf_counter() - timer_started) * 1000, 3),
        "middleware_submitted_at": "",
        "middleware_received_at": "",
        "middleware_tol_ms": "",
        "receipt_status": payload.get("receiptStatus"),
        "_payload": payload,
        "_response_ok": status_code == 200 and payload.get("ok") is True and error_message is None,
        "_error": format_middleware_error(error_message) if error_message else None,
    }
    return row


async def fetch_verify_transactions(
    session: aiohttp.ClientSession,
    base_url: str,
    request_ids: set[str],
) -> dict[str, dict[str, Any]]:
    for _ in range(5):
        status_code, payload = await request_json(session, "GET", f"{base_url}/telemetry/transactions")
        if status_code != 200 or not payload.get("ok"):
            raise BenchmarkError(f"/telemetry/transactions failed: HTTP {status_code} {json.dumps(payload)}")

        matches: dict[str, dict[str, Any]] = {}
        for transaction in payload.get("transactions", []):
            if transaction.get("method") != "verifyAccess":
                continue
            request_id = transaction.get("requestId")
            if request_id in request_ids and transaction.get("receipt"):
                matches[request_id] = transaction

        if request_ids.issubset(matches.keys()):
            return matches

        await asyncio.sleep(0.2)

    return matches


def attach_telemetry(rows: list[dict[str, Any]], telemetry: dict[str, dict[str, Any]]) -> None:
    for row in rows:
        if not row["_response_ok"]:
            continue

        transaction = telemetry.get(row["request_id"])
        if not transaction:
            raise BenchmarkError(f"Missing telemetry transaction for request {row['request_id']}.")

        receipt = transaction.get("receipt")
        if not receipt:
            raise BenchmarkError(f"Missing telemetry receipt for request {row['request_id']}.")

        submitted_at = transaction.get("submittedAt")
        received_at = receipt.get("receivedAt")
        if not submitted_at or not received_at:
            raise BenchmarkError(f"Incomplete telemetry timestamps for request {row['request_id']}.")

        row["tx_hash"] = row["tx_hash"] or transaction.get("txHash")
        row["block_number"] = row["block_number"] or receipt.get("blockNumber")
        row["gas_used"] = row["gas_used"] or receipt.get("gasUsed")
        row["receipt_status"] = (
            row["receipt_status"] if row["receipt_status"] not in ("", None) else receipt.get("status")
        )
        row["middleware_submitted_at"] = submitted_at
        row["middleware_received_at"] = received_at
        row["middleware_tol_ms"] = duration_ms(submitted_at, received_at)


def mean_or_blank(values: list[float]) -> float | str:
    if not values:
        return ""
    return round(sum(values) / len(values), 3)


def build_batch_summary(rows: list[dict[str, Any]], duration_seconds: float) -> dict[str, Any]:
    success_rows = [row for row in rows if row["_response_ok"]]
    failure_rows = [row for row in rows if not row["_response_ok"]]
    gas_values = [float(row["gas_used"]) for row in success_rows if row["gas_used"] not in ("", None)]
    client_latencies = [
        float(row["client_round_trip_ms"])
        for row in success_rows
        if row["client_round_trip_ms"] not in ("", None)
    ]
    middleware_latencies = [
        float(row["middleware_tol_ms"]) for row in success_rows if row["middleware_tol_ms"] not in ("", None)
    ]
    return {
        "concurrency": rows[0]["concurrency"] if rows else None,
        "total_requests": len(rows),
        "success_count": len(success_rows),
        "failure_count": len(failure_rows),
        "batch_duration_seconds": round(duration_seconds, 3),
        "batch_throughput_rps": round((len(rows) / duration_seconds), 3) if duration_seconds > 0 else 0.0,
        "average_gas_used": mean_or_blank(gas_values),
        "average_client_round_trip_ms": mean_or_blank(client_latencies),
        "average_middleware_tol_ms": mean_or_blank(middleware_latencies),
        "failures": [
            {
                "request_id": row["request_id"],
                "principal": row["principal"],
                "http_status": row["http_status"],
                "error": row["_error"] or format_middleware_error(str(row["_payload"].get("error", ""))),
            }
            for row in failure_rows
        ],
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})


def write_log(
    path: Path,
    *,
    run_label: str,
    base_url: str,
    loads: list[int],
    environment: dict[str, Any],
    batch_summaries: list[dict[str, Any]],
    rows: list[dict[str, Any]],
) -> None:
    successful_rows = [row for row in rows if row["_response_ok"]]
    failed_rows = [row for row in rows if not row["_response_ok"]]
    averages = {
        "average_gas_used": mean_or_blank(
            [float(row["gas_used"]) for row in successful_rows if row["gas_used"] not in ("", None)]
        ),
        "average_client_round_trip_ms": mean_or_blank(
            [
                float(row["client_round_trip_ms"])
                for row in successful_rows
                if row["client_round_trip_ms"] not in ("", None)
            ]
        ),
        "average_middleware_tol_ms": mean_or_blank(
            [
                float(row["middleware_tol_ms"])
                for row in successful_rows
                if row["middleware_tol_ms"] not in ("", None)
            ]
        ),
    }

    log_payload = {
        "label": "PRELIMINARY_FYP1_ONLY",
        "run_label": run_label,
        "generated_at": utc_now(),
        "base_url": base_url,
        "load_tiers": loads,
        "environment_snapshot": environment,
        "summary": {
            "total_requests": len(rows),
            "success_count": len(successful_rows),
            "failure_count": len(failed_rows),
            **averages,
        },
        "batch_summaries": batch_summaries,
        "notes": [
            "Preliminary FYP1 feasibility output only.",
            "No true BoL instrumentation is captured in this harness.",
            "The middleware telemetry store is in-memory and suitable only for the low-load tiers used here.",
        ],
    }
    path.write_text(json.dumps(log_payload, indent=2) + "\n", encoding="utf-8")


async def run_benchmark(args: argparse.Namespace) -> tuple[Path, Path, int]:
    base_url = args.base_url.rstrip("/")
    loads = parse_loads(args.loads)
    results_dir = resolve_results_dir(args.results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    timeout = aiohttp.ClientTimeout(total=60)
    connector = aiohttp.TCPConnector(limit=25)
    run_label = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        environment = await fetch_status(session, base_url)

        all_rows: list[dict[str, Any]] = []
        batch_summaries: list[dict[str, Any]] = []

        for concurrency in loads:
            identities = [create_identity_record() for _ in range(concurrency)]
            for identity in identities:
                await register_identity(session, base_url, identity, args.attributes)

            batch_started = perf_counter()
            batch_rows = await asyncio.gather(
                *[
                    verify_access(session, base_url, identity, args.required_mask, run_label, concurrency)
                    for identity in identities
                ]
            )
            batch_duration = perf_counter() - batch_started

            successful_ids = {
                row["request_id"]
                for row in batch_rows
                if row["_response_ok"]
            }
            telemetry = await fetch_verify_transactions(session, base_url, successful_ids)
            attach_telemetry(batch_rows, telemetry)

            all_rows.extend(batch_rows)
            batch_summaries.append(build_batch_summary(batch_rows, batch_duration))

    csv_path = results_dir / f"preliminary_verify_access_{run_label}.csv"
    log_path = results_dir / f"preliminary_verify_access_{run_label}.log"
    write_csv(csv_path, all_rows)
    write_log(
        log_path,
        run_label=run_label,
        base_url=base_url,
        loads=loads,
        environment=environment,
        batch_summaries=batch_summaries,
        rows=all_rows,
    )

    failure_count = sum(1 for row in all_rows if not row["_response_ok"])
    return csv_path, log_path, failure_count


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the preliminary FYP1 verifyAccess burst harness through the existing middleware."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:3000", help="Middleware base URL")
    parser.add_argument("--loads", default="1,10", help="Comma-separated low-load tiers. Allowed: 1,10")
    parser.add_argument("--attributes", default="7", help="Bitmask used during setup registration")
    parser.add_argument("--required-mask", default="1", help="Bitmask used for /verifyAccess")
    parser.add_argument("--results-dir", default="results", help="Directory for CSV/log outputs")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        csv_path, log_path, failure_count = asyncio.run(run_benchmark(args))
    except BenchmarkError as error:
        print(f"Preliminary benchmark failed: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Preliminary benchmark interrupted.", file=sys.stderr)
        return 130

    print("PRELIMINARY_FYP1_ONLY")
    print(f"CSV output: {csv_path}")
    print(f"Log output: {log_path}")

    if failure_count > 0:
        print(
            f"Preliminary benchmark completed with {failure_count} failed verifyAccess request(s). "
            "See the CSV/log outputs for details.",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
