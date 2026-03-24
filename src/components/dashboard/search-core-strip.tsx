"use client";

import type { OverviewSearchCore } from "@/lib/dashboard/types";

import { formatCompactNumber, formatMetric } from "@/lib/dashboard/format";

const metrics = (searchCore: OverviewSearchCore) => [
  {
    id: "total-queries",
    label: "Total Queries",
    value: formatCompactNumber(searchCore.totalQueries),
    description: "Search requests captured in the selected range."
  },
  {
    id: "total-clicks",
    label: "Total Product Clicks",
    value: formatCompactNumber(searchCore.totalProductClicks),
    description: "Clicks on search-driven product results."
  },
  {
    id: "attributed-carts",
    label: "Attributed Add to Carts",
    value: formatCompactNumber(searchCore.attributedAddToCarts),
    description: "Cart events matched to an earlier search click."
  },
  {
    id: "cart-match-rate",
    label: "Cart Match Rate",
    value: formatMetric({ value: searchCore.cartMatchRate, format: "percent" }),
    description: "Share of cart events that could be attributed to a prior click."
  }
];

export function SearchCoreStrip({ searchCore }: { searchCore: OverviewSearchCore }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics(searchCore).map((metric) => (
        <article key={metric.id} className="rounded-2xl border border-line bg-white p-5 shadow-panel">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">{metric.label}</p>
          <p className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-ink">{metric.value}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{metric.description}</p>
        </article>
      ))}
    </div>
  );
}
