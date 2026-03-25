import type { OperationalRecord } from "@/lib/dashboard/types";

import { formatCompactCurrency, formatDate } from "@/lib/dashboard/format";

export function DataTable({ records }: { records: OperationalRecord[] }) {
  if (!records.length) {
    return <p className="text-sm text-muted">לא נמצאו רשומות תפעוליות שתואמות לסינון שנבחר.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-right text-sm">
        <thead className="text-xs uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="pb-2">זמן</th>
            <th className="pb-2">קולקציה</th>
            <th className="pb-2">סיכום</th>
            <th className="pb-2">סטטוס</th>
            <th className="pb-2">לקוח</th>
            <th className="pb-2">שווי</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="rounded-2xl bg-white/82 text-ink shadow-[0_6px_18px_rgba(14,21,29,0.04)]">
              <td className="rounded-r-2xl px-4 py-3">{formatDate(record.timestamp)}</td>
              <td className="px-4 py-3">{record.collection}</td>
              <td className="px-4 py-3">{record.summary}</td>
              <td className="px-4 py-3">{record.status ?? "לא ידוע"}</td>
              <td className="px-4 py-3">{record.customer ?? "לא ידוע"}</td>
              <td className="rounded-l-2xl px-4 py-3">
                {record.revenue != null ? formatCompactCurrency(record.revenue) : "לא זמין"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
