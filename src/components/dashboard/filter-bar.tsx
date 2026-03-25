import type { DashboardFilters, FilterOptionsData } from "@/lib/dashboard/types";

type FilterBarProps = {
  filters: DashboardFilters;
  options: FilterOptionsData;
  compact?: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink [color-scheme:light]";

function SelectField({
  name,
  label,
  value,
  options
}: {
  name: keyof DashboardFilters;
  label: string;
  value?: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-2 text-sm text-muted">
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className={fieldClass}
      >
        <option value="">הכול</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ filters, options, compact = false }: FilterBarProps) {
  return (
    <form className={compact ? "grid gap-4 rounded-2xl border border-line bg-[#fcfbff] p-4" : "rounded-panel border border-line bg-white p-5"}>
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between ${compact ? "" : "mb-5"}`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c3aed]">סינונים</p>
          {compact ? (
            null
          ) : (
            <>
              <h2 className="mt-2 font-display text-xl font-bold tracking-[-0.03em] text-ink">מיקוד הדאשבורד</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                צמצום התצוגה לפי תאריכים וממדים עסקיים.
              </p>
            </>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#7c3aed] px-5 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
        >
          החל סינון
        </button>
      </div>
      <div className={`grid gap-4 md:grid-cols-2 ${compact ? "xl:grid-cols-4 mt-1" : "xl:grid-cols-7"}`}>
        <label className="grid gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">מתאריך</span>
          <input type="date" name="from" defaultValue={filters.from} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">עד תאריך</span>
          <input type="date" name="to" defaultValue={filters.to} className={fieldClass} />
        </label>
        {compact ? (
          <>
            <SelectField name="channel" label="מקור" value={filters.channel} options={options.channels} />
            <SelectField name="product" label="מוצר" value={filters.product} options={options.products} />
          </>
        ) : (
          <>
            <SelectField name="region" label="אזור" value={filters.region} options={options.regions} />
            <SelectField name="status" label="סטטוס" value={filters.status} options={options.statuses} />
            <SelectField name="channel" label="ערוץ" value={filters.channel} options={options.channels} />
            <SelectField name="product" label="מוצר" value={filters.product} options={options.products} />
            <label className="grid gap-2 text-sm text-muted">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">צוות</span>
              <select name="team" defaultValue={filters.team ?? ""} className={fieldClass}>
                <option value="">הכול</option>
                {options.teams.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
    </form>
  );
}
