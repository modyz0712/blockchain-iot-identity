import type { ReactNode } from "react";

export type BadgeTone = "live" | "success" | "warning" | "danger" | "info" | "idle";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export function Badge({ children, tone = "info" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
