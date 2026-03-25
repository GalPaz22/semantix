import Link from "next/link";
import type { Route } from "next";

import { BoostFilterBar } from "@/components/dashboard/boost-filter-bar";
import { BoostSummaryPanel } from "@/components/dashboard/boost-summary-panel";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { Panel } from "@/components/dashboard/panel";
import { ProductCatalogTable } from "@/components/dashboard/product-catalog-table";
import { listBoostProducts, parseBoostFilters } from "@/lib/boost/service";

type BoostPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function buildPageHref(searchParams: BoostPageProps["searchParams"], page: number): Route {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }

    params.set(key, value);
  }

  params.set("page", String(page));
  return `/dashboard/boost?${params.toString()}` as Route;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  for (const value of [...pages]) {
    if (value < 1 || value > totalPages) {
      pages.delete(value);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

export default async function BoostPage({ searchParams }: BoostPageProps) {
  const filters = parseBoostFilters(searchParams);
  const boostView = await listBoostProducts(filters);
  const shouldShowHealth = boostView.warnings.length > 0 || boostView.errors.length > 0;

  return (
    <div className="grid gap-4">
      {shouldShowHealth ? (
        <HealthBanner
          freshness={{ status: "unknown" }}
          warnings={boostView.warnings}
          errors={boostView.errors}
        />
      ) : null}

      <BoostFilterBar
        filters={boostView.data.filtersApplied}
        categories={boostView.data.categories}
        totalProducts={boostView.data.pagination.totalItems}
      />

      <BoostSummaryPanel summary={boostView.data.summary} />

      <Panel eyebrow="קטלוג" title="כל המוצרים" className="p-4 md:p-5">
        <ProductCatalogTable rows={boostView.data.products} editable />

        {boostView.data.pagination.totalPages > 1 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted">
              עמוד <span className="font-semibold text-ink">{boostView.data.pagination.page}</span> מתוך{" "}
              <span className="font-semibold text-ink">{boostView.data.pagination.totalPages}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {boostView.data.pagination.page > 1 ? (
                <Link
                  href={buildPageHref(searchParams, boostView.data.pagination.page - 1)}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#faf7ff]"
                >
                  הקודם
                </Link>
              ) : null}
              {getVisiblePages(boostView.data.pagination.page, boostView.data.pagination.totalPages).map((page) => (
                <Link
                  key={page}
                  href={buildPageHref(searchParams, page)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                    page === boostView.data.pagination.page
                      ? "bg-[#7c3aed] text-white"
                      : "border border-line text-ink hover:bg-[#faf7ff]"
                  }`}
                >
                  {page}
                </Link>
              ))}
              {boostView.data.pagination.page < boostView.data.pagination.totalPages ? (
                <Link
                  href={buildPageHref(searchParams, boostView.data.pagination.page + 1)}
                  className="rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
                >
                  הבא
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
