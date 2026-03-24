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
            {Math.round(summary.boostCoverage * 100)}% of catalog boosted
          </span>
          {[1, 2, 3].map((level) => (
            <span
              key={level}
              className="rounded-full border border-[#e9ddff] bg-[#faf7ff] px-3 py-1 text-xs font-semibold text-[#6d28d9]"
            >
              Boost {level}: {summary.boostLevelCounts[level as 1 | 2 | 3]}
            </span>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            eyebrow="Boosted Products"
            value={summary.boostedProducts.toLocaleString("en-US")}
            description={`${Math.round(summary.boostCoverage * 100)}% of the catalog is currently boosted.`}
          />
          <MetricCard
            eyebrow="Boosted Clicks"
            value={summary.boostedClicks.toLocaleString("en-US")}
            description="Total search clicks captured by currently boosted products."
          />
          <MetricCard
            eyebrow="Boosted Carts"
            value={summary.boostedCarts.toLocaleString("en-US")}
            description="Add-to-cart events matched to products that are currently boosted."
          />
        </div>

        {!summary.topBoostedProducts.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-3 text-sm text-muted shadow-panel">
            No boosted products yet. Start by assigning a boost level in the catalog below.
          </div>
        ) : null}
      </div>

      {summary.topBoostedProducts.length ? (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Watchlist</p>
              <h3 className="mt-1 text-base font-bold tracking-[-0.03em] text-ink">Top boosted products</h3>
            </div>
            <p className="text-xs text-muted">
              {summary.avgClicksPerBoostedProduct.toFixed(summary.avgClicksPerBoostedProduct >= 10 ? 0 : 1)} avg clicks per boosted product
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
                    {product.price != null ? formatCurrency(product.price) : "No price"}
                    {product.carts ? ` · ${product.carts} carts` : ""}
                  </p>
                </div>
                <div className="text-xs font-semibold text-ink">{product.clicks.toLocaleString("en-US")} clicks</div>
                <div className="text-xs font-semibold text-ink">{product.carts.toLocaleString("en-US")} carts</div>
                <div className="justify-self-start rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-semibold text-[#7c3aed] md:justify-self-end">
                  Boost {product.boost}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
