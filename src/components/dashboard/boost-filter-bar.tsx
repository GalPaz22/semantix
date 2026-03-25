import type { BoostFilters, DimensionOption } from "@/lib/dashboard/types";

type BoostFilterBarProps = {
  filters: BoostFilters;
  categories: DimensionOption[];
  totalProducts?: number;
};

const fieldClass =
  "min-w-0 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink [color-scheme:light]";

const sortOptions = [
  { value: "boost-high", label: "בוסט גבוה ביותר" },
  { value: "clicks", label: "הכי הרבה קליקים" },
  { value: "carts", label: "הכי הרבה עגלות" },
  { value: "price-high", label: "מחיר גבוה ביותר" },
  { value: "price-low", label: "מחיר נמוך ביותר" },
  { value: "name", label: "שם" }
] as const;

export function BoostFilterBar({ filters, categories, totalProducts = 0 }: BoostFilterBarProps) {
  return (
    <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c3aed]">מוצרים</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-ink">ניהול בוסטים בקטלוג</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#faf7ff] px-3 py-1.5 text-xs font-semibold text-[#5b21b6]">
            {totalProducts.toLocaleString("he-IL")} מוצרים
          </span>
          <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
        >
          החל
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
          כל המוצרים
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
          רק עם בוסט
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
          בלי בוסט
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">חיפוש</span>
          <input
            type="search"
            name="query"
            defaultValue={filters.query ?? ""}
            placeholder="חיפוש לפי שם מוצר"
            className={fieldClass}
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">קטגוריה</span>
          <select name="category" defaultValue={filters.category ?? ""} className={fieldClass}>
            <option value="">הכול</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">מצב בוסט</span>
          <select name="boostState" defaultValue={filters.boostState ?? "all"} className={fieldClass}>
            <option value="all">הכול</option>
            <option value="boosted">עם בוסט</option>
            <option value="not-boosted">בלי בוסט</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm text-muted">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f769f]">מיון</span>
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
