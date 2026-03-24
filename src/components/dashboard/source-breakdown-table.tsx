import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency, formatMetric } from "@/lib/dashboard/format";

type SourceBreakdownTableProps = {
  rows: AttributionDashboardData["clickSourceBreakdown"];
  labels: AttributionDashboardData["sourceLabels"];
};

export function SourceBreakdownTable({ rows, labels }: SourceBreakdownTableProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted">No source breakdown data is available.</p>;
  }

  const orderedRows = [...rows].sort((a, b) => {
    const order = ["zero-results", "rerank", "inject", "native", "ai", "unknown"];
    return order.indexOf(a.source) - order.indexOf(b.source);
  });

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">Source</th>
            <th className="pb-2">Attributed Value</th>
            <th className="pb-2">Clicks</th>
            <th className="pb-2">Click Share</th>
            <th className="pb-2">Attributed Carts</th>
            <th className="pb-2">Cart Conversion</th>
          </tr>
        </thead>
        <tbody>
          {orderedRows.map((row) => (
            <tr key={row.source} className="rounded-2xl bg-white shadow-[0_6px_18px_rgba(14,21,29,0.04)]">
              <td className="rounded-l-2xl px-4 py-3 font-semibold text-ink">{labels[row.source]}</td>
              <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(row.attributedValue)}</td>
              <td className="px-4 py-3 text-muted">{row.clicks.toLocaleString("en-US")}</td>
              <td className="px-4 py-3 text-muted">{formatMetric({ value: row.clickShare, format: "percent" })}</td>
              <td className="px-4 py-3 text-muted">{row.attributedCarts.toLocaleString("en-US")}</td>
              <td className="rounded-r-2xl px-4 py-3 font-semibold text-[#7c3aed]">
                {formatMetric({ value: row.cartConversionFromClicks, format: "percent" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
