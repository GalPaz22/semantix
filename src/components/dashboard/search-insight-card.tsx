import type { SearchInsightCard } from "@/lib/dashboard/types";

import { cn } from "@/lib/utils/cn";

const styles = {
  info: "border-[#ddd2ff] bg-[#faf7ff]",
  warning: "border-[#f3e2b6] bg-[#fffaf2]",
  critical: "border-[#f5caca] bg-[#fff6f6]"
};

const severityLabels = {
  info: "מידע",
  warning: "אזהרה",
  critical: "קריטי"
} as const;

export function SearchInsightCardView({ insight }: { insight: SearchInsightCard }) {
  return (
    <article className={cn("rounded-panel border p-5 shadow-panel", styles[insight.severity])}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b63c8]">
          {severityLabels[insight.severity]}
        </span>
        <span className="text-sm font-semibold text-[#6b628d]">{insight.impactMetric}</span>
      </div>
      <h3 className="mt-3 text-lg font-bold tracking-[-0.03em] text-ink">{insight.title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-ink">{insight.text}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{insight.explanation}</p>
      {insight.contextLabel ? (
        <div className="mt-3">
          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f4cff]">
            {insight.contextLabel}
          </span>
        </div>
      ) : null}
      <button className="mt-5 inline-flex items-center rounded-2xl bg-[#6f4cff] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5e3ef0]">
        {insight.actionLabel}
      </button>
    </article>
  );
}
