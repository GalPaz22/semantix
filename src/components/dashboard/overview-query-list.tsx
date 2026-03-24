import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency, formatDate } from "@/lib/dashboard/format";

const sourceStyles = {
  native: "bg-slate-100 text-slate-700",
  "zero-results": "bg-orange-100 text-orange-700",
  inject: "bg-emerald-100 text-emerald-700",
  rerank: "bg-violet-100 text-violet-700",
  ai: "bg-blue-100 text-blue-700",
  unknown: "bg-gray-100 text-gray-600"
} as const;

const rowStyles = {
  native: "bg-white",
  "zero-results": "bg-orange-50/70",
  inject: "bg-emerald-50/60",
  rerank: "bg-violet-50/60",
  ai: "bg-blue-50/60",
  unknown: "bg-white"
} as const;

type OverviewQueryListProps = {
  rows: AttributionDashboardData["overviewQueryList"];
  labels: AttributionDashboardData["sourceLabels"];
};

function ClickIcon() {
  return (
    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 3.8v9.7l2.7-2 2.2 4.2 2-1-2.2-4.2 3.3-.5L5 3.8Z" />
        <path d="m13.6 3.8.5-1.8" />
        <path d="m15.8 5.3 1.6-1" />
        <path d="m16.4 8 1.9.1" />
      </svg>
    </span>
  );
}

function CartIcon() {
  return (
    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M3.5 4.5h2l1.2 6.2h7.5l1.5-4.7H7.2" />
        <circle cx="8.5" cy="14.6" r="1.1" />
        <circle cx="13.7" cy="14.6" r="1.1" />
      </svg>
    </span>
  );
}

function StatusCell({
  items,
  active,
  kind
}: {
  items?: Array<{ product?: string; price?: number }>;
  active: boolean;
  kind: "click" | "cart";
}) {
  if (!active) {
    return <span className="text-sm font-medium text-slate-300">-</span>;
  }

  const visibleItems = items?.length ? items : [{ product: "Matched" }];

  return (
    <div className="flex items-start gap-2.5">
      {kind === "click" ? <ClickIcon /> : <CartIcon />}
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={`${item.product ?? "matched"}-${item.price ?? "na"}-${index}`}>
            <p className="text-sm font-medium text-ink">{item.product ?? "Matched"}</p>
            {item.price != null ? <p className="mt-0.5 text-xs text-muted">{formatCurrency(item.price)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewQueryList({ rows, labels }: OverviewQueryListProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted">No query rows are available for the selected filters.</p>;
  }

  return (
    <div className="overflow-auto">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        {(["zero-results", "inject", "rerank"] as const).map((source) => (
          <span key={source} className={`rounded-full px-3 py-1.5 ${sourceStyles[source]}`}>
            {labels[source]}
          </span>
        ))}
      </div>
      <table className="min-w-full border-separate border-spacing-y-2.5 text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">Query</th>
            <th className="pb-2">Timestamp</th>
            <th className="pb-2">Source</th>
            <th className="pb-2">Click</th>
            <th className="pb-2">Add to Cart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={`rounded-l-2xl border border-r-0 border-line px-4 py-4 font-semibold text-ink ${rowStyles[row.source]}`}>
                <div className="max-w-[18rem] truncate">{row.query}</div>
              </td>
              <td className={`border-y border-line px-4 py-4 text-muted ${rowStyles[row.source]}`}>
                {formatDate(row.timestamp)}
              </td>
              <td className={`border-y border-line px-4 py-4 ${rowStyles[row.source]}`}>
                <div className="flex flex-wrap gap-2">
                  {(row.sources?.length ? row.sources : [row.source]).map((source) => (
                    <span key={source} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sourceStyles[source]}`}>
                      {labels[source]}
                    </span>
                  ))}
                </div>
              </td>
              <td className={`border-y border-line px-4 py-4 ${rowStyles[row.source]}`}>
                <StatusCell items={row.clickItems} active={row.hasClick} kind="click" />
              </td>
              <td className={`rounded-r-2xl border border-l-0 border-line px-4 py-4 ${rowStyles[row.source]}`}>
                <StatusCell items={row.addToCartItems} active={row.hasAddToCart} kind="cart" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
