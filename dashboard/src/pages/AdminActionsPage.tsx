import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { AdminActionWorkspace } from "../features/admin/AdminActionWorkspace";

export function AdminActionsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin Actions"
        title="Register | Grant | Verify | Revoke"
        description="Guided device administration through middleware, with contract transaction evidence returned after each operation."
        aside={<Badge tone="live">Middleware path</Badge>}
      />
      <AdminActionWorkspace />
    </div>
  );
}
