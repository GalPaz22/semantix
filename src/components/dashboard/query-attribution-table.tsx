import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency, formatMetric } from "@/lib/dashboard/format";

type QueryAttributionTableProps = {
  rows: AttributionDashboardData["queryAttribution"];
  labels: AttributionDashboardData["sourceLabels"];
};

export function QueryAttributionTable({ rows, labels }: QueryAttributionTableProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted">No query attribution data is available.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">Query</th>
            <th className="pb-2">Attributed Value</th>
            <th className="pb-2">Matched Carts</th>
            <th className="pb-2">Clicks</th>
            <th className="pb-2">Top Source</th>
            <th className="pb-2">Source Share</th>
            <th className="pb-2">Cart Match Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.query} className="rounded-2xl bg-white shadow-[0_6px_18px_rgba(14,21,29,0.04)]">
              <td className="rounded-l-2xl px-4 py-3 font-semibold text-ink">{row.query}</td>
              <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(row.attributedValue)}</td>
              <td className="px-4 py-3 text-muted">{row.attributedAddToCarts.toLocaleString("en-US")}</td>
              <td className="px-4 py-3 text-muted">{row.clicks.toLocaleString("en-US")}</td>
              <td className="px-4 py-3 text-muted">{labels[row.topSource]}</td>
              <td className="px-4 py-3 text-muted">
                {formatMetric({ value: row.topSourceShare, format: "percent" })}
              </td>
              <td className="rounded-r-2xl px-4 py-3 font-semibold text-[#7c3aed]">
                {formatMetric({ value: row.cartMatchRate, format: "percent" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
