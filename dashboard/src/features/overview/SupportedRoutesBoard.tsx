import { Badge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Panel";

const routes = [
  ["GET /status", "Runtime, chain, mode, and contract binding status"],
  ["POST /register", "Register a device EOA with initial bitmask attributes"],
  ["POST /grant", "Update bitmask attributes for a registered principal"],
  ["POST /verifyAccess", "Run the contract-backed ABAC verification path"],
  ["POST /revoke", "Set revocation mode and update Strategy A or B state"],
  ["GET /observer/device/:principal", "Read current on-chain device state through middleware"],
  ["GET /telemetry/requests", "Read recent middleware request logs"],
  ["GET /telemetry/transactions", "Read recent contract submission and receipt logs"],
  ["GET /events", "Read decoded contract events captured by middleware"],
];

export function SupportedRoutesBoard() {
  return (
    <Panel
      title="Live backend surface"
      description="The UI only presents capabilities backed by these existing middleware routes."
    >
      <div className="route-list">
        {routes.map(([route, description]) => (
          <article className="route-row" key={route}>
            <span>
              <code>{route}</code>
              <br />
              <span className="muted">{description}</span>
            </span>
            <Badge tone="success">Live</Badge>
          </article>
        ))}
      </div>
    </Panel>
  );
}
