import type { BoostFilters, DimensionOption } from "@/lib/dashboard/types";

type BoostFilterBarProps = {
  filters: BoostFilters;
  categories: DimensionOption[];
  totalProducts?: number;
};

const fieldClass =
  "min-w-0 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink [color-scheme:light]";

const sortOptions = [
  { value: "boost-high", label: "Highest boost" },
  { value: "clicks", label: "Most clicked" },
  { value: "carts", label: "Most carts" },
  { value: "price-high", label: "Highest price" },
  { value: "price-low", label: "Lowest price" },
  { value: "name", label: "Name" }
] as const;

export function BoostFilterBar({ filters, categories, totalProducts = 0 }: BoostFilterBarProps) {
  return (
    <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c3aed]">Products</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-ink">Manage catalog boosts</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#faf7ff] px-3 py-1.5 text-xs font-semibold text-[#5b21b6]">
            {totalProducts.toLocaleString("en-US")} products
          </span>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`?${new URLSearchParams({
            ...(filters.query ? { query: filters.query } : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.sort ? { sort: filters.sort } : {}),
            boostState: "all"
          }).toString()}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            (filters.boostState ?? "all") === "all" ? "bg-[#ede9fe] text-[#5b21b6]" : "bg-[#f8fafc] text-[#64748b]"
          }`}
        >
          All products
        </a>
        <a
          href={`?${new URLSearchParams({
            ...(filters.query ? { query: filters.query } : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.sort ? { sort: filters.sort } : {}),
            boostState: "boosted"
          }).toString()}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            filters.boostState === "boosted" ? "bg-[#ede9fe] text-[#5b21b6]" : "bg-[#f8fafc] text-[#64748b]"
          }`}
        >
          Boosted only
        </a>
        <a
          href={`?${new URLSearchParams({
            ...(filters.query ? { query: filters.query } : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.sort ? { sort: filters.sort } : {}),
            boostState: "not-boosted"
          }).toString()}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            filters.boostState === "not-boosted" ? "bg-[#ede9fe] text-[#5b21b6]" : "bg-[#f8fafc] text-[#64748b]"
          }`}
        >
          Not boosted
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">Search</span>
          <input
            type="search"
            name="query"
            defaultValue={filters.query ?? ""}
            placeholder="Search by product name"
            className={fieldClass}
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">Category</span>
          <select name="category" defaultValue={filters.category ?? ""} className={fieldClass}>
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">Boost State</span>
          <select name="boostState" defaultValue={filters.boostState ?? "all"} className={fieldClass}>
            <option value="all">All</option>
            <option value="boosted">Boosted</option>
            <option value="not-boosted">Not boosted</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">Sort</span>
          <select name="sort" defaultValue={filters.sort ?? "boost-high"} className={fieldClass}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
