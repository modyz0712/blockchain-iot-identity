import { AddressText } from "../../components/ui/AddressText";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { Panel } from "../../components/ui/Panel";
import { ErrorCallout, LoadingState } from "../../components/ui/StateBlocks";
import { useEventsQuery, useRequestsQuery, useTransactionsQuery } from "../../lib/api/hooks";
import type { ApiError, ContractEvent, RequestLog, TransactionLog } from "../../lib/api/types";
import { shortValue } from "../../lib/format";

function QueryState({ loading, error }: { loading: boolean; error: ApiError | null }) {
  if (loading) {
    return <LoadingState message="Reading middleware evidence." />;
  }

  if (error) {
    return <ErrorCallout title="Evidence feed unavailable" message={error.message} requestId={error.requestId} />;
  }

  return null;
}

export function RequestLogTable() {
  const query = useRequestsQuery();
  const error = query.error as ApiError | null;

  return (
    <Panel title="Request telemetry" description="Recent client/admin requests captured by middleware.">
      {query.isLoading || error ? (
        <QueryState loading={query.isLoading} error={error} />
      ) : (
        <DataTable<RequestLog>
          columns={["Route", "Principal", "Request ID", "Time"]}
          rows={query.data?.requests ?? []}
          emptyTitle="No request telemetry"
          emptyMessage="Submit an admin action or simulator request to populate this feed."
          renderRow={(row) => (
            <tr key={row.requestId}>
              <td>{row.route}</td>
              <td>
                <AddressText value={row.principal} />
              </td>
              <td>
                <code>{shortValue(row.requestId, 8, 6)}</code>
              </td>
              <td>{row.timestamp}</td>
            </tr>
          )}
        />
      )}
    </Panel>
  );
}

export function TransactionLogTable() {
  const query = useTransactionsQuery();
  const error = query.error as ApiError | null;

  return (
    <Panel title="Transaction telemetry" description="Contract submissions and receipts recorded by middleware.">
      {query.isLoading || error ? (
        <QueryState loading={query.isLoading} error={error} />
      ) : (
        <DataTable<TransactionLog>
          columns={["Method", "Transaction", "Block", "Gas", "Status"]}
          rows={query.data?.transactions ?? []}
          emptyTitle="No transaction telemetry"
          emptyMessage="Confirmed admin operations will appear here with receipt evidence."
          renderRow={(row) => (
            <tr key={row.txHash}>
              <td>{row.method}</td>
              <td>
                <AddressText value={row.txHash} />
              </td>
              <td>{row.receipt?.blockNumber ?? "Pending"}</td>
              <td>{row.receipt?.gasUsed ?? "N/A"}</td>
              <td>
                <Badge tone={row.receipt?.status ? "success" : "warning"}>
                  {row.receipt ? (row.receipt.status ? "Confirmed" : "Failed") : "Pending"}
                </Badge>
              </td>
            </tr>
          )}
        />
      )}
    </Panel>
  );
}

function eventSummary(event: ContractEvent) {
  if (event.granted !== undefined) {
    return `granted=${String(event.granted)} revoked=${String(event.revoked)}`;
  }

  if (event.status !== undefined) {
    return `status=${String(event.status)}`;
  }

  if (event.attributes) {
    return `attributes=${event.attributes}`;
  }

  if (event.mode) {
    return `mode=${event.mode}`;
  }

  return "decoded";
}

export function EventFeedTable() {
  const query = useEventsQuery();
  const error = query.error as ApiError | null;

  return (
    <Panel title="Decoded contract events" description="Recent events parsed from registry, revocation, and access-control receipts.">
      {query.isLoading || error ? (
        <QueryState loading={query.isLoading} error={error} />
      ) : (
        <DataTable<ContractEvent>
          columns={["Event", "Contract", "Principal / Index", "Summary", "Transaction"]}
          rows={query.data?.events ?? []}
          emptyTitle="No decoded events"
          emptyMessage="Events appear after middleware receives contract receipts."
          renderRow={(row, index) => (
            <tr key={`${row.txHash}-${row.event}-${index}`}>
              <td>{row.event}</td>
              <td>{row.contract}</td>
              <td>{row.principal ?? row.requester ?? row.index ?? "N/A"}</td>
              <td>{eventSummary(row)}</td>
              <td>
                <AddressText value={row.txHash} />
              </td>
            </tr>
          )}
        />
      )}
    </Panel>
  );
}
