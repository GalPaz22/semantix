import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";
import { Panel } from "@/components/dashboard/panel";

const SEMANTIX_SOURCES = ["zero-results", "rerank", "inject"] as const;

const sourceTone = {
  "zero-results": "bg-orange-100 text-orange-700",
  rerank: "bg-violet-100 text-violet-700",
  inject: "bg-emerald-100 text-emerald-700"
} as const;

type OverviewAttributionMixProps = {
  rows: AttributionDashboardData["clickSourceBreakdown"];
  labels: AttributionDashboardData["sourceLabels"];
};

export function OverviewAttributionMix({ rows, labels }: OverviewAttributionMixProps) {
  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">Attribution Mix</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-ink">Zero Results, ReRank, Inject</h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {SEMANTIX_SOURCES.map((source) => {
          const row = rows.find((entry) => entry.source === source);

          return (
            <article
              key={source}
              className="rounded-2xl border border-line/80 bg-[#faf8ff] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceTone[source]}`}>
                  {labels[source]}
                </span>
                <span className="text-xs font-medium text-muted">
                  {(row?.clicks ?? 0).toLocaleString("en-US")} clicks
                </span>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xl font-bold tracking-[-0.03em] text-ink">
                  {formatCurrency(row?.attributedValue ?? 0)}
                </p>
                <p className="text-xs text-muted">
                  {(row?.attributedCarts ?? 0).toLocaleString("en-US")} carts
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
