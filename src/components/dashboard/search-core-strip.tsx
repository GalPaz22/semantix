"use client";

import type { OverviewSearchCore } from "@/lib/dashboard/types";

import { formatCompactNumber, formatMetric } from "@/lib/dashboard/format";

const metrics = (searchCore: OverviewSearchCore) => [
  {
    id: "total-queries",
    label: "סך כל השאילתות",
    value: formatCompactNumber(searchCore.totalQueries),
    description: "בקשות חיפוש שנקלטו בטווח הזמן שנבחר."
  },
  {
    id: "total-clicks",
    label: "סך כל הקליקים על מוצרים",
    value: formatCompactNumber(searchCore.totalProductClicks),
    description: "קליקים על תוצאות מוצרים שהגיעו מחיפוש."
  },
  {
    id: "attributed-carts",
    label: "הוספות לעגלה מיוחסות",
    value: formatCompactNumber(searchCore.attributedAddToCarts),
    description: "אירועי עגלה שתואמו לקליק חיפוש מוקדם יותר."
  },
  {
    id: "cart-match-rate",
    label: "שיעור התאמת עגלה",
    value: formatMetric({ value: searchCore.cartMatchRate, format: "percent" }),
    description: "שיעור אירועי העגלה שניתן לייחס לקליק קודם."
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
