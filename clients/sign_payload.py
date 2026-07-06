"""Sign JSON payloads using local Ethereum ECDSA keys."""

from __future__ import annotations

import argparse
import json

from eth_account import Account
from eth_account.messages import encode_defunct


def sign_payload(private_key: str, payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    message = encode_defunct(text=canonical)
    signature = Account.sign_message(message, private_key=private_key)
    return signature.signature.hex()


def main() -> None:
    parser = argparse.ArgumentParser(description="Sign a JSON payload with ECDSA.")
    parser.add_argument("--private-key", required=True, help="Hex-encoded private key")
    parser.add_argument(
        "--payload",
        required=True,
        help='JSON payload string, e.g. \'{"principal":"0x...","attributes":"7"}\'',
    )
    args = parser.parse_args()

    payload = json.loads(args.payload)
    signature_hex = sign_payload(args.private_key, payload)
    print(signature_hex)


if __name__ == "__main__":
    main()
