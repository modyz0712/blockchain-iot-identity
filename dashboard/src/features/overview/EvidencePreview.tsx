import { AddressText } from "../../components/ui/AddressText";
import { EmptyState } from "../../components/ui/StateBlocks";
import { Panel } from "../../components/ui/Panel";
import { shortValue } from "../../lib/format";
import type { ContractEvent, TransactionLog } from "../../lib/api/types";

type EvidencePreviewProps = {
  transactions: TransactionLog[];
  events: ContractEvent[];
};

export function EvidencePreview({ transactions, events }: EvidencePreviewProps) {
  const latestTransactions = transactions.slice(0, 3);
  const latestEvents = events.slice(0, 3);

  return (
    <Panel
      title="Recent backend evidence"
      description="A short preview from GET /telemetry/transactions and GET /events."
    >
      <div className="grid two">
        <div className="card compact-evidence-card">
          <strong>Transactions</strong>
          {latestTransactions.length === 0 ? (
            <EmptyState
              title="No transaction telemetry"
              message="Run an admin action to populate middleware transaction evidence."
            />
          ) : (
            latestTransactions.map((transaction) => (
              <div className="session-row compact-row" key={transaction.txHash}>
                <span>
                  <strong>{transaction.method}</strong>
                  <br />
                  <span className="muted">
                    Block {transaction.receipt?.blockNumber ?? "pending"} | Gas{" "}
                    {transaction.receipt?.gasUsed ?? "N/A"}
                  </span>
                </span>
                <AddressText value={transaction.txHash} head={6} tail={4} />
              </div>
            ))
          )}
        </div>
        <div className="card compact-evidence-card">
          <strong>Events</strong>
          {latestEvents.length === 0 ? (
            <EmptyState
              title="No decoded events"
              message="Confirmed contract events will appear here after middleware receipts are logged."
            />
          ) : (
            latestEvents.map((event, index) => (
              <div className="session-row compact-row" key={`${event.txHash}-${event.event}-${index}`}>
                <span>
                  <strong>{event.event}</strong>
                  <br />
                  <span className="muted">{event.contract}</span>
                </span>
                <code>{shortValue(event.txHash)}</code>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
