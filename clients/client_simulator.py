"""Minimal demo client for middleware <-> local EVM connectivity."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from uuid import uuid4

import requests
from eth_account import Account
from eth_account.messages import encode_defunct


def sign_payload(private_key: str, payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    message = encode_defunct(text=canonical)
    signed = Account.sign_message(message, private_key=private_key)
    return signed.signature.hex()


def print_response(title: str, response: requests.Response) -> None:
    print(f"\n=== {title} ({response.status_code}) ===")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a single middleware demo flow.")
    parser.add_argument("--base-url", default="http://127.0.0.1:3000", help="Middleware base URL")
    parser.add_argument("--attributes", default="7", help="Initial attribute bitmask for /register")
    parser.add_argument(
        "--required-mask",
        default="1",
        help="Bitmask used by /verifyAccess; skipped when --skip-verify is set",
    )
    parser.add_argument("--skip-verify", action="store_true", help="Skip /verifyAccess call")
    args = parser.parse_args()

    account = Account.create()
    principal = account.address
    private_key = account.key.hex()
    request_id = str(uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    payload = {
        "principal": principal,
        "attributes": str(args.attributes),
        "timestamp": timestamp,
    }
    signature = sign_payload(private_key, payload)

    headers = {"x-request-id": request_id}

    print(f"Generated demo principal: {principal}")
    print(f"Request ID: {request_id}")

    status_response = requests.get(f"{args.base_url}/status", timeout=10)
    print_response("GET /status", status_response)

    register_body = {
        "principal": principal,
        "attributes": str(args.attributes),
        "signer": principal,
        "signature": signature,
    }
    register_response = requests.post(
        f"{args.base_url}/register",
        headers=headers,
        json=register_body,
        timeout=30,
    )
    print_response("POST /register", register_response)

    if not args.skip_verify:
        verify_body = {
            "principal": principal,
            "target": principal,
            "requiredMask": str(args.required_mask),
            "signer": principal,
        }
        verify_response = requests.post(
            f"{args.base_url}/verifyAccess",
            headers=headers,
            json=verify_body,
            timeout=30,
        )
        print_response("POST /verifyAccess", verify_response)


if __name__ == "__main__":
    main()
