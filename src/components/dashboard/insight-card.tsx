import type { Insight } from "@/lib/dashboard/types";

import { cn } from "@/lib/utils/cn";

const severityStyles = {
  info: "border-[#dfd4ff] bg-[#fbf9ff]",
  warning: "border-[#f4dfae] bg-[#fffaf0]",
  critical: "border-[#f3d0d0] bg-[#fff7f7]"
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className={cn("rounded-panel border p-5 shadow-panel", severityStyles[insight.severity])}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-ink">
          {insight.title}
        </h3>
        <span className="rounded-full border border-[#e7dcff] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7b63c8]">
          {insight.severity}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{insight.explanation}</p>
      <div className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
        <p>
          <span className="text-muted">Metric:</span> {insight.impactedMetric}
        </p>
        <p>
          <span className="text-muted">Window:</span> {insight.comparisonWindow}
        </p>
      </div>
      <p className="mt-4 border-t border-line/70 pt-4 text-sm font-medium text-ink">
        {insight.recommendation}
      </p>
    </article>
  );
}
