import type { PropsWithChildren, ReactNode } from "react";

type PanelProps = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}>;

export function Panel({ title, description, action, className, children }: PanelProps) {
  return (
    <section className={className ? `panel ${className}` : "panel"}>
      <header className="section-head">
        <div className="section-copy">
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-description">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
