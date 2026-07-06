import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Panel";
import { ErrorCallout, EmptyState } from "../../components/ui/StateBlocks";
import { AddressText } from "../../components/ui/AddressText";
import {
  useGrantMutation,
  useRegisterMutation,
  useRevokeMutation,
  useVerifyMutation,
} from "../../lib/api/hooks";
import type { AdminResponse, ApiError } from "../../lib/api/types";
import { boolLabel, revocationModeLabel } from "../../lib/format";
import { useSessionHistory } from "../../lib/session/useSessionHistory";
import { adminSchema, type AdminFormValues } from "./schemas";

type ActionEvidence = {
  title: string;
  route: string;
  principal: string;
  requestId: string;
  primaryTxHash: string;
  secondaryTxHash?: string;
  blockNumber: string;
  gasUsed: string;
  status: string;
  details: string[];
};

const defaultValues: AdminFormValues = {
  principal: "",
  attributes: "7",
  target: "",
  requiredMask: "3",
  mode: "A",
  status: true,
};

const demoDefaults = {
  registerAttributes: "7",
  grantAttributes: "15",
  requiredMask: "3",
  mode: "B" as const,
};

function generateDemoAddress() {
  const bytes = new Uint8Array(20);
  globalThis.crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function toApiError(error: unknown) {
  return error as ApiError | null;
}

function makeEvidence(title: string, response: AdminResponse): ActionEvidence {
  if (response.route === "/verifyAccess") {
    return {
      title,
      route: response.route,
      principal: response.principal,
      requestId: response.requestId,
      primaryTxHash: response.txHash,
      blockNumber: response.blockNumber,
      gasUsed: response.gasUsed,
      status: response.granted ? "Granted" : "Denied",
      details: [
        `Target ${response.target}`,
        `Required mask ${response.requiredMask}`,
        `Revoked ${boolLabel(response.revoked)}`,
      ],
    };
  }

  if (response.route === "/revoke") {
    return {
      title,
      route: response.route,
      principal: response.principal,
      requestId: response.requestId,
      primaryTxHash: response.revokeTxHash,
      secondaryTxHash: response.setModeTxHash,
      blockNumber: response.blockNumber,
      gasUsed: response.gasUsed,
      status: `${revocationModeLabel(response.mode)} ${response.status ? "revoked" : "cleared"}`,
      details: [
        `Index used ${response.indexUsed ?? "not required"}`,
        `Mode ${response.mode}`,
        `Receipt ${boolLabel(response.receiptStatus)}`,
      ],
    };
  }

  return {
    title,
    route: response.route,
    principal: response.principal,
    requestId: response.requestId,
    primaryTxHash: response.txHash,
    blockNumber: response.blockNumber,
    gasUsed: response.gasUsed,
    status: "Confirmed",
    details: [
      response.route === "/register"
        ? `Initial bitmask ${response.attributes}`
        : `Updated bitmask ${response.attributes}`,
      `Receipt ${boolLabel(response.receiptStatus)}`,
    ],
  };
}

type ActionCardProps = {
  step: string;
  title: string;
  route: string;
  description: string;
  guidance: string;
  disabled: boolean;
  pendingLabel: string;
  buttonLabel: string;
  error: ApiError | null;
  onClick: () => void;
};

function ActionCard({
  step,
  title,
  route,
  description,
  guidance,
  disabled,
  pendingLabel,
  buttonLabel,
  error,
  onClick,
}: ActionCardProps) {
  return (
    <div className="card action-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">{step}</span>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <Badge tone="info">{route}</Badge>
      </div>
      <span className="action-guidance">{guidance}</span>
      {error ? (
        <ErrorCallout title={`${title} failed`} message={error.message} requestId={error.requestId} />
      ) : null}
      <button className="button" type="button" disabled={disabled} onClick={onClick}>
        {disabled ? pendingLabel : buttonLabel}
      </button>
    </div>
  );
}

function EvidenceDock({ evidence }: { evidence: ActionEvidence | null }) {
  return (
    <Panel
      title="Action evidence"
      description="Most recent confirmed middleware operation in this browser session."
      className="evidence-dock"
    >
      {!evidence ? (
        <EmptyState
          title="No action submitted yet"
          message="Run register, grant, verify, or revoke to pin the latest transaction evidence here."
        />
      ) : (
        <div className="flow-list">
          <div className="split-row">
            <Badge tone={evidence.status === "Denied" ? "warning" : "success"}>{evidence.status}</Badge>
            <code>{evidence.route}</code>
          </div>
          <div className="key-grid">
            <div>
              <span className="eyebrow">Request</span>
              <p>{evidence.requestId}</p>
            </div>
            <div>
              <span className="eyebrow">Block</span>
              <p>{evidence.blockNumber}</p>
            </div>
            <div>
              <span className="eyebrow">Gas</span>
              <p>{evidence.gasUsed}</p>
            </div>
          </div>
          <div>
            <span className="eyebrow">Principal</span>
            <AddressText value={evidence.principal} />
          </div>
          <div>
            <span className="eyebrow">Primary transaction</span>
            <AddressText value={evidence.primaryTxHash} />
          </div>
          {evidence.secondaryTxHash ? (
            <div>
              <span className="eyebrow">Mode-change transaction</span>
              <AddressText value={evidence.secondaryTxHash} />
            </div>
          ) : null}
          {evidence.details.map((detail) => (
            <span className="muted" key={detail}>
              {detail}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function LocalSessionTrail() {
  const { entries, clear } = useSessionHistory();

  return (
    <Panel
      title="Local session trail"
      description="Browser-session convenience history. Backend telemetry remains the authoritative evidence feed."
      action={
        entries.length ? (
          <button className="button button-secondary" type="button" onClick={clear}>
            Clear
          </button>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          title="No local session actions"
          message="Successful actions made in this tab will appear here."
        />
      ) : (
        <div className="session-list">
          {entries.map((entry) => (
            <article className="session-row" key={entry.id}>
              <span>
                <strong>{entry.action}</strong>
                <br />
                <span className="muted">
                  {entry.route} | Block {entry.blockNumber} | Gas {entry.gasUsed}
                </span>
              </span>
              <Badge tone={entry.status === "Denied" ? "warning" : "success"}>{entry.status}</Badge>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function AdminActionWorkspace() {
  const [evidence, setEvidence] = useState<ActionEvidence | null>(null);
  const { record } = useSessionHistory();
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues,
  });

  const registerMutation = useRegisterMutation();
  const grantMutation = useGrantMutation();
  const verifyMutation = useVerifyMutation();
  const revokeMutation = useRevokeMutation();

  function generatePrincipal() {
    form.setValue("principal", generateDemoAddress(), { shouldDirty: true, shouldValidate: true });
  }

  function fillDemoFlow() {
    const currentPrincipal = form.getValues("principal").trim();
    form.setValue("principal", currentPrincipal || generateDemoAddress(), { shouldDirty: true, shouldValidate: true });
    form.setValue("attributes", demoDefaults.registerAttributes, { shouldDirty: true, shouldValidate: true });
    form.setValue("target", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("requiredMask", demoDefaults.requiredMask, { shouldDirty: true, shouldValidate: true });
    form.setValue("mode", demoDefaults.mode, { shouldDirty: true, shouldValidate: true });
    form.setValue("status", true, { shouldDirty: true, shouldValidate: true });
  }

  async function recordEvidence(title: string, response: AdminResponse) {
    const nextEvidence = makeEvidence(title, response);
    setEvidence(nextEvidence);
    record({
      action: title,
      route: response.route,
      principal: response.principal,
      requestId: response.requestId,
      txHash: nextEvidence.primaryTxHash,
      blockNumber: response.blockNumber,
      gasUsed: response.gasUsed,
      status: nextEvidence.status,
    });
  }

  async function runRegister() {
    const valid = await form.trigger(["principal", "attributes"]);
    if (!valid) return;

    const values = form.getValues();
    const response = await registerMutation.mutateAsync({
      principal: values.principal,
      attributes: values.attributes,
    });
    await recordEvidence("Register device", response);
    form.setValue("attributes", demoDefaults.grantAttributes, { shouldDirty: true, shouldValidate: true });
  }

  async function runGrant() {
    const valid = await form.trigger(["principal", "attributes"]);
    if (!valid) return;

    const values = form.getValues();
    const response = await grantMutation.mutateAsync({
      principal: values.principal,
      attributes: values.attributes,
    });
    await recordEvidence("Grant attributes", response);
  }

  async function runVerify() {
    const valid = await form.trigger(["principal", "target", "requiredMask"]);
    if (!valid) return;

    const values = form.getValues();
    const response = await verifyMutation.mutateAsync({
      principal: values.principal,
      target: values.target || values.principal,
      requiredMask: values.requiredMask,
    });
    await recordEvidence("Verify access", response);
  }

  async function runRevoke() {
    const valid = await form.trigger(["principal", "mode", "status"]);
    if (!valid) return;

    const values = form.getValues();
    const response = await revokeMutation.mutateAsync({
      principal: values.principal,
      mode: values.mode,
      status: values.status,
    });
    await recordEvidence("Revoke device", response);
  }

  const errors = form.formState.errors;

  return (
    <>
      <section className="panel form-grid" aria-label="Operator context">
        <header className="section-head">
          <div className="section-copy">
            <h2 className="section-title">Operator context</h2>
            <p className="section-description">
              Generate one device EOA, then run the four administration steps through middleware.
            </p>
          </div>
          <div className="action-bar">
            <button className="button button-secondary" type="button" onClick={generatePrincipal}>
              Generate Device EOA
            </button>
            <button className="button" type="button" onClick={fillDemoFlow}>
              Fill Flow Values
            </button>
          </div>
        </header>
        <div className="grid two">
          <div className="form-row">
            <label htmlFor="principal">Device EOA</label>
            <input id="principal" placeholder="0x..." {...form.register("principal")} />
            {errors.principal ? <span className="field-error">{errors.principal.message}</span> : null}
          </div>
          <div className="form-row">
            <label htmlFor="attributes">Bitmask attributes</label>
            <input id="attributes" inputMode="numeric" {...form.register("attributes")} />
            <span className="field-hint">Use 7 for register, then 15 for grant.</span>
            {errors.attributes ? <span className="field-error">{errors.attributes.message}</span> : null}
          </div>
          <div className="form-row">
            <label htmlFor="target">Target EOA</label>
            <input id="target" placeholder="Leave blank to use device EOA" {...form.register("target")} />
            {errors.target ? <span className="field-error">{errors.target.message}</span> : null}
          </div>
          <div className="form-row">
            <label htmlFor="requiredMask">Required access mask</label>
            <input id="requiredMask" inputMode="numeric" {...form.register("requiredMask")} />
            {errors.requiredMask ? (
              <span className="field-error">{errors.requiredMask.message}</span>
            ) : null}
          </div>
          <div className="form-row">
            <label htmlFor="mode">Revocation strategy</label>
            <select id="mode" {...form.register("mode")}>
              <option value="A">Strategy A - Sparse Mapping</option>
              <option value="B">Strategy B - Sequential BitMap</option>
            </select>
          </div>
          <div className="checkbox-row">
            <span>Revocation status</span>
            <label className="checkbox-control" htmlFor="status">
              <input id="status" type="checkbox" {...form.register("status")} />
              Checked means the principal is revoked.
            </label>
          </div>
        </div>
      </section>

      <div className="grid two">
        <div className="grid">
          <ActionCard
            step="Step 1"
            title="Register device"
            route="POST /register"
            description="Create a registry entry for the smart-home device EOA."
            guidance="Use bitmask 7 for the initial registration."
            disabled={registerMutation.isPending}
            pendingLabel="Registering..."
            buttonLabel="Register device"
            error={toApiError(registerMutation.error)}
            onClick={() => void runRegister()}
          />
          <ActionCard
            step="Step 2"
            title="Grant attributes"
            route="POST /grant"
            description="Update the integer bitmask used by the ABAC check."
            guidance="Use bitmask 15 after Step 1 to show permission expansion."
            disabled={grantMutation.isPending}
            pendingLabel="Granting..."
            buttonLabel="Grant attributes"
            error={toApiError(grantMutation.error)}
            onClick={() => void runGrant()}
          />
          <ActionCard
            step="Step 3"
            title="Verify access"
            route="POST /verifyAccess"
            description="Run the contract-backed verification path through middleware."
            guidance="Required mask 3 should pass after the grant step unless the device is revoked."
            disabled={verifyMutation.isPending}
            pendingLabel="Verifying..."
            buttonLabel="Verify access"
            error={toApiError(verifyMutation.error)}
            onClick={() => void runVerify()}
          />
          <ActionCard
            step="Step 4"
            title="Revoke device"
            route="POST /revoke"
            description="Apply Strategy A or Strategy B revocation state for the principal."
            guidance="Use Strategy B and checked status for the clean presentation revoke."
            disabled={revokeMutation.isPending}
            pendingLabel="Revoking..."
            buttonLabel="Apply revocation"
            error={toApiError(revokeMutation.error)}
            onClick={() => void runRevoke()}
          />
        </div>
        <div className="grid">
          <EvidenceDock evidence={evidence} />
          <LocalSessionTrail />
        </div>
      </div>
    </>
  );
}
