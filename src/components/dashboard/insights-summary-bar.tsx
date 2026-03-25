import type { InsightsSummary } from "@/lib/dashboard/types";

type InsightsSummaryBarProps = {
  summary: InsightsSummary;
};

export function InsightsSummaryBar({ summary }: InsightsSummaryBarProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr_1.2fr]">
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">קריטי</p>
        <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink">{summary.critical}</p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">אזהרות</p>
        <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink">{summary.warning}</p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">הזדמנות חזקה</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink">
          {summary.strongestWin ?? "לא זוהתה הזדמנות בולטת בטווח הזמן שנבחר."}
        </p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">הפער הגדול ביותר</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink">
          {summary.biggestGap ?? "לא זוהה פער משמעותי בטווח הזמן שנבחר."}
        </p>
      </article>
    </section>
  );
}
