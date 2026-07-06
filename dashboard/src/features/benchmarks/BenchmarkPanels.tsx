import { Badge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Panel";

const metrics = [
  ["Gas", "EVM execution cost per operation"],
  ["ToL", "Transaction-oriented latency from submission to receipt"],
  ["BoL", "Block-oriented latency from submission to block confirmation"],
  ["Throughput", "Confirmed transactions per second under load"],
];

const missingEndpoints = [
  "POST /benchmarks/run",
  "GET /benchmarks/runs",
  "GET /benchmarks/runs/:id",
];

export function BenchmarkScopePanel() {
  return (
    <Panel
      title="Benchmark scope"
      description="Defines the planned strategy comparison without claiming results the backend cannot provide yet."
    >
      <div className="grid two">
        <div className="card">
          <Badge tone="info">Strategy A</Badge>
          <h3>Sparse Mapping</h3>
          <p className="muted">Address-keyed boolean revocation state. Expected to remain simple at minimal load.</p>
        </div>
        <div className="card">
          <Badge tone="info">Strategy B</Badge>
          <h3>Sequential BitMap</h3>
          <p className="muted">Packed index-keyed revocation state. Expected to become more storage-efficient at scale.</p>
        </div>
      </div>
    </Panel>
  );
}

export function BenchmarkMetricPanel() {
  return (
    <Panel title="Locked metrics and load tiers" description="Definitions only. No result values are shown until backend APIs exist.">
      <div className="grid four">
        {metrics.map(([label, description]) => (
          <div className="card" key={label}>
            <strong>{label}</strong>
            <span className="muted">{description}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <strong>Load tiers</strong>
        <span className="muted">Simulator-driven batches: 1, 10, 100, and 1,000 concurrent requests.</span>
      </div>
    </Panel>
  );
}

export function BenchmarkReadinessPanel() {
  return (
    <Panel
      title="Backend readiness"
      description="Benchmark orchestration stays disabled until these middleware routes exist."
      action={<Badge tone="warning">Pending backend APIs</Badge>}
    >
      <div className="route-list">
        {missingEndpoints.map((endpoint) => (
          <article className="route-row" key={endpoint}>
            <code>{endpoint}</code>
            <Badge tone="warning">Missing</Badge>
          </article>
        ))}
      </div>
      <p className="muted">
        The simulator remains the benchmark workload source. This console should only display benchmark runs after
        middleware exposes truthful job and result data.
      </p>
    </Panel>
  );
}
