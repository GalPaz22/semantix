import type { BoostSummary } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";

function MetricCard({
  eyebrow,
  value,
  description
}: {
  eyebrow: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">{eyebrow}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-[-0.04em] text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </article>
  );
}

export function BoostSummaryPanel({ summary }: { summary: BoostSummary }) {
  return (
    <section className={`grid gap-4 ${summary.topBoostedProducts.length ? "xl:grid-cols-[1.7fr_1fr]" : ""}`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#e9ddff] bg-[#faf7ff] px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            {Math.round(summary.boostCoverage * 100)}% מהקטלוג עם בוסט
          </span>
          {[1, 2, 3].map((level) => (
            <span
              key={level}
              className="rounded-full border border-[#e9ddff] bg-[#faf7ff] px-3 py-1 text-xs font-semibold text-[#6d28d9]"
            >
              בוסט {level}: {summary.boostLevelCounts[level as 1 | 2 | 3]}
            </span>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            eyebrow="מוצרים עם בוסט"
            value={summary.boostedProducts.toLocaleString("he-IL")}
            description={`${Math.round(summary.boostCoverage * 100)}% מהקטלוג כרגע עם בוסט.`}
          />
          <MetricCard
            eyebrow="קליקים על מוצרים עם בוסט"
            value={summary.boostedClicks.toLocaleString("he-IL")}
            description="סך כל הקליקים ממנוע החיפוש על מוצרים שמוגדרים עם בוסט."
          />
          <MetricCard
            eyebrow="עגלות על מוצרים עם בוסט"
            value={summary.boostedCarts.toLocaleString("he-IL")}
            description="אירועי הוספה לעגלה שתואמו למוצרים שמוגדרים כרגע עם בוסט."
          />
        </div>

        {!summary.topBoostedProducts.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-3 text-sm text-muted shadow-panel">
            עדיין אין מוצרים עם בוסט. אפשר להתחיל בהגדרת רמת בוסט בקטלוג למטה.
          </div>
        ) : null}
      </div>

      {summary.topBoostedProducts.length ? (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">מעקב</p>
              <h3 className="mt-1 text-base font-bold tracking-[-0.03em] text-ink">המוצרים המובילים עם בוסט</h3>
            </div>
            <p className="text-xs text-muted">
              {summary.avgClicksPerBoostedProduct.toFixed(summary.avgClicksPerBoostedProduct >= 10 ? 0 : 1)} קליקים בממוצע לכל מוצר עם בוסט
            </p>
          </div>

          <div className="mt-3 grid gap-2">
            {summary.topBoostedProducts.map((product) => (
              <div
                key={product.id}
                className="grid gap-1 rounded-2xl border border-line bg-[#fcfbff] px-3 py-2.5 md:grid-cols-[1.2fr_auto_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{product.name}</p>
                  <p className="text-[11px] text-muted">
                    {product.price != null ? formatCurrency(product.price) : "אין מחיר"}
                    {product.carts ? ` · ${product.carts.toLocaleString("he-IL")} עגלות` : ""}
                  </p>
                </div>
                <div className="text-xs font-semibold text-ink">{product.clicks.toLocaleString("he-IL")} קליקים</div>
                <div className="text-xs font-semibold text-ink">{product.carts.toLocaleString("he-IL")} עגלות</div>
                <div className="justify-self-start rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-semibold text-[#7c3aed] md:justify-self-end">
                  בוסט {product.boost}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
