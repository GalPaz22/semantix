import type { ReactNode } from "react";

import type { ProductSearchPerformance, QueryTrend } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";

function SnapshotColumn({
  eyebrow,
  title,
  items
}: {
  eyebrow: string;
  title: string;
  items: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-bold tracking-[-0.03em] text-ink">{title}</h3>
      <div className="mt-4 grid gap-3">{items}</div>
    </section>
  );
}

export function InsightsCommerceSnapshot({
  topQueries,
  mostClickedProducts,
  highValueProducts,
  topCartProducts
}: {
  topQueries: QueryTrend[];
  mostClickedProducts: ProductSearchPerformance[];
  highValueProducts: ProductSearchPerformance[];
  topCartProducts: ProductSearchPerformance[];
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-4 xl:grid-cols-2">
      <SnapshotColumn
        eyebrow="Search Demand"
        title="Most searched terms"
        items={topQueries.slice(0, 5).map((query) => (
          <article
            key={query.query}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl bg-[#faf7ff] px-4 py-3"
          >
            <div className="min-w-0">
              <p dir="auto" className="truncate font-semibold text-ink">{query.query}</p>
              <p className="text-sm text-muted">{query.clicks.toLocaleString("en-US")} clicks</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#5d44ef]">
              {query.searches.toLocaleString("en-US")} searches
            </span>
          </article>
        ))}
      />

      <SnapshotColumn
        eyebrow="Discovery Leaders"
        title="Most clicked products"
        items={mostClickedProducts.slice(0, 5).map((product) => (
          <article
            key={product.product}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl bg-[#faf7ff] px-4 py-3"
          >
            <div className="min-w-0">
              <p dir="auto" className="truncate font-semibold text-ink">{product.product}</p>
              <p className="text-sm text-muted">
                {product.addToCart.toLocaleString("en-US")} carts · {formatCurrency(product.revenue)} value
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#5d44ef]">
              {product.clicks.toLocaleString("en-US")} clicks
            </span>
          </article>
        ))}
      />

      <SnapshotColumn
        eyebrow="Revenue Leaders"
        title="High-value products"
        items={highValueProducts.slice(0, 5).map((product) => (
          <article
            key={product.product}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl bg-[#faf7ff] px-4 py-3"
          >
            <div className="min-w-0">
              <p dir="auto" className="truncate font-semibold text-ink">{product.product}</p>
              <p className="text-sm text-muted">
                {product.addToCart.toLocaleString("en-US")} carts · {product.clicks.toLocaleString("en-US")} clicks
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#5d44ef]">
              {formatCurrency(product.revenue)}
            </span>
          </article>
        ))}
      />

      <SnapshotColumn
        eyebrow="Best Sellers"
        title="Most added to cart"
        items={topCartProducts.slice(0, 5).map((product) => (
          <article
            key={product.product}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-2xl bg-[#faf7ff] px-4 py-3"
          >
            <div className="min-w-0">
              <p dir="auto" className="truncate font-semibold text-ink">{product.product}</p>
              <p className="text-sm text-muted">{formatCurrency(product.revenue)} value</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#5d44ef]">
              {product.addToCart.toLocaleString("en-US")} carts
            </span>
          </article>
        ))}
      />
    </div>
  );
}
