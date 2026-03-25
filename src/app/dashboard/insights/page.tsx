import { FilterBar } from "@/components/dashboard/filter-bar";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { InsightsCommerceSnapshot } from "@/components/dashboard/insights-commerce-snapshot";
import { InsightsSummaryBar } from "@/components/dashboard/insights-summary-bar";
import { Panel } from "@/components/dashboard/panel";
import { QueryTermCloud } from "@/components/dashboard/query-term-cloud";
import { QueryTrendsTable } from "@/components/dashboard/query-trends-table";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { SearchInsightCardView } from "@/components/dashboard/search-insight-card";
import { parseFilters } from "@/lib/analytics/filters";
import { getFilterOptions, getProductsView, getQueriesView, getSemantixInsightsView } from "@/lib/dashboard/service";

type InsightsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const filters = parseFilters(searchParams);
  const allTimeFilters = {
    from: "2000-01-01",
    to: filters.to
  };
  const [insights, filterOptions, queries, allTimeQueries, allTimeProducts] = await Promise.all([
    getSemantixInsightsView(filters),
    getFilterOptions(filters),
    getQueriesView(filters),
    getQueriesView(allTimeFilters),
    getProductsView(allTimeFilters)
  ]);
  const shouldShowHealth =
    insights.warnings.length > 0 ||
    insights.errors.length > 0 ||
    insights.dataFreshness.status === "aging" ||
    insights.dataFreshness.status === "stale";
  const primaryGroups = insights.data.groupedInsightCards.filter((group) => group.id !== "low-conversion-queries");
  const lowConversionGroup = insights.data.groupedInsightCards.find((group) => group.id === "low-conversion-queries");

  return (
    <div className="grid gap-6">
      {shouldShowHealth ? (
        <HealthBanner
          freshness={insights.dataFreshness}
          warnings={insights.warnings}
          errors={insights.errors}
        />
      ) : null}

      <FilterBar filters={filters} options={filterOptions.data} compact />

      <InsightsSummaryBar summary={insights.data.summary} />

      <InsightsCommerceSnapshot
        topQueries={allTimeQueries.data.topQueries}
        mostClickedProducts={allTimeProducts.data.mostClickedProducts}
        highValueProducts={allTimeProducts.data.highValueProducts}
        topCartProducts={allTimeProducts.data.topCartProducts}
      />

      {primaryGroups.map((group) => (
        <Panel key={group.id} eyebrow="קבוצת תובנות" title={group.title}>
          <div className="grid gap-4 xl:grid-cols-2">
            {group.cards.map((insight) => (
              <SearchInsightCardView key={insight.id} insight={insight} />
            ))}
          </div>
        </Panel>
      ))}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel eyebrow="שאילתות מובילות" title="השאילתות הבולטות בטווח הזמן שנבחר">
          <QueryTrendsTable rows={queries.data.topQueries} />
        </Panel>
        <Panel eyebrow="מונחים פופולריים" title="שפה שכדאי לפעול עליה מסחרית">
          <QueryTermCloud terms={queries.data.popularTerms} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel eyebrow="שאילתות בלי תוצאות" title="ביקוש שלא מקבל מענה">
          <RankedBarChart
            data={queries.data.zeroResultQueries.map((query) => ({
              label: query.query,
              searches: query.searches
            }))}
            dataKey="searches"
            color="#f15757"
          />
        </Panel>
        <Panel eyebrow="שאילתות מתפתחות" title="מגמות חיפוש חדשות">
          <RankedBarChart
            data={queries.data.emergingQueries.map((query) => ({
              label: query.query,
              trendScore: query.trendScore ?? query.searches
            }))}
            dataKey="trendScore"
            color="#7b3ff2"
          />
        </Panel>
      </div>

      {lowConversionGroup ? (
        <Panel eyebrow="רשימת עבודה" title="שאילתות עם המרה נמוכה">
          <div className="grid gap-4 xl:grid-cols-2">
            {lowConversionGroup.cards.map((insight) => (
              <SearchInsightCardView key={insight.id} insight={insight} />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
