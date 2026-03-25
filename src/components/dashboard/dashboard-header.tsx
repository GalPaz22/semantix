"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "/dashboard": "סקירה כללית",
  "/dashboard/attribution": "אטריביושן",
  "/dashboard/insights": "תובנות",
  "/dashboard/customers": "לקוחות",
  "/dashboard/products": "מוצרים",
  "/dashboard/boost": "מוצרים",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const title = labels[pathname] ?? "דאשבורד";

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md lg:right-72">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 19V10" />
              <path d="M12 19V5" />
              <path d="M19 19v-7" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Semantix</p>
            <h1 className="text-base font-semibold text-ink">{title}</h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-1 text-xs font-medium text-[#6d28d9]">
            Mendelson בזמן אמת
          </span>
        </div>
      </div>
    </header>
  );
}
