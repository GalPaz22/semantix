import { FilterBar } from "@/components/dashboard/filter-bar";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { OverviewAttributionMix } from "@/components/dashboard/overview-attribution-mix";
import { OverviewQueryList } from "@/components/dashboard/overview-query-list";
import { OverviewSnapshot } from "@/components/dashboard/overview-snapshot";
import { Panel } from "@/components/dashboard/panel";
import { SemantixAttributionHeader } from "@/components/dashboard/semantix-attribution-header";
import { parseFilters } from "@/lib/analytics/filters";
import { getFilterOptions, getSemantixOverview } from "@/lib/dashboard/service";
import Link from "next/link";
import type { Route } from "next";

type DashboardPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

const LOGS_PER_PAGE = 50;

function buildPageHref(searchParams: DashboardPageProps["searchParams"], page: number): Route {
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
  return `/dashboard?${params.toString()}` as Route;
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const listFilters = parseFilters(searchParams);
  const currentPage = Math.max(
    1,
    Number.parseInt(Array.isArray(searchParams.page) ? searchParams.page[0] ?? "1" : searchParams.page ?? "1", 10) || 1
  );
  const summaryFilters = {
    from: listFilters.from,
    to: listFilters.to
  };
  const [summaryOverview, listOverview, filterOptions] = await Promise.all([
    getSemantixOverview(summaryFilters),
    getSemantixOverview(listFilters),
    getFilterOptions(listFilters)
  ]);
  const shouldShowHealth =
    listOverview.warnings.length > 0 ||
    listOverview.errors.length > 0 ||
    listOverview.dataFreshness.status === "aging" ||
    listOverview.dataFreshness.status === "stale";
  const totalLogs = listOverview.data.attribution.overviewQueryList.length;
  const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = listOverview.data.attribution.overviewQueryList.slice(
    (safePage - 1) * LOGS_PER_PAGE,
    safePage * LOGS_PER_PAGE
  );

  return (
    <div className="grid gap-6">
      {shouldShowHealth ? (
        <HealthBanner
          freshness={listOverview.dataFreshness}
          warnings={listOverview.warnings}
          errors={listOverview.errors}
        />
      ) : null}

      <SemantixAttributionHeader
        filters={summaryFilters}
        searchCore={summaryOverview.data.attribution.searchCore}
        breakdown={summaryOverview.data.attribution.clickSourceBreakdown}
        attributedValueEvents={summaryOverview.data.attribution.attributedValueEvents}
        labels={summaryOverview.data.attribution.sourceLabels}
      />

      <OverviewSnapshot
        insights={summaryOverview.data.insights}
        queries={summaryOverview.data.queries}
        products={summaryOverview.data.products}
      />

      <OverviewAttributionMix
        rows={summaryOverview.data.attribution.clickSourceBreakdown}
        labels={summaryOverview.data.attribution.sourceLabels}
      />

      <Panel
        eyebrow="יומן חיפוש"
        title={`לוג שאילתות חיפוש (${totalLogs.toLocaleString("he-IL")})`}
      >
        <div className="mb-5">
          <FilterBar filters={listFilters} options={filterOptions.data} compact />
        </div>
        <OverviewQueryList rows={paginatedRows} labels={listOverview.data.attribution.sourceLabels} />
        {totalPages > 1 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted">
              עמוד <span className="font-semibold text-ink">{safePage}</span> מתוך{" "}
              <span className="font-semibold text-ink">{totalPages}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {safePage > 1 ? (
                <Link
                  href={buildPageHref(searchParams, safePage - 1)}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#faf7ff]"
                >
                  הקודם
                </Link>
              ) : null}
              {getVisiblePages(safePage, totalPages).map((page) => (
                <Link
                  key={page}
                  href={buildPageHref(searchParams, page)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                    page === safePage
                      ? "bg-[#7c3aed] text-white"
                      : "border border-line text-ink hover:bg-[#faf7ff]"
                  }`}
                >
                  {page}
                </Link>
              ))}
              {safePage < totalPages ? (
                <Link
                  href={buildPageHref(searchParams, safePage + 1)}
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
