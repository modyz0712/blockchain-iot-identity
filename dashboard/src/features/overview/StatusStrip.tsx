import { Badge } from "../../components/ui/Badge";
import { KeyValue } from "../../components/ui/KeyValue";
import { Panel } from "../../components/ui/Panel";
import { revocationModeLabel } from "../../lib/format";
import type { StatusResponse } from "../../lib/api/types";

type StatusStripProps = {
  status?: StatusResponse;
};

export function StatusStrip({ status }: StatusStripProps) {
  if (!status) {
    return (
      <Panel title="Live system status" description="Waiting for middleware status.">
        <div className="status-strip">
          <KeyValue label="Middleware" value="Unavailable" helper="Status endpoint did not respond." />
          <KeyValue label="Local EVM" value="Unknown" helper="Start the local stack to populate this." />
        </div>
      </Panel>
    );
  }

  const contractsReady = Object.values(status.contractAddresses).every(Boolean);

  return (
    <Panel
      title="Live system status"
      description="All values are sourced from GET /status through the middleware."
      action={
        <Badge tone={status.evmReachable && contractsReady ? "live" : "warning"}>
          {status.evmReachable && contractsReady ? "Ready" : "Degraded"}
        </Badge>
      }
    >
      <div className="status-strip">
        <KeyValue
          label="Middleware"
          value={status.middlewareRunning ? "Online" : "Offline"}
          helper={status.rpcUrl}
        />
        <KeyValue
          label="Local EVM"
          value={status.evmReachable ? "Reachable" : "Unreachable"}
          helper={`Latest block ${status.latestBlock ?? "N/A"}`}
        />
        <KeyValue label="Chain" value={status.chainId ?? "Unknown"} helper="Local Hardhat context" />
        <KeyValue
          label="Revocation"
          value={revocationModeLabel(status.revocationMode)}
          helper={`Raw mode ${status.revocationMode ?? "N/A"}`}
        />
        <KeyValue
          label="Contracts"
          value={contractsReady ? "3/3 bound" : "Incomplete"}
          helper="Registry, revocation, access-control"
        />
      </div>
    </Panel>
  );
}
