import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL ?? "http://127.0.0.1:3000";
const DEPLOYMENT_FILE =
  process.env.DEPLOYMENT_FILE ?? path.join(ROOT_DIR, "deployments", "localhost.json");

function fail(message) {
  throw new Error(message);
}

function normalizeAddresses(addresses) {
  return Object.fromEntries(
    Object.entries(addresses).map(([key, value]) => [key, ethers.getAddress(value)])
  );
}

async function readDeploymentAddresses() {
  let raw;
  try {
    raw = await readFile(DEPLOYMENT_FILE, "utf8");
  } catch (_error) {
    fail(`Deployment file not found at ${DEPLOYMENT_FILE}. Run 'npm run demo:deploy'.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    fail(`Deployment file at ${DEPLOYMENT_FILE} is not valid JSON. Re-run deployment.`);
  }

  const addresses = parsed.contractAddresses ?? parsed;
  for (const key of ["registry", "revocation", "accessControl"]) {
    if (!addresses[key]) {
      fail(`Deployment file is missing '${key}' address. Re-run 'npm run demo:deploy'.`);
    }
  }

  return normalizeAddresses({
    registry: addresses.registry,
    revocation: addresses.revocation,
    accessControl: addresses.accessControl,
  });
}

async function fetchMiddlewareStatus() {
  let response;
  try {
    response = await fetch(`${MIDDLEWARE_URL}/status`);
  } catch (_error) {
    fail(
      `Middleware not reachable at ${MIDDLEWARE_URL}. Start or restart 'npm run demo:middleware' after deployment.`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    fail(`Middleware at ${MIDDLEWARE_URL} did not return valid JSON from /status.`);
  }

  if (!response.ok) {
    fail(`Middleware /status returned HTTP ${response.status}. Restart the middleware.`);
  }

  return payload;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  let network;
  try {
    network = await provider.getNetwork();
  } catch (_error) {
    fail(`Local EVM RPC not reachable at ${RPC_URL}. Start 'npm run demo:chain'.`);
  }

  const chainId = network.chainId.toString();
  if (chainId !== "31337") {
    fail(`Expected chain ID 31337 but found ${chainId}. Use the local Hardhat node.`);
  }

  const deploymentAddresses = await readDeploymentAddresses();

  const bytecodeChecks = {};
  for (const [key, address] of Object.entries(deploymentAddresses)) {
    const code = await provider.getCode(address);
    bytecodeChecks[key] = code !== "0x";
    if (code === "0x") {
      fail(
        `No deployed bytecode found for ${key} at ${address}. Re-run 'npm run demo:deploy' against the current chain.`
      );
    }
  }

  const middlewareStatus = await fetchMiddlewareStatus();
  const middlewareAddresses = normalizeAddresses(middlewareStatus.contractAddresses ?? {});

  if (!middlewareStatus.evmReachable) {
    fail(`Middleware at ${MIDDLEWARE_URL} reports evmReachable=false. Restart the local chain and middleware.`);
  }

  if ((middlewareStatus.chainId ?? null) !== "31337") {
    fail(
      `Middleware at ${MIDDLEWARE_URL} is connected to chain ${middlewareStatus.chainId}. Restart it against the local Hardhat node.`
    );
  }

  const mismatches = Object.entries(deploymentAddresses).filter(
    ([key, value]) => middlewareAddresses[key] !== value
  );
  if (mismatches.length > 0) {
    const detail = mismatches
      .map(([key, value]) => `${key}: middleware=${middlewareAddresses[key]} deployment=${value}`)
      .join("; ");
    fail(
      `Middleware is using stale contract addresses. Restart 'npm run demo:middleware' after deployment. ${detail}`
    );
  }

  const summary = {
    ok: true,
    rpcUrl: RPC_URL,
    middlewareUrl: MIDDLEWARE_URL,
    chainId,
    deploymentFile: DEPLOYMENT_FILE,
    contractAddresses: deploymentAddresses,
    bytecodeChecks,
    middlewareStatus: {
      middlewareRunning: middlewareStatus.middlewareRunning,
      evmReachable: middlewareStatus.evmReachable,
      latestBlock: middlewareStatus.latestBlock,
      revocationMode: middlewareStatus.revocationMode ?? null,
      contractAddresses: middlewareAddresses,
    },
  };

  console.log("Backend demo preflight passed.");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Backend demo preflight failed:", error.message);
  process.exit(1);
});
