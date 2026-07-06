"""Generate local Ethereum EOAs for simulated IoT principals."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from eth_account import Account


def create_identity() -> dict[str, str]:
    account = Account.create()
    return {
        "address": account.address,
        "privateKey": account.key.hex(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate one or more local EOAs.")
    parser.add_argument("--count", type=int, default=1, help="Number of identities to generate")
    parser.add_argument("--out", type=Path, help="Optional output JSON file")
    args = parser.parse_args()

    identities = [create_identity() for _ in range(max(args.count, 1))]
    output = identities[0] if len(identities) == 1 else identities
    output_text = json.dumps(output, indent=2)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(f"{output_text}\n", encoding="utf-8")
        print(f"Wrote {len(identities)} identity record(s) to {args.out}")
    else:
        print(output_text)


if __name__ == "__main__":
    main()
