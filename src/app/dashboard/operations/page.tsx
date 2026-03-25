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
        <Panel eyebrow="בק-לוג" title={operations.data.backlogCount.toString()}>
          <p className="text-sm text-muted">
            רשומות פתוחות שעדיין לא סומנו כסגורות או הושלמו בתוך הדאטה המסונן.
          </p>
        </Panel>
        <Panel eyebrow="שיעור חריגות" title={`${(operations.data.exceptionRate * 100).toFixed(1)}%`}>
          <p className="text-sm text-muted">
            שיעור הרשומות שסומנו כנכשלות, חסומות, מבוטלות או חריגות.
          </p>
        </Panel>
        <Panel eyebrow="פיזור סטטוסים" title={`${operations.data.statusBreakdown.length} סטטוסים פעילים`}>
          <p className="text-sm text-muted">
            הסטטוסים הנפוצים ביותר בכל הקולקציות המוגדרות בתצוגה הנוכחית.
          </p>
        </Panel>
      </div>
      <Panel
        eyebrow="תמהיל סטטוסים"
        title="התפלגות המצב התפעולי"
        description="מבט מהיר על הסטטוסים או שלבי העבודה הנפוצים ביותר שעולים מהרשומות שלך."
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
        eyebrow="רשומות אחרונות"
        title="פירוט תפעולי"
        description="הרשומות המנורמלות האחרונות ביותר בתוך תחום הסינון הנוכחי."
      >
        <DataTable records={operations.data.records} />
      </Panel>
    </div>
  );
}
