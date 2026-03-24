import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PanelProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function Panel({ title, eyebrow, description, className, children }: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line/80 bg-white p-6 shadow-panel",
        className
      )}
    >
      {(eyebrow || title || description) && (
        <header className="mb-5 border-b border-line/70 pb-4">
          {eyebrow ? (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
              {eyebrow}
            </p>
          ) : null}
          {title ? <h2 className="font-display text-[1.35rem] font-bold tracking-[-0.03em] text-ink">{title}</h2> : null}
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
