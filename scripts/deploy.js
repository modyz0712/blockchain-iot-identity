import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY;

const DEPLOYMENTS_DIR = path.join(ROOT_DIR, "deployments");
const LOCALHOST_DEPLOYMENT_FILE = path.join(DEPLOYMENTS_DIR, "localhost.json");

async function loadArtifact(contractFile, contractName) {
  const artifactPath = path.join(
    ROOT_DIR,
    "artifacts",
    "contracts",
    `${contractFile}.sol`,
    `${contractName}.json`
  );
  const raw = await readFile(artifactPath, "utf8");
  return JSON.parse(raw);
}

async function deployContract(artifact, signer, args = [], txOverrides = {}) {
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args, txOverrides);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error("Set DEPLOYER_PRIVATE_KEY for local deployment.");
  }
  const provider = new JsonRpcProvider(RPC_URL);
  const signer = new Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const deployerAddress = await signer.getAddress();

  const network = await provider.getNetwork();
  console.log("Deploying contracts with:", deployerAddress);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Chain ID: ${network.chainId.toString()}`);

  if (network.chainId.toString() !== "31337") {
    throw new Error(
      `Refusing to overwrite ${LOCALHOST_DEPLOYMENT_FILE} because RPC ${RPC_URL} is on chain ${network.chainId.toString()}, not local Hardhat chain 31337.`
    );
  }

  let nextNonce = await provider.getTransactionCount(deployerAddress, "pending");

  const registryArtifact = await loadArtifact("IoTRegistry", "IoTRegistry");
  const revocationArtifact = await loadArtifact("Revocation", "Revocation");
  const accessArtifact = await loadArtifact("AccessControlBenchmark", "AccessControlBenchmark");

  const registry = await deployContract(registryArtifact, signer, [], { nonce: nextNonce++ });
  const revocation = await deployContract(revocationArtifact, signer, [], { nonce: nextNonce++ });
  const accessControl = await deployContract(accessArtifact, signer, [
    await registry.getAddress(),
    await revocation.getAddress(),
  ], { nonce: nextNonce++ });

  const deployedAtBlock = await provider.getBlockNumber();
  const payload = {
    network: "localhost",
    rpcUrl: RPC_URL,
    chainId: network.chainId.toString(),
    deployedAtBlock,
    deployedBy: deployerAddress,
    contractAddresses: {
      registry: await registry.getAddress(),
      revocation: await revocation.getAddress(),
      accessControl: await accessControl.getAddress(),
    },
  };

  await mkdir(DEPLOYMENTS_DIR, { recursive: true });
  await writeFile(LOCALHOST_DEPLOYMENT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log("Deployment completed:");
  console.log(JSON.stringify(payload, null, 2));
  console.log(`Wrote deployment metadata to ${LOCALHOST_DEPLOYMENT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
