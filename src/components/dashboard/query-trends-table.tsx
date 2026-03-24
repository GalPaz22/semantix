import type { QueryTrend } from "@/lib/dashboard/types";

import { formatCompactCurrency } from "@/lib/dashboard/format";

export function QueryTrendsTable({ rows }: { rows: QueryTrend[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted">No query intelligence data is available.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">Query</th>
            <th className="pb-2">Searches</th>
            <th className="pb-2">Results</th>
            <th className="pb-2">Clicks</th>
            <th className="pb-2">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.query} className="rounded-2xl bg-[#fbf9ff] shadow-[0_8px_24px_rgba(84,55,167,0.05)]">
              <td className="rounded-l-2xl px-4 py-3 font-semibold text-ink">{row.query}</td>
              <td className="px-4 py-3 text-muted">{row.searches}</td>
              <td className="px-4 py-3 text-muted">{row.resultsCount}</td>
              <td className="px-4 py-3 text-muted">{row.clicks}</td>
              <td className="rounded-r-2xl px-4 py-3 font-semibold text-[#5d44ef]">{formatCompactCurrency(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
