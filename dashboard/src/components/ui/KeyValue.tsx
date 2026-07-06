import type { ReactNode } from "react";

type KeyValueProps = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
};

export function KeyValue({ label, value, helper }: KeyValueProps) {
  return (
    <div className="status-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {helper ? <span className="muted">{helper}</span> : null}
    </div>
  );
}
