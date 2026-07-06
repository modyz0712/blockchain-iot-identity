import { Panel } from "../../components/ui/Panel";

const steps = [
  {
    title: "1. Status",
    copy: "Confirm middleware, local EVM, revocation mode, and contracts.",
  },
  {
    title: "2. Register + grant",
    copy: "Create the device entry, then expand its ABAC bitmask.",
  },
  {
    title: "3. Verify + revoke",
    copy: "Run access verification, then apply Strategy A or B revocation.",
  },
  {
    title: "4. Evidence",
    copy: "Inspect request logs, receipts, and decoded contract events.",
  },
];

export function WorkflowStory() {
  return (
    <Panel
      title="Operator flow"
      description="The console sends actions to middleware while contracts remain the authorization authority."
    >
      <div className="flow-list">
        {steps.map((step) => (
          <article className="flow-step" key={step.title}>
            <strong>{step.title}</strong>
            <span className="muted">{step.copy}</span>
          </article>
        ))}
      </div>
    </Panel>
  );
}
