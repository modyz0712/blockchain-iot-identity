import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorCallout, LoadingState } from "../components/ui/StateBlocks";
import { ContractBindingsPanel } from "../features/overview/ContractBindingsPanel";
import { EvidencePreview } from "../features/overview/EvidencePreview";
import { StatusStrip } from "../features/overview/StatusStrip";
import { SupportedRoutesBoard } from "../features/overview/SupportedRoutesBoard";
import { WorkflowStory } from "../features/overview/WorkflowStory";
import { useEventsQuery, useStatusQuery, useTransactionsQuery } from "../lib/api/hooks";
import type { ApiError } from "../lib/api/types";

export function OverviewPage() {
  const statusQuery = useStatusQuery();
  const transactionsQuery = useTransactionsQuery();
  const eventsQuery = useEventsQuery();
  const status = statusQuery.data;
  const statusError = statusQuery.error as unknown as ApiError | null;
  const ready = Boolean(status?.middlewareRunning && status.evmReachable);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Overview"
        title="Blockchain-Based IoT Identity Management"
        description="A middleware-backed operator console for smart-home device registration, access control, revocation, and on-chain evidence."
        aside={<Badge tone={ready ? "live" : "warning"}>{ready ? "System live" : "Needs backend"}</Badge>}
      />

      {statusQuery.isLoading ? <LoadingState message="Checking middleware status." /> : null}
      {statusQuery.error ? (
        <ErrorCallout
          title="Status endpoint unavailable"
          message={statusError?.message ?? "Unable to read middleware status."}
          requestId={statusError?.requestId}
        />
      ) : null}

      <StatusStrip status={status} />
      <div className="grid two">
        <WorkflowStory />
        <ContractBindingsPanel status={status} />
      </div>
      <EvidencePreview
        transactions={transactionsQuery.data?.transactions ?? []}
        events={eventsQuery.data?.events ?? []}
      />
      <SupportedRoutesBoard />
    </div>
  );
}
