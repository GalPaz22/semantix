import type { CustomersSummary } from "@/lib/dashboard/types";

import { formatCompactCurrency } from "@/lib/dashboard/format";

function SummaryMetric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-ink">{value}</p>
    </article>
  );
}

export function CustomersSummaryStrip({ summary }: { summary: CustomersSummary }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="סך כל הפרופילים" value={summary.totalProfiles.toLocaleString("he-IL")} />
      <SummaryMetric label="פעילים עכשיו" value={summary.activeNow.toLocaleString("he-IL")} />
      <SummaryMetric label="פרופילים עם עגלות" value={summary.profilesWithCarts.toLocaleString("he-IL")} />
      <SummaryMetric label="שווי מיוחס" value={formatCompactCurrency(summary.attributedValue)} />
    </section>
  );
}
