# Blockchain IoT Identity

FYP1 prototype for blockchain-based identity management for IoT devices. The project explores Ethereum-style device accounts, smart-contract based registration, access control, revocation, middleware telemetry, simulated IoT clients, benchmarking scripts, and a React dashboard.

## Features

- Solidity contracts for IoT registry, revocation, and access-control benchmarking.
- Node.js/Express middleware for contract operations and telemetry endpoints.
- Python clients for device identity generation, payload signing, and access simulation.
- React/Vite dashboard for administrator workflows and monitoring.
- Benchmark harness for evaluating access verification and revocation behavior.

## Tech Stack

Solidity, Hardhat, Ethers.js, Express, Python, React, TypeScript, Vite.

## Run Locally

```bash
npm install
npm run compile
npm run demo:chain
```

In another terminal, set local-only signer keys, deploy contracts, and start the middleware:

```bash
set DEPLOYER_PRIVATE_KEY=<local-hardhat-private-key>
set MIDDLEWARE_SIGNER_PRIVATE_KEY=<local-hardhat-private-key>
npm run demo:deploy
npm run start:middleware
npm run dev:dashboard
```

## Notes

This repository is a public portfolio copy. Generated contract artifacts, dependency folders, virtual environments, logs, and local private keys are intentionally excluded.
