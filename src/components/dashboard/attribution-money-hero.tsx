"use client";

import Link from "next/link";
import type { Route } from "next";

import type { AttributionDashboardData, DashboardFilters } from "@/lib/dashboard/types";

import { formatCurrency } from "@/lib/dashboard/format";

type AttributionMoneyHeroProps = {
  filters: DashboardFilters;
  searchCore: AttributionDashboardData["searchCore"];
  breakdown: AttributionDashboardData["clickSourceBreakdown"];
};

function shiftRange(to: string, days: number) {
  const end = new Date(to);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10)
  };
}

function buildPresetHref(filters: DashboardFilters, days: number): Route {
  const nextRange = shiftRange(filters.to, days);
  const params = new URLSearchParams();

  params.set("from", nextRange.from);
  params.set("to", nextRange.to);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.product) params.set("product", filters.product);

  return `/dashboard/attribution?${params.toString()}` as Route;
}

function isPresetActive(filters: DashboardFilters, days: number) {
  const expected = shiftRange(filters.to, days);
  return filters.from === expected.from && filters.to === expected.to;
}

export function AttributionMoneyHero({
  filters,
  searchCore,
  breakdown
}: AttributionMoneyHeroProps) {
  const semantixRows = breakdown.filter((row) =>
    ["zero-results", "rerank", "inject"].includes(row.source)
  );
  const attributedValue = semantixRows.reduce((sum, row) => sum + row.attributedValue, 0);
  const semantixClicks = semantixRows.reduce((sum, row) => sum + row.clicks, 0);

  const presets = [
    { label: "24 השעות האחרונות", days: 1 },
    { label: "7 הימים האחרונים", days: 7 },
    { label: "30 הימים האחרונים", days: 30 }
  ] as const;

  return (
    <section className="rounded-[24px] bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_48%,#c026d3_100%)] p-4 text-white shadow-[0_18px_40px_rgba(108,43,217,0.16)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Link
              key={preset.days}
              href={buildPresetHref(filters, preset.days)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                isPresetActive(filters, preset.days)
                  ? "bg-white text-[#5b21b6]"
                  : "bg-white/14 text-white hover:bg-white/20"
              }`}
            >
              {preset.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.8fr_0.8fr]">
          <article className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/80">שווי מיוחס</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[-0.05em]">
              {formatCurrency(attributedValue)}
            </p>
            <p className="mt-1 text-xs text-white/75">שווי עגלות שתואם חזרה למקורות של סמנטיקס.</p>
          </article>
          <article className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/80">הוספות לעגלה מיוחסות</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">
              {searchCore.attributedAddToCarts.toLocaleString("he-IL")}
            </p>
          </article>
          <article className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/80">קליקים דרך סמנטיקס</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">
              {semantixClicks.toLocaleString("he-IL")}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
