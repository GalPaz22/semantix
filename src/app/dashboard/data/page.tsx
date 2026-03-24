import { FilterBar } from "@/components/dashboard/filter-bar";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { Panel } from "@/components/dashboard/panel";
import { SourceHealthGrid } from "@/components/dashboard/source-health-grid";
import { parseFilters } from "@/lib/analytics/filters";
import { getDataHealthView, getFilterOptions } from "@/lib/dashboard/service";

type DataHealthPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function DataHealthPage({ searchParams }: DataHealthPageProps) {
  const filters = parseFilters(searchParams);
  const [health, filterOptions] = await Promise.all([
    getDataHealthView(filters),
    getFilterOptions(filters)
  ]);

  return (
    <div className="grid gap-6">
      <HealthBanner
        freshness={health.dataFreshness}
        warnings={health.warnings}
        errors={health.errors}
      />
      <FilterBar filters={filters} options={filterOptions.data} />
      <Panel
        eyebrow="Collection diagnostics"
        title="Data source health"
        description="Collection-level discovery used to identify timestamps, statuses, dimensions, and freshness signals."
      >
        <SourceHealthGrid collections={health.data.collections} />
      </Panel>
    </div>
  );
}
