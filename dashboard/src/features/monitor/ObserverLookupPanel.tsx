import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../../components/ui/Badge";
import { KeyValue } from "../../components/ui/KeyValue";
import { Panel } from "../../components/ui/Panel";
import { ErrorCallout, EmptyState, LoadingState } from "../../components/ui/StateBlocks";
import { AddressText } from "../../components/ui/AddressText";
import { useObserverDeviceQuery } from "../../lib/api/hooks";
import type { ApiError } from "../../lib/api/types";
import { boolLabel, revocationModeLabel } from "../../lib/format";
import { useSessionHistory } from "../../lib/session/useSessionHistory";

const lookupSchema = z.object({
  principal: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Ethereum EOA address."),
});

type LookupValues = z.infer<typeof lookupSchema>;

export function ObserverLookupPanel() {
  const [principal, setPrincipal] = useState("");
  const { entries } = useSessionHistory();
  const latestPrincipal = entries.find((entry) => entry.principal)?.principal ?? "";
  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { principal: "" },
  });
  const query = useObserverDeviceQuery(principal, principal.length > 0);
  const device = query.data;
  const error = query.error as ApiError | null;

  const submit = form.handleSubmit((values) => {
    setPrincipal(values.principal.trim());
  });

  function useLatestPrincipal() {
    form.setValue("principal", latestPrincipal, { shouldDirty: true, shouldValidate: true });
    setPrincipal(latestPrincipal);
  }

  return (
    <Panel
      title="Observer device lookup"
      description="Read device state from GET /observer/device/:principal through middleware."
      action={
        latestPrincipal ? (
          <button className="button button-secondary" type="button" onClick={useLatestPrincipal}>
            Use latest principal
          </button>
        ) : null
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="form-row">
          <label htmlFor="observer-principal">Principal</label>
          <input id="observer-principal" placeholder="0x..." {...form.register("principal")} />
          {form.formState.errors.principal ? (
            <span className="field-error">{form.formState.errors.principal.message}</span>
          ) : null}
        </div>
        <button className="button" type="submit" disabled={query.isFetching}>
          {query.isFetching ? "Reading state..." : "Read device state"}
        </button>
      </form>

      {query.isFetching ? <LoadingState message="Reading observer state from middleware." /> : null}
      {error ? (
        <ErrorCallout title="Observer lookup failed" message={error.message} requestId={error.requestId} />
      ) : null}
      {!principal && !device ? (
        <EmptyState
          title="No principal selected"
          message="Enter a registered or candidate device EOA to inspect on-chain state."
        />
      ) : null}
      {device && !device.registered ? (
        <div className="card">
          <div className="split-row">
            <Badge tone="warning">Not registered</Badge>
            <AddressText value={device.principal} />
          </div>
          <span className="muted">{device.error}</span>
          <span className="muted">Current revocation mode: {revocationModeLabel(device.revocationMode)}</span>
        </div>
      ) : null}
      {device?.registered ? (
        <div className="key-grid">
          <KeyValue label="Registered" value="Yes" helper={<AddressText value={device.principal} />} />
          <KeyValue label="Attributes" value={device.attributes} helper="Integer bitmask" />
          <KeyValue label="Device index" value={device.index} helper="Used by Strategy B" />
          <KeyValue label="Revocation mode" value={revocationModeLabel(device.revocationMode)} />
          <KeyValue label="Revoked" value={boolLabel(device.revoked)} />
        </div>
      ) : null}
    </Panel>
  );
}
