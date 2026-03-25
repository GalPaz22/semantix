import type { DataFreshness } from "@/lib/dashboard/types";

export function HealthBanner({
  freshness: _freshness,
  warnings,
  errors
}: {
  freshness: DataFreshness;
  warnings: string[];
  errors: string[];
}) {
  if (!warnings.length && !errors.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-panel">
      <div className="grid gap-2 text-sm">
        {warnings.slice(0, 2).map((warning) => (
          <p key={warning} className="rounded-2xl border border-line bg-[#faf7ff] px-3 py-2 text-muted">
            אזהרה: {warning}
          </p>
        ))}
        {errors.slice(0, 2).map((error) => (
          <p key={error} className="rounded-2xl border border-[#f0d5d5] bg-[#fff6f6] px-3 py-2 text-danger">
            שגיאה: {error}
          </p>
        ))}
      </div>
    </div>
  );
}
