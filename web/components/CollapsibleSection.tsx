"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`panel collapsible ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="collapsible-heading">
          <span className="collapsible-title">{title}</span>
          {description ? (
            <span className="collapsible-description">{description}</span>
          ) : null}
        </div>
        <div className="collapsible-meta">
          {badge ? <span className="pill pill-muted">{badge}</span> : null}
          <span className="collapsible-chevron" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </div>
      </button>
      {open ? <div className="collapsible-body">{children}</div> : null}
    </section>
  );
}
