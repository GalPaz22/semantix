import type { ReactNode } from "react";

import type { ProductSearchPerformance, QueryTrend, SearchInsightCard } from "@/lib/dashboard/types";

import { formatCompactCurrency } from "@/lib/dashboard/format";

type OverviewSnapshotProps = {
  insights: SearchInsightCard[];
  queries: QueryTrend[];
  products: ProductSearchPerformance[];
};

function SnapshotList({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function OverviewSnapshot({ insights, queries, products }: OverviewSnapshotProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SnapshotList title="תקציר תובנות">
        <div className="grid gap-3">
          {insights.slice(0, 2).map((insight) => (
            <article key={insight.id} className="rounded-2xl bg-[#faf7ff] px-4 py-3">
              <p className="text-sm font-medium leading-6 text-ink">{insight.text}</p>
            </article>
          ))}
        </div>
      </SnapshotList>

      <SnapshotList title="השאילתות המובילות">
        <div className="grid gap-3">
          {queries.slice(0, 5).map((query) => (
            <div key={query.query} className="flex items-center justify-between gap-4 rounded-2xl bg-[#faf7ff] px-4 py-3">
              <div>
                <p className="font-semibold text-ink">{query.query}</p>
                <p className="text-sm text-muted">{query.clicks.toLocaleString("he-IL")} קליקים</p>
              </div>
              <span className="text-sm font-semibold text-[#5d44ef]">{query.searches.toLocaleString("he-IL")} חיפושים</span>
            </div>
          ))}
        </div>
      </SnapshotList>

      <SnapshotList title="המוצרים המובילים">
        <div className="grid gap-3">
          {products.slice(0, 5).map((product) => (
            <div
              key={product.product}
              className="flex items-center justify-between gap-4 rounded-2xl bg-[#faf7ff] px-4 py-3"
            >
              <div>
                <p className="font-semibold text-ink">{product.product}</p>
                <p className="text-sm text-muted">{product.clicks.toLocaleString("he-IL")} קליקים · {product.addToCart.toLocaleString("he-IL")} עגלות</p>
              </div>
              <span className="text-sm font-semibold text-[#5d44ef]">{formatCompactCurrency(product.revenue)}</span>
            </div>
          ))}
        </div>
      </SnapshotList>
    </div>
  );
}
