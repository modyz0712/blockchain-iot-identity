import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import {
  buildRequestLogPayload,
  getRecentEvents,
  getRecentRequests,
  getRecentTransactions,
  logClientRequest,
  logContractSubmission,
  logReceipt,
} from "./telemetry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const PORT = Number(process.env.PORT ?? 3000);
const DASHBOARD_DIST_DIR = path.join(ROOT_DIR, "dashboard", "dist");
const DASHBOARD_INDEX_FILE = path.join(DASHBOARD_DIST_DIR, "index.html");
const HAS_DASHBOARD_BUILD = existsSync(DASHBOARD_INDEX_FILE);
const DEPLOYMENT_FILE =
  process.env.DEPLOYMENT_FILE ?? path.join(ROOT_DIR, "deployments", "localhost.json");
const FALLBACK_PRIVATE_KEY =
  process.env.MIDDLEWARE_SIGNER_PRIVATE_KEY;
if (!FALLBACK_PRIVATE_KEY) {
  throw new Error("Set MIDDLEWARE_SIGNER_PRIVATE_KEY for local signing.");
}
const SIGNER_ADDRESS = new ethers.Wallet(FALLBACK_PRIVATE_KEY).address;

const registryAbi = [
  "event DeviceRegistered(address indexed eoa, uint256 attributes, uint256 index)",
  "event AttributesUpdated(address indexed eoa, uint256 oldAttributes, uint256 newAttributes)",
  "function registerDevice(address eoa, uint256 attributes)",
  "function updateAttributes(address eoa, uint256 newAttributes)",
  "function queryAttributes(address eoa) view returns (uint256)",
  "function getDeviceIndex(address eoa) view returns (uint256)",
];

const revocationAbi = [
  "event RevocationModeChanged(uint8 indexed mode)",
  "event DeviceRevocationUpdatedA(address indexed eoa, bool status)",
  "event DeviceRevocationUpdatedB(uint256 indexed index, bool status)",
  "function setMode(uint8 newMode)",
  "function getMode() view returns (uint8)",
  "function revokeDeviceA(address eoa, bool status)",
  "function revokeDeviceB(uint256 index, bool status)",
  "function isRevoked(address eoa, uint256 index) view returns (bool)",
];

const accessControlAbi = [
  "event AccessVerified(address indexed requester, address indexed target, uint256 requiredMask, bool granted, bool revoked, uint256 requesterAttributes, uint256 requesterIndex)",
  "function verifyAccess(address requester, address target, uint256 requiredMask) returns (bool)",
];

const runtime = {
  middlewareRunning: true,
  evmReachable: false,
  rpcUrl: RPC_URL,
  deploymentFile: DEPLOYMENT_FILE,
  chainId: null,
  latestBlock: null,
  revocationMode: null,
  nextNonce: null,
  contractAddressSource: null,
  contractAddresses: {
    registry: null,
    revocation: null,
    accessControl: null,
  },
};

let provider;
let registryContract;
let revocationContract;
let accessControlContract;
let registryInterface;
let revocationInterface;
let accessControlInterface;

function parseAddress(value, fieldName) {
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`Invalid or missing ${fieldName}`);
  }
  return ethers.getAddress(value);
}

function parseUint(value, fieldName) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    throw new Error("Unsupported numeric type");
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

function parseMode(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number" || typeof value === "bigint") {
    const numeric = Number(value);
    if (numeric === 0 || numeric === 1) return numeric;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "0" || normalized === "A") return 0;
    if (normalized === "1" || normalized === "B") return 1;
  }
  throw new Error("Invalid revocation mode. Use 0/A or 1/B.");
}

function serializeAddress(value) {
  if (typeof value === "string" && ethers.isAddress(value)) {
    return ethers.getAddress(value);
  }
  return value;
}

function serializeNumeric(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : String(value);
  }
  return value;
}

function normalizeReceiptStatus(status) {
  return status === 1;
}

function createWriteSigner() {
  return new ethers.Wallet(FALLBACK_PRIVATE_KEY, provider);
}

async function reserveNonce() {
  const pendingNonce = await provider.getTransactionCount(SIGNER_ADDRESS, "pending");

  if (runtime.nextNonce === null || runtime.nextNonce < pendingNonce) {
    runtime.nextNonce = pendingNonce;
  }

  const nonce = runtime.nextNonce;
  runtime.nextNonce += 1;
  return nonce;
}

function buildEventPayload(contractName, eventName, parsedLog, txHash) {
  const base = {
    contract: contractName,
    event: eventName,
    txHash,
  };

  switch (eventName) {
    case "DeviceRegistered":
      return {
        ...base,
        principal: serializeAddress(parsedLog.args.eoa),
        attributes: serializeNumeric(parsedLog.args.attributes),
        index: serializeNumeric(parsedLog.args.index),
      };
    case "AttributesUpdated":
      return {
        ...base,
        principal: serializeAddress(parsedLog.args.eoa),
        oldAttributes: serializeNumeric(parsedLog.args.oldAttributes),
        newAttributes: serializeNumeric(parsedLog.args.newAttributes),
      };
    case "RevocationModeChanged":
      return {
        ...base,
        mode: serializeNumeric(parsedLog.args.mode),
      };
    case "DeviceRevocationUpdatedA":
      return {
        ...base,
        principal: serializeAddress(parsedLog.args.eoa),
        status: Boolean(parsedLog.args.status),
      };
    case "DeviceRevocationUpdatedB":
      return {
        ...base,
        index: serializeNumeric(parsedLog.args.index),
        status: Boolean(parsedLog.args.status),
      };
    case "AccessVerified":
      return {
        ...base,
        requester: serializeAddress(parsedLog.args.requester),
        target: serializeAddress(parsedLog.args.target),
        requiredMask: serializeNumeric(parsedLog.args.requiredMask),
        granted: Boolean(parsedLog.args.granted),
        revoked: Boolean(parsedLog.args.revoked),
        requesterAttributes: serializeNumeric(parsedLog.args.requesterAttributes),
        requesterIndex: serializeNumeric(parsedLog.args.requesterIndex),
      };
    default:
      return {
        ...base,
        name: eventName,
      };
  }
}

function parseReceiptEvents(receipt) {
  const eventSources = [
    { contract: "registry", iface: registryInterface },
    { contract: "revocation", iface: revocationInterface },
    { contract: "accessControl", iface: accessControlInterface },
  ];

  const events = [];

  for (const log of receipt.logs) {
    for (const source of eventSources) {
      try {
        const parsedLog = source.iface.parseLog(log);
        if (parsedLog) {
          events.push(buildEventPayload(source.contract, parsedLog.name, parsedLog, receipt.hash));
          break;
        }
      } catch (_error) {
        // Ignore logs that do not match the current interface.
      }
    }
  }

  return events;
}

async function submitContractCall(methodName, requestId, txFactory) {
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nonce = await reserveNonce();

    try {
      const tx = await txFactory(nonce);
      logContractSubmission({
        requestId,
        method: methodName,
        txHash: tx.hash,
      });

      const receipt = await tx.wait(1);
      const events = parseReceiptEvents(receipt);
      logReceipt({
        requestId,
        method: methodName,
        txHash: tx.hash,
        blockNumber: serializeNumeric(receipt.blockNumber),
        gasUsed: serializeNumeric(receipt.gasUsed),
        status: normalizeReceiptStatus(receipt.status),
        events,
      });

      return { tx, receipt, events };
    } catch (error) {
      lastError = error;

      if (error?.code === "NONCE_EXPIRED" && attempt === 0) {
        runtime.nextNonce = null;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

async function loadContractAddresses() {
  const envAddresses = {
    registry: process.env.REGISTRY_ADDRESS,
    revocation: process.env.REVOCATION_ADDRESS,
    accessControl: process.env.ACCESS_CONTROL_ADDRESS,
  };

  if (envAddresses.registry && envAddresses.revocation && envAddresses.accessControl) {
    runtime.contractAddressSource = "env";
    return {
      registry: parseAddress(envAddresses.registry, "REGISTRY_ADDRESS"),
      revocation: parseAddress(envAddresses.revocation, "REVOCATION_ADDRESS"),
      accessControl: parseAddress(envAddresses.accessControl, "ACCESS_CONTROL_ADDRESS"),
    };
  }

  const raw = await readFile(DEPLOYMENT_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const addresses = parsed.contractAddresses ?? parsed;
  runtime.contractAddressSource = "deploymentFile";
  return {
    registry: parseAddress(addresses.registry, "registry"),
    revocation: parseAddress(addresses.revocation, "revocation"),
    accessControl: parseAddress(addresses.accessControl, "accessControl"),
  };
}

async function verifyContractCode(address, label) {
  const code = await provider.getCode(address);
  if (!code || code === "0x") {
    throw new Error(`No deployed bytecode found for ${label} at ${address}`);
  }
}

async function refreshRuntimeState() {
  const network = await provider.getNetwork();
  const latestBlock = await provider.getBlockNumber();
  const revocationMode = await revocationContract.getMode();

  runtime.evmReachable = true;
  runtime.chainId = network.chainId.toString();
  runtime.latestBlock = latestBlock.toString();
  runtime.revocationMode = revocationMode.toString();
}

async function bootstrap() {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  runtime.nextNonce = null;

  registryInterface = new ethers.Interface(registryAbi);
  revocationInterface = new ethers.Interface(revocationAbi);
  accessControlInterface = new ethers.Interface(accessControlAbi);

  const addresses = await loadContractAddresses();
  runtime.contractAddresses = addresses;

  await verifyContractCode(addresses.registry, "IoTRegistry");
  await verifyContractCode(addresses.revocation, "Revocation");
  await verifyContractCode(addresses.accessControl, "AccessControlBenchmark");

  registryContract = new ethers.Contract(addresses.registry, registryAbi, provider);
  revocationContract = new ethers.Contract(addresses.revocation, revocationAbi, provider);
  accessControlContract = new ethers.Contract(addresses.accessControl, accessControlAbi, provider);

  await refreshRuntimeState();

  console.log("Middleware connected to local EVM");
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Chain ID: ${runtime.chainId}`);
  console.log(`Latest block number: ${runtime.latestBlock}`);
  console.log(`Revocation mode: ${runtime.revocationMode}`);
  console.log("Loaded contract addresses:", runtime.contractAddresses);
}

function assertContractsReady() {
  if (!runtime.evmReachable || !registryContract || !revocationContract || !accessControlContract) {
    throw new Error("Middleware not connected to local EVM and contracts.");
  }
}

function buildResponseMeta(req, route) {
  return {
    requestId: req.requestId,
    route,
  };
}

async function readDeviceState(principal) {
  const revocationMode = await revocationContract.getMode();

  try {
    const [index, attributes] = await Promise.all([
      registryContract.getDeviceIndex(principal),
      registryContract.queryAttributes(principal),
    ]);
    const revoked = await revocationContract.isRevoked(principal, index);

    return {
      principal,
      registered: true,
      attributes: attributes.toString(),
      index: index.toString(),
      revocationMode: revocationMode.toString(),
      revoked: Boolean(revoked),
    };
  } catch (_error) {
    return {
      principal,
      registered: false,
      attributes: null,
      index: null,
      revocationMode: revocationMode.toString(),
      revoked: null,
    };
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  req.requestId = req.header("x-request-id") || randomUUID();
  req.requestTimestamp = new Date().toISOString();
  res.setHeader("x-request-id", req.requestId);
  next();
});

app.get("/status", async (req, res) => {
  try {
    await refreshRuntimeState();
  } catch (_error) {
    runtime.evmReachable = false;
  }

  res.json({
    ok: true,
    ...buildResponseMeta(req, "/status"),
    middlewareRunning: true,
    evmReachable: runtime.evmReachable,
    rpcUrl: runtime.rpcUrl,
    deploymentFile: runtime.deploymentFile,
    chainId: runtime.chainId,
    latestBlock: runtime.latestBlock,
    revocationMode: runtime.revocationMode,
    contractAddressSource: runtime.contractAddressSource,
    contractAddresses: runtime.contractAddresses,
  });
});

app.get("/observer/device/:principal", async (req, res) => {
  try {
    assertContractsReady();
    const principal = parseAddress(req.params.principal, "principal");
    const state = await readDeviceState(principal);

    if (!state.registered) {
      res.status(404).json({
        ok: false,
        ...buildResponseMeta(req, "/observer/device/:principal"),
        principal,
        registered: false,
        error: "Device not registered",
        revocationMode: state.revocationMode,
      });
      return;
    }

    res.json({
      ok: true,
      ...buildResponseMeta(req, "/observer/device/:principal"),
      ...state,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      ...buildResponseMeta(req, "/observer/device/:principal"),
      error: error.message,
    });
  }
});

app.get("/telemetry/requests", (req, res) => {
  res.json({
    ok: true,
    ...buildResponseMeta(req, "/telemetry/requests"),
    requests: getRecentRequests(),
  });
});

app.get("/telemetry/transactions", (req, res) => {
  res.json({
    ok: true,
    ...buildResponseMeta(req, "/telemetry/transactions"),
    transactions: getRecentTransactions(),
  });
});

app.get("/events", (req, res) => {
  res.json({
    ok: true,
    ...buildResponseMeta(req, "/events"),
    events: getRecentEvents(),
  });
});

app.post("/register", async (req, res) => {
  try {
    assertContractsReady();
    const principal = parseAddress(req.body?.principal, "principal");
    const attributes = parseUint(req.body?.attributes ?? 0, "attributes");

    logClientRequest(buildRequestLogPayload(req, principal));
    const writeRegistry = registryContract.connect(createWriteSigner());
    const { tx, receipt } = await submitContractCall(
      "registerDevice",
      req.requestId,
      (nonce) => writeRegistry.registerDevice(principal, attributes, { nonce })
    );

    res.json({
      ok: true,
      requestId: req.requestId,
      route: "/register",
      principal,
      attributes: attributes.toString(),
      txHash: tx.hash,
      receiptStatus: normalizeReceiptStatus(receipt.status),
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (error) {
    res.status(400).json({ ok: false, requestId: req.requestId, error: error.message });
  }
});

app.post("/grant", async (req, res) => {
  try {
    assertContractsReady();
    const principal = parseAddress(req.body?.principal, "principal");
    const attributes = parseUint(req.body?.attributes, "attributes");

    logClientRequest(buildRequestLogPayload(req, principal));
    const writeRegistry = registryContract.connect(createWriteSigner());
    const { tx, receipt } = await submitContractCall(
      "updateAttributes",
      req.requestId,
      (nonce) => writeRegistry.updateAttributes(principal, attributes, { nonce })
    );

    res.json({
      ok: true,
      requestId: req.requestId,
      route: "/grant",
      principal,
      attributes: attributes.toString(),
      txHash: tx.hash,
      receiptStatus: normalizeReceiptStatus(receipt.status),
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (error) {
    res.status(400).json({ ok: false, requestId: req.requestId, error: error.message });
  }
});

app.post("/verifyAccess", async (req, res) => {
  try {
    assertContractsReady();
    const principal = parseAddress(req.body?.principal, "principal");
    const target = req.body?.target ? parseAddress(req.body.target, "target") : principal;
    const requiredMask = parseUint(req.body?.requiredMask, "requiredMask");

    logClientRequest(buildRequestLogPayload(req, principal));
    const writeAccessControl = accessControlContract.connect(createWriteSigner());
    const { tx, receipt, events } = await submitContractCall(
      "verifyAccess",
      req.requestId,
      (nonce) => writeAccessControl.verifyAccess(principal, target, requiredMask, { nonce })
    );

    const accessVerifiedEvent = events.find((event) => event.event === "AccessVerified") ?? null;

    res.json({
      ok: true,
      requestId: req.requestId,
      route: "/verifyAccess",
      principal,
      target,
      requiredMask: requiredMask.toString(),
      granted: accessVerifiedEvent?.granted ?? null,
      revoked: accessVerifiedEvent?.revoked ?? null,
      txHash: tx.hash,
      receiptStatus: normalizeReceiptStatus(receipt.status),
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (error) {
    res.status(400).json({ ok: false, requestId: req.requestId, error: error.message });
  }
});

app.post("/revoke", async (req, res) => {
  try {
    assertContractsReady();
    const principal = parseAddress(req.body?.principal, "principal");
    const status = req.body?.status === undefined ? true : Boolean(req.body.status);
    const mode = parseMode(req.body?.mode);

    logClientRequest(buildRequestLogPayload(req, principal));

    const writeRevocation = revocationContract.connect(createWriteSigner());
    const modeTx = await submitContractCall(
      "setMode",
      req.requestId,
      (nonce) => writeRevocation.setMode(mode, { nonce })
    );

    let revokeTxResult;
    let indexUsed = null;
    if (mode === 0) {
      revokeTxResult = await submitContractCall(
        "revokeDeviceA",
        req.requestId,
        (nonce) =>
          revocationContract.connect(createWriteSigner()).revokeDeviceA(principal, status, { nonce })
      );
    } else {
      const deviceIndex = await registryContract.getDeviceIndex(principal);
      indexUsed = deviceIndex.toString();
      revokeTxResult = await submitContractCall(
        "revokeDeviceB",
        req.requestId,
        (nonce) =>
          revocationContract.connect(createWriteSigner()).revokeDeviceB(deviceIndex, status, { nonce })
      );
    }

    await refreshRuntimeState();

    res.json({
      ok: true,
      requestId: req.requestId,
      route: "/revoke",
      principal,
      mode: mode.toString(),
      status,
      indexUsed,
      setModeTxHash: modeTx.tx.hash,
      revokeTxHash: revokeTxResult.tx.hash,
      receiptStatus: normalizeReceiptStatus(revokeTxResult.receipt.status),
      blockNumber: revokeTxResult.receipt.blockNumber.toString(),
      gasUsed: revokeTxResult.receipt.gasUsed.toString(),
    });
  } catch (error) {
    res.status(400).json({ ok: false, requestId: req.requestId, error: error.message });
  }
});

if (HAS_DASHBOARD_BUILD) {
  app.use(express.static(DASHBOARD_DIST_DIR));

  app.get(/.*/, (req, res, next) => {
    const apiPrefixes = [
      "/status",
      "/register",
      "/grant",
      "/verifyAccess",
      "/revoke",
      "/revocation",
      "/devices",
      "/telemetry",
      "/events",
      "/benchmarks",
    ];

    if (apiPrefixes.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
      next();
      return;
    }

    res.sendFile(DASHBOARD_INDEX_FILE);
  });
}

async function start() {
  try {
    await bootstrap();
  } catch (error) {
    console.error("Failed to bootstrap middleware:", error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Middleware listening on port ${PORT}`);
    if (HAS_DASHBOARD_BUILD) {
      console.log(`Serving dashboard SPA from ${DASHBOARD_DIST_DIR}`);
    }
  });
}

start();
