<div align="center">

# Blockchain IoT Identity

Software-centric FYP1 prototype for blockchain-based IoT identity, EVM-native ABAC, revocation, telemetry, and benchmark preparation.

![Solidity](https://img.shields.io/badge/Solidity-Smart%20Contracts-363636?style=for-the-badge&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-Local%20EVM-F7DF1E?style=for-the-badge)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=111827)
![Express](https://img.shields.io/badge/Express-Middleware-111827?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Simulation%20%26%20Benchmarking-3776AB?style=for-the-badge&logo=python&logoColor=white)

</div>

---

## Table of Contents

- [About](#about)
- [Research Problem](#research-problem)
- [Prototype Scope](#prototype-scope)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Security and Public-Repo Notes](#security-and-public-repo-notes)
- [Academic Context](#academic-context)
- [License](#license)

## About

This project is my FYP1 implementation for **Blockchain-Based Identity Management for IoT Devices**. It explores how smart contracts can manage device identity, permissions, and revocation in a verifiable way without relying entirely on a single vendor-controlled cloud platform.

The prototype uses Ethereum-style externally owned accounts (EOAs) as simulated IoT device identities, bitmask-based attribute-based access control (ABAC), Solidity smart contracts, Node.js middleware, Python simulated clients, and a React/TypeScript dashboard.

## Research Problem

Smart-home and IoT ecosystems often depend on vendor-controlled identity and access systems. That can create a single point of failure, vendor lock-in, slow revocation, and limited audit evidence. This FYP investigates whether an EVM-native smart-contract layer can provide a lightweight, auditable identity and revocation model for IoT devices.

The planned FYP2 research comparison is:

> Which revocation strategy works better on the EVM for IoT identity management: sparse mapping by device address or bitmap revocation by device index?

## Prototype Scope

Included in FYP1:

- Local Hardhat EVM.
- Solidity contracts for device registry, access checking, and revocation.
- Node.js/Express middleware for API calls, transaction submission, nonce management, and telemetry.
- Python simulated IoT clients for identity generation, payload signing, and demo requests.
- React/TypeScript dashboard for admin actions, monitoring, and benchmark readiness.
- Preliminary benchmark harness for small FYP1 validation loads.

Out of scope for this public FYP1 prototype:

- Physical IoT hardware.
- Mainnet deployment.
- Cloud deployment.
- W3C DID/VC as the core identity model.
- Final FYP2 benchmark results.

## System Architecture

```text
React/TypeScript Dashboard
        |
        | HTTP requests
        v
Node.js Express Middleware
        |
        | Ethers.js transactions and reads
        v
Hardhat Local EVM
        |
        | Solidity contracts
        v
IoTRegistry + Revocation + AccessControlBenchmark

Python simulated clients and benchmark harness call the middleware for identity and access workflows.
```

## Key Features

### Smart Contracts

- `IoTRegistry` stores device EOA addresses, bitmask attributes, and sequential device indexes.
- `Revocation` supports two revocation strategies:
  - Strategy A: sparse mapping by device address.
  - Strategy B: packed bitmap by device index.
- `AccessControlBenchmark` checks whether a requester has the required permission bits and is not revoked.

### Middleware

- Connects to a local Hardhat RPC endpoint.
- Loads deployed contract addresses from `deployments/localhost.json`.
- Exposes routes such as:
  - `GET /status`
  - `POST /register`
  - `POST /grant`
  - `POST /verifyAccess`
  - `POST /revoke`
  - `GET /observer/device/:principal`
  - `GET /telemetry/requests`
  - `GET /telemetry/transactions`
  - `GET /events`

### Dashboard

- Overview page for prototype state and supported routes.
- Admin action page for register, grant, verify, and revoke flows.
- On-chain monitor for device state and telemetry evidence.
- Benchmark page for readiness and FYP1 benchmark scope.

### Python Simulation

- Generates Ethereum-style device accounts.
- Signs JSON payloads with `eth_account`.
- Calls middleware endpoints for demo and preliminary benchmark flows.

## Repository Structure

```text
blockchain-iot-identity/
|-- contracts/        Solidity contracts
|-- middleware/       Express API bridge and telemetry logic
|-- clients/          Python simulated IoT identity/client tools
|-- harness/          Preliminary benchmark harness
|-- dashboard/        React + TypeScript admin/observer dashboard
|-- scripts/          Deploy, preflight, smoke-test, and demo scripts
|-- test/             Contract test placeholder
|-- package.json      Root scripts and Node dependencies
|-- requirements.txt  Python dependencies
`-- README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- Python 3
- A local terminal capable of running Hardhat and the middleware

### Install

```bash
npm install
pip install -r requirements.txt
cd dashboard
npm install
```

### Run the local demo stack

Terminal 1:

```bash
npm run demo:chain
```

Terminal 2:

```bash
set DEPLOYER_PRIVATE_KEY=<local-hardhat-private-key>
set MIDDLEWARE_SIGNER_PRIVATE_KEY=<local-hardhat-private-key>
npm run demo:deploy
npm run start:middleware
```

Terminal 3:

```bash
npm run dev:dashboard
```

Optional simulated client:

```bash
npm run demo:client
```

## Security and Public-Repo Notes

- Generated Hardhat artifacts, dependency folders, virtual environments, logs, and generated benchmark outputs are excluded.
- The public copy requires signer keys through environment variables.
- Do not use a real wallet private key. Use local Hardhat development accounts only.

## Academic Context

- Project: Blockchain-Based Identity Management for IoT Devices
- Degree context: Final Year Project 1
- Student: Koo Ian Hong
- FYP1 focus: software prototype and preliminary benchmark evidence
- FYP2 focus: full sparse-mapping vs bitmap revocation benchmark

## License

This repository is released under the MIT License. See [LICENSE](LICENSE) for details.
