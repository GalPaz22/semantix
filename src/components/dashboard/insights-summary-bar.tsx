import type { InsightsSummary } from "@/lib/dashboard/types";

type InsightsSummaryBarProps = {
  summary: InsightsSummary;
};

export function InsightsSummaryBar({ summary }: InsightsSummaryBarProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr_1.2fr]">
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Critical</p>
        <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink">{summary.critical}</p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Warnings</p>
        <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink">{summary.warning}</p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Strongest Win</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink">
          {summary.strongestWin ?? "No win highlighted in the selected range."}
        </p>
      </article>
      <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Biggest Gap</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink">
          {summary.biggestGap ?? "No major gap detected in the selected range."}
        </p>
      </article>
    </section>
  );
}
