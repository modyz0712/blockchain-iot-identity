import { shortValue } from "../../lib/format";

type AddressTextProps = {
  value?: string | null;
  head?: number;
  tail?: number;
};

export function AddressText({ value, head = 8, tail = 6 }: AddressTextProps) {
  if (!value) {
    return <span className="muted">Unavailable</span>;
  }

  return (
    <code className="address" title={value}>
      {shortValue(value, head, tail)}
    </code>
  );
}
