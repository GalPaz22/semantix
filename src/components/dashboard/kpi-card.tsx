import type { KpiCard as KpiCardType } from "@/lib/dashboard/types";

import { formatDelta, formatMetric } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils/cn";

const toneStyles = {
  default: "border-line bg-white",
  success: "border-[#cfeedd] bg-white",
  warning: "border-[#f1e1b6] bg-white",
  danger: "border-[#f0cbcb] bg-white"
};

export function KpiCard({ card }: { card: KpiCardType }) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-0.5",
        toneStyles[card.tone ?? "default"]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[13rem] text-[11px] font-semibold uppercase leading-5 tracking-[0.2em] text-[#6b7280]">
          {card.label}
        </p>
        <span className="rounded-full border border-[#e9d5ff] bg-[#faf5ff] px-2.5 py-1 text-[11px] font-medium text-[#7c3aed]">
          Now
        </span>
      </div>
      <p className="mt-4 font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.05em] text-ink">
        {formatMetric(card.metric)}
      </p>
      <p className="mt-3 min-h-[2.5rem] text-sm leading-6 text-muted">{card.description}</p>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4 text-sm">
        <span className="font-semibold text-ink">{formatDelta(card.metric.delta)}</span>
        <span className="text-right text-muted">{card.metric.deltaLabel ?? "Current period"}</span>
      </div>
    </article>
  );
}
