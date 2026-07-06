import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet, ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const baseUrl = process.env.MIDDLEWARE_URL ?? "http://127.0.0.1:3000";
const deploymentFile =
  process.env.DEPLOYMENT_FILE ?? path.join(ROOT_DIR, "deployments", "localhost.json");

async function fetchJson(pathname, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, options);
    let payload;

    try {
      payload = await response.json();
    } catch (_error) {
      payload = { ok: false, error: "Non-JSON response received" };
    }

    return { response, payload };
  } catch (_error) {
    throw new Error(
      `Unable to reach middleware at ${baseUrl}. Start or restart 'npm run demo:middleware'.`
    );
  }
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

function normalizeAddresses(addresses) {
  return Object.fromEntries(
    Object.entries(addresses).map(([key, value]) => [key, ethers.getAddress(value)])
  );
}

async function readDeploymentAddresses() {
  const raw = await readFile(deploymentFile, "utf8");
  const parsed = JSON.parse(raw);
  const addresses = parsed.contractAddresses ?? parsed;

  return normalizeAddresses({
    registry: addresses.registry,
    revocation: addresses.revocation,
    accessControl: addresses.accessControl,
  });
}

function assertAddressMatch(statusAddresses, deploymentAddresses) {
  const normalizedStatus = normalizeAddresses(statusAddresses);
  const mismatches = Object.entries(deploymentAddresses).filter(
    ([key, value]) => normalizedStatus[key] !== value
  );

  if (mismatches.length > 0) {
    const details = mismatches
      .map(([key, value]) => `${key}: middleware=${normalizedStatus[key]} deployment=${value}`)
      .join("; ");
    throw new Error(
      `Middleware is using stale contract addresses. Restart 'npm run demo:middleware' after deployment. ${details}`
    );
  }
}

async function expectOk(title, pathname, options = {}) {
  const { response, payload } = await fetchJson(pathname, options);
  printSection(`${title} (${response.status})`, payload);

  if (!response.ok) {
    throw new Error(`${title} failed with status ${response.status}`);
  }

  return payload;
}

async function run() {
  const wallet = Wallet.createRandom();
  const principal = wallet.address;

  console.log(`Demo principal: ${principal}`);

  const status = await expectOk("GET /status", "/status");
  const deploymentAddresses = await readDeploymentAddresses();

  if (!status.evmReachable) {
    throw new Error("Middleware reports evmReachable=false. Start or restart the local Hardhat node.");
  }

  assertAddressMatch(status.contractAddresses, deploymentAddresses);

  const registerRequestId = randomUUID();
  const grantRequestId = randomUUID();
  const verifyRequestId = randomUUID();
  const revokeRequestId = randomUUID();

  await expectOk("POST /register", "/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": registerRequestId,
    },
    body: JSON.stringify({
      principal,
      attributes: "7",
      signer: principal,
    }),
  });

  await expectOk("POST /grant", "/grant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": grantRequestId,
    },
    body: JSON.stringify({
      principal,
      attributes: "15",
      signer: principal,
    }),
  });

  await expectOk("POST /verifyAccess", "/verifyAccess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": verifyRequestId,
    },
    body: JSON.stringify({
      principal,
      target: principal,
      requiredMask: "3",
      signer: principal,
    }),
  });

  await expectOk("POST /revoke", "/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": revokeRequestId,
    },
    body: JSON.stringify({
      principal,
      mode: "1",
      status: true,
      signer: principal,
    }),
  });

  await expectOk("GET /observer/device/:principal", `/observer/device/${principal}`);
  await expectOk("GET /telemetry/requests", "/telemetry/requests");
  await expectOk("GET /telemetry/transactions", "/telemetry/transactions");
  await expectOk("GET /events", "/events");

  const unknownPrincipal = Wallet.createRandom().address;
  const unknownDevice = await fetchJson(`/observer/device/${unknownPrincipal}`);
  printSection(
    `GET /observer/device/:principal (unknown) (${unknownDevice.response.status})`,
    unknownDevice.payload
  );
  if (unknownDevice.response.status !== 404) {
    throw new Error("Unknown principal check did not return 404");
  }

  const invalidPrincipal = await fetchJson("/observer/device/not-an-address");
  printSection(
    `GET /observer/device/:principal (invalid) (${invalidPrincipal.response.status})`,
    invalidPrincipal.payload
  );
  if (invalidPrincipal.response.status !== 400) {
    throw new Error("Invalid principal check did not return 400");
  }
}

run().catch((error) => {
  console.error("Demo smoke test failed:", error.message);
  process.exit(1);
});
