import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

export function NotFoundPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Not Found"
        title="This dashboard page does not exist"
        description="The console has four supported pages: Overview, Admin Actions, On-Chain Monitor, and Benchmarks."
      />
      <Panel title="Return to the supported console">
        <Link className="button" to="/overview">
          Go to overview
        </Link>
      </Panel>
    </div>
  );
}
