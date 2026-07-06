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

const terminalCommands = {
  A: ["cd C:\\Users\\ianho\\fyp", "npm run demo:chain"],
  B: ["cd C:\\Users\\ianho\\fyp", "npm run compile", "npm run demo:deploy"],
  C: ["cd C:\\Users\\ianho\\fyp", "npm run demo:middleware"],
  D: ["cd C:\\Users\\ianho\\fyp", "npm run demo:preflight", "npm run demo:smoke"],
};

function printBlock(title, lines) {
  console.log(`\n${title}`);
  for (const line of lines) {
    console.log(line);
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

async function checkChain() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    const network = await provider.getNetwork();
    const latestBlock = await provider.getBlockNumber();
    return {
      ok: true,
      chainId: network.chainId.toString(),
      latestBlock: latestBlock.toString(),
      provider,
    };
  } catch (_error) {
    return {
      ok: false,
      message: `Local EVM RPC not reachable at ${RPC_URL}. Start Terminal A with 'npm run demo:chain'.`,
    };
  }
}

async function readDeployment() {
  try {
    const raw = await readFile(DEPLOYMENT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const addresses = parsed.contractAddresses ?? parsed;
    return {
      ok: true,
      raw: parsed,
      addresses: normalizeAddresses({
        registry: addresses.registry,
        revocation: addresses.revocation,
        accessControl: addresses.accessControl,
      }),
    };
  } catch (_error) {
    return {
      ok: false,
      message: `Deployment file missing or unreadable at ${DEPLOYMENT_FILE}. Run Terminal B with 'npm run demo:deploy'.`,
    };
  }
}

async function checkBytecode(provider, addresses) {
  const results = {};
  for (const [key, address] of Object.entries(addresses)) {
    const code = await provider.getCode(address);
    results[key] = code !== "0x";
  }
  return results;
}

async function checkMiddleware() {
  try {
    const response = await fetch(`${MIDDLEWARE_URL}/status`);
    const payload = await response.json();
    return {
      ok: response.ok,
      statusCode: response.status,
      payload,
    };
  } catch (_error) {
    return {
      ok: false,
      message: `Middleware not reachable at ${MIDDLEWARE_URL}. Start Terminal C with 'npm run demo:middleware'.`,
    };
  }
}

function compareAddresses(deploymentAddresses, middlewareAddresses) {
  const normalizedMiddleware = normalizeAddresses(middlewareAddresses);
  return Object.entries(deploymentAddresses).filter(
    ([key, value]) => normalizedMiddleware[key] !== value
  );
}

async function main() {
  const repoCheck = {
    canonicalRepo: "C:\\Users\\ianho\\fyp",
    currentWorkingDirectory: process.cwd(),
    usingCanonicalRepo: process.cwd().toLowerCase() === "c:\\users\\ianho\\fyp",
  };

  const chain = await checkChain();
  const deployment = await readDeployment();
  let bytecodeChecks = null;

  if (chain.ok && deployment.ok) {
    bytecodeChecks = await checkBytecode(chain.provider, deployment.addresses);
  }

  const middleware = await checkMiddleware();

  let state = "chain_not_running";
  let guidance =
    "Start Terminal A with 'npm run demo:chain', then continue with the printed sequence below.";

  if (chain.ok) {
    state = "deploy_needed";
    guidance =
      "The local chain is reachable. If deployment is missing or stale, run Terminal B with 'npm run demo:deploy'.";
  }

  if (chain.ok && deployment.ok) {
    const missingBytecode = Object.entries(bytecodeChecks).filter(([, ok]) => !ok);
    if (missingBytecode.length === 0) {
      state = "middleware_not_running";
      guidance =
        "Deployment state looks valid on the current chain. Start Terminal C with 'npm run demo:middleware'.";
    } else {
      state = "deploy_needed";
      guidance =
        "Deployment file exists, but at least one contract address has no bytecode on the current chain. Re-run Terminal B with 'npm run demo:deploy'.";
    }
  }

  let middlewareMismatch = [];
  if (chain.ok && deployment.ok && middleware.ok) {
    if (!middleware.payload.evmReachable) {
      state = "middleware_stale";
      guidance =
        "Middleware is reachable but reports evmReachable=false. Restart Terminal A and Terminal C.";
    } else {
      middlewareMismatch = compareAddresses(
        deployment.addresses,
        middleware.payload.contractAddresses ?? {}
      );

      if (middlewareMismatch.length > 0) {
        state = "middleware_stale";
        guidance =
          "Middleware is running with stale contract addresses. Restart Terminal C after the latest deployment.";
      } else {
        state = "ready_for_smoke";
        guidance =
          "Chain, deployment, and middleware are aligned. Terminal D can now run 'npm run demo:preflight' and 'npm run demo:smoke'.";
      }
    }
  }

  printSection("Canonical Repo Check", repoCheck);
  printSection("Demo State Summary", {
    state,
    guidance,
    rpcUrl: RPC_URL,
    middlewareUrl: MIDDLEWARE_URL,
    deploymentFile: DEPLOYMENT_FILE,
  });

  if (chain.ok) {
    printSection("Chain Status", {
      chainId: chain.chainId,
      latestBlock: chain.latestBlock,
    });
  } else {
    printSection("Chain Status", { ok: false, error: chain.message });
  }

  if (deployment.ok) {
    printSection("Deployment Status", {
      contractAddresses: deployment.addresses,
      bytecodeChecks,
    });
  } else {
    printSection("Deployment Status", { ok: false, error: deployment.message });
  }

  if (middleware.ok) {
    printSection("Middleware Status", middleware.payload);
    if (middlewareMismatch.length > 0) {
      printSection("Middleware Address Mismatch", {
        mismatches: middlewareMismatch.map(([key, value]) => ({
          contract: key,
          middlewareAddress: middleware.payload.contractAddresses?.[key] ?? null,
          deploymentAddress: value,
        })),
      });
    }
  } else {
    printSection("Middleware Status", {
      ok: false,
      error: middleware.message ?? `Middleware /status returned HTTP ${middleware.statusCode}.`,
    });
  }

  printBlock("Terminal A", terminalCommands.A);
  printBlock("Terminal B", terminalCommands.B);
  printBlock("Terminal C", terminalCommands.C);
  printBlock("Terminal D", terminalCommands.D);
}

main().catch((error) => {
  console.error("Demo guide failed:", error.message);
  process.exit(1);
});
