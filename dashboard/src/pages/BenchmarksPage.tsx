import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import {
  BenchmarkMetricPanel,
  BenchmarkReadinessPanel,
  BenchmarkScopePanel,
} from "../features/benchmarks/BenchmarkPanels";

export function BenchmarksPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Benchmarks"
        title="Benchmark Readiness"
        description="Defines the planned metrics and strategy comparison boundary without showing unsupported gas, latency, throughput, or run-history values."
        aside={<Badge tone="warning">Readiness only</Badge>}
      />
      <BenchmarkScopePanel />
      <BenchmarkMetricPanel />
      <BenchmarkReadinessPanel />
    </div>
  );
}
