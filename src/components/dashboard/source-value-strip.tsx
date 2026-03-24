import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";

const SEMANTIX_SOURCES = ["zero-results", "rerank", "inject"] as const;

const sourceTone = {
  "zero-results": "bg-orange-100 text-orange-700",
  rerank: "bg-violet-100 text-violet-700",
  inject: "bg-emerald-100 text-emerald-700"
} as const;

type SourceValueStripProps = {
  rows: AttributionDashboardData["clickSourceBreakdown"];
  labels: AttributionDashboardData["sourceLabels"];
};

export function SourceValueStrip({ rows, labels }: SourceValueStripProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SEMANTIX_SOURCES.map((source) => {
        const row = rows.find((entry) => entry.source === source);

        return (
          <article key={source} className="rounded-2xl border border-line/80 bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceTone[source]}`}>
                {labels[source]}
              </span>
              <span className="text-xs text-muted">{(row?.clicks ?? 0).toLocaleString("en-US")} clicks</span>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-[-0.04em] text-ink">
              {formatCurrency(row?.attributedValue ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {(row?.attributedCarts ?? 0).toLocaleString("en-US")} matched carts
            </p>
          </article>
        );
      })}
    </div>
  );
}
