import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { ObserverLookupPanel } from "../features/monitor/ObserverLookupPanel";
import { EventFeedTable, RequestLogTable, TransactionLogTable } from "../features/monitor/TelemetryTables";

export function OnChainMonitorPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="On-Chain Monitor"
        title="Middleware-backed observer evidence"
        description="Inspect device state, recent requests, transaction receipts, and decoded contract events without turning the browser into the blockchain client."
        aside={<Badge tone="info">Observer only</Badge>}
      />
      <ObserverLookupPanel />
      <RequestLogTable />
      <TransactionLogTable />
      <EventFeedTable />
    </div>
  );
}
