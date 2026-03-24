import { DataTable } from "@/components/dashboard/data-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { Panel } from "@/components/dashboard/panel";
import { parseFilters } from "@/lib/analytics/filters";
import { getFilterOptions, getOperationsView } from "@/lib/dashboard/service";

type OperationsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const filters = parseFilters(searchParams);
  const [operations, filterOptions] = await Promise.all([
    getOperationsView(filters),
    getFilterOptions(filters)
  ]);

  return (
    <div className="grid gap-6">
      <HealthBanner
        freshness={operations.dataFreshness}
        warnings={operations.warnings}
        errors={operations.errors}
      />
      <FilterBar filters={filters} options={filterOptions.data} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel eyebrow="Backlog" title={operations.data.backlogCount.toString()}>
          <p className="text-sm text-muted">
            Open records not yet marked closed or complete across the filtered dataset.
          </p>
        </Panel>
        <Panel eyebrow="Exception rate" title={`${(operations.data.exceptionRate * 100).toFixed(1)}%`}>
          <p className="text-sm text-muted">
            Share of records tagged as failed, blocked, cancelled, or exceptional.
          </p>
        </Panel>
        <Panel eyebrow="Status spread" title={`${operations.data.statusBreakdown.length} active states`}>
          <p className="text-sm text-muted">
            Top detected statuses across configured collections in the current view.
          </p>
        </Panel>
      </div>
      <Panel
        eyebrow="Status mix"
        title="Operational state distribution"
        description="A quick cut of the most common statuses or workflow stages surfaced from your records."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {operations.data.statusBreakdown.map((status) => (
            <div key={status.label} className="rounded-2xl border border-line/70 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{status.label}</p>
              <p className="mt-3 font-display text-3xl text-ink">{status.value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        eyebrow="Recent records"
        title="Operational detail"
        description="Most recent normalized records in the current filter scope."
      >
        <DataTable records={operations.data.records} />
      </Panel>
    </div>
  );
}
