import type { AttributionDashboardData } from "@/lib/dashboard/types";

import { formatCurrency, formatMetric } from "@/lib/dashboard/format";

type QueryAttributionTableProps = {
  rows: AttributionDashboardData["queryAttribution"];
  labels: AttributionDashboardData["sourceLabels"];
};

export function QueryAttributionTable({ rows, labels }: QueryAttributionTableProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted">אין נתוני אטריביושן זמינים לשאילתות.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-right text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">שאילתה</th>
            <th className="pb-2">שווי מיוחס</th>
            <th className="pb-2">עגלות תואמות</th>
            <th className="pb-2">קליקים</th>
            <th className="pb-2">מקור מוביל</th>
            <th className="pb-2">נתח מקור</th>
            <th className="pb-2">שיעור התאמת עגלה</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.query} className="rounded-2xl bg-white shadow-[0_6px_18px_rgba(14,21,29,0.04)]">
              <td className="rounded-r-2xl px-4 py-3 font-semibold text-ink">{row.query}</td>
              <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(row.attributedValue)}</td>
              <td className="px-4 py-3 text-muted">{row.attributedAddToCarts.toLocaleString("he-IL")}</td>
              <td className="px-4 py-3 text-muted">{row.clicks.toLocaleString("he-IL")}</td>
              <td className="px-4 py-3 text-muted">{labels[row.topSource]}</td>
              <td className="px-4 py-3 text-muted">
                {formatMetric({ value: row.topSourceShare, format: "percent" })}
              </td>
              <td className="rounded-l-2xl px-4 py-3 font-semibold text-[#7c3aed]">
                {formatMetric({ value: row.cartMatchRate, format: "percent" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
