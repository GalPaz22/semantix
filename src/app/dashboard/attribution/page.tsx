import { AttributionMoneyHero } from "@/components/dashboard/attribution-money-hero";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { Panel } from "@/components/dashboard/panel";
import { QueryAttributionTable } from "@/components/dashboard/query-attribution-table";
import { SourceBreakdownTable } from "@/components/dashboard/source-breakdown-table";
import { SourceTrendChart } from "@/components/dashboard/source-trend-chart";
import { SourceValueStrip } from "@/components/dashboard/source-value-strip";
import { parseFilters } from "@/lib/analytics/filters";
import { getAttributionView, getFilterOptions } from "@/lib/dashboard/service";

type AttributionPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AttributionPage({ searchParams }: AttributionPageProps) {
  const filters = parseFilters(searchParams);
  const [attribution, filterOptions] = await Promise.all([
    getAttributionView(filters),
    getFilterOptions(filters)
  ]);
  const shouldShowHealth =
    attribution.warnings.length > 0 ||
    attribution.errors.length > 0 ||
    attribution.dataFreshness.status === "aging" ||
    attribution.dataFreshness.status === "stale";

  return (
    <div className="grid gap-6">
      {shouldShowHealth ? (
        <HealthBanner
          freshness={attribution.dataFreshness}
          warnings={attribution.warnings}
          errors={attribution.errors}
        />
      ) : null}

      <AttributionMoneyHero
        filters={filters}
        searchCore={attribution.data.searchCore}
        breakdown={attribution.data.clickSourceBreakdown}
      />

      <FilterBar filters={filters} options={filterOptions.data} compact />

      <SourceValueStrip
        rows={attribution.data.clickSourceBreakdown}
        labels={attribution.data.sourceLabels}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          eyebrow="Recovered Demand"
          title="How matched value splits across sources"
        >
          <SourceBreakdownTable
            rows={attribution.data.clickSourceBreakdown}
            labels={attribution.data.sourceLabels}
          />
          <p className="mt-4 text-sm text-muted">
            Unattributed carts outside the strict match policy:{" "}
            <span className="font-semibold text-ink">
              {attribution.data.unattributedCartCount.toLocaleString("en-US")}
            </span>
          </p>
        </Panel>
        <Panel
          eyebrow="Trend"
          title="Source activity across the selected window"
        >
          <SourceTrendChart data={attribution.data.sourceTrend} />
        </Panel>
      </div>

      <Panel
        eyebrow="Query Attribution"
        title="Queries that generate matched cart value"
      >
        <QueryAttributionTable
          rows={attribution.data.queryAttribution}
          labels={attribution.data.sourceLabels}
        />
      </Panel>
    </div>
  );
}
