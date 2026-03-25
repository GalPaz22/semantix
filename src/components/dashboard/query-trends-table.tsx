import type { QueryTrend } from "@/lib/dashboard/types";

import { formatCompactCurrency } from "@/lib/dashboard/format";

export function QueryTrendsTable({ rows }: { rows: QueryTrend[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted">אין כרגע נתוני מודיעין לשאילתות.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-right text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">שאילתה</th>
            <th className="pb-2">חיפושים</th>
            <th className="pb-2">תוצאות</th>
            <th className="pb-2">קליקים</th>
            <th className="pb-2">הכנסות</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.query} className="rounded-2xl bg-[#fbf9ff] shadow-[0_8px_24px_rgba(84,55,167,0.05)]">
              <td className="rounded-r-2xl px-4 py-3 font-semibold text-ink">{row.query}</td>
              <td className="px-4 py-3 text-muted">{row.searches.toLocaleString("he-IL")}</td>
              <td className="px-4 py-3 text-muted">{row.resultsCount.toLocaleString("he-IL")}</td>
              <td className="px-4 py-3 text-muted">{row.clicks.toLocaleString("he-IL")}</td>
              <td className="rounded-l-2xl px-4 py-3 font-semibold text-[#5d44ef]">{formatCompactCurrency(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
