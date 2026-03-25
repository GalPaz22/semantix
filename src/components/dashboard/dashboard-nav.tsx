"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const items = [
  {
    href: "/dashboard",
    label: "סקירה כללית",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 19V10" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
      </svg>
    )
  },
  {
    href: "/dashboard/attribution",
    label: "אטריביושן",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 18 10 12l4 4 6-8" />
        <path d="M20 8v6h-6" />
      </svg>
    )
  },
  {
    href: "/dashboard/insights",
    label: "תובנות",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    )
  },
  {
    href: "/dashboard/customers",
    label: "לקוחות",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    href: "/dashboard/boost",
    label: "מוצרים",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m12 3 8 4.5-8 4.5L4 7.5 12 3Z" />
        <path d="M4 7.5V16.5L12 21L20 16.5V7.5" />
        <path d="M12 12V21" />
      </svg>
    )
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
              active
                ? "bg-gradient-to-r from-[#eef2ff] to-[#f5f3ff] text-[#5b21b6]"
                : "text-muted hover:bg-[#f9fafb] hover:text-ink"
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                  active ? "bg-white text-[#6d28d9] shadow-sm" : "bg-[#f3f4f6] text-[#9ca3af]"
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </span>
            <span className={cn("text-xs", active ? "text-[#6d28d9]" : "text-[#d1d5db]")}>‹</span>
          </a>
        );
      })}
    </nav>
  );
}
