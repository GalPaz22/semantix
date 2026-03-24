"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

import type { AttributionDashboardData, DashboardFilters } from "@/lib/dashboard/types";

import { formatCurrency, formatDate } from "@/lib/dashboard/format";

const SEMANTIX_SOURCES = ["zero-results", "rerank", "inject"] as const;

const sourceTone = {
  "zero-results": "bg-orange-100 text-orange-700",
  rerank: "bg-violet-100 text-violet-700",
  inject: "bg-emerald-100 text-emerald-700"
} as const;

type SemantixAttributionHeaderProps = {
  filters?: DashboardFilters;
  searchCore: AttributionDashboardData["searchCore"];
  breakdown: AttributionDashboardData["clickSourceBreakdown"];
  attributedValueEvents: AttributionDashboardData["attributedValueEvents"];
  labels: AttributionDashboardData["sourceLabels"];
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

  if (filters.region) params.set("region", filters.region);
  if (filters.status) params.set("status", filters.status);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.product) params.set("product", filters.product);
  if (filters.team) params.set("team", filters.team);

  return `/dashboard?${params.toString()}` as Route;
}

function isPresetActive(filters: DashboardFilters, days: number) {
  const expected = shiftRange(filters.to, days);
  return filters.from === expected.from && filters.to === expected.to;
}

export function SemantixAttributionHeader({
  filters,
  searchCore,
  breakdown,
  attributedValueEvents,
  labels
}: SemantixAttributionHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const safeFilters =
    filters ??
    (() => {
      const today = new Date().toISOString().slice(0, 10);
      return { from: today, to: today } satisfies DashboardFilters;
    })();
  const semantixRows = breakdown.filter((row) =>
    SEMANTIX_SOURCES.includes(row.source as (typeof SEMANTIX_SOURCES)[number])
  );
  const semantixClicks = semantixRows.reduce((sum, row) => sum + row.clicks, 0);
  const semantixCarts = semantixRows.reduce((sum, row) => sum + row.attributedCarts, 0);
  const semantixValue = semantixRows.reduce((sum, row) => sum + row.attributedValue, 0);
  const totalSearchClicks = searchCore.totalProductClicks;
  const totalSearchCarts = searchCore.totalAddToCarts;
  const totalSearchValue = searchCore.totalSearchValue;

  const presets = [
    { label: "Last 24 Hours", days: 1 },
    { label: "Last 7 Days", days: 7 },
    { label: "Last 30 Days", days: 30 }
  ] as const;

  return (
    <section
      dir="ltr"
      className="rounded-[24px] bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_48%,#c026d3_100%)] p-4 text-left text-white shadow-[0_18px_40px_rgba(108,43,217,0.18)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Link
                key={preset.days}
                href={buildPresetHref(safeFilters, preset.days)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isPresetActive(safeFilters, preset.days)
                    ? "bg-white text-[#5b21b6]"
                    : "bg-white/14 text-white hover:bg-white/20"
                }`}
              >
                {preset.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.8fr_0.8fr]">
          <article className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/80">All Search Value</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[-0.06em]">{formatCurrency(totalSearchValue)}</p>
          </article>

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-[20px] border border-white/20 bg-white/10 p-4 text-left backdrop-blur-sm transition hover:bg-white/14"
          >
            <p className="text-xs font-semibold text-white/80">Semantix Attributed Value</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em]">{formatCurrency(semantixValue)}</p>
            <p className="mt-1.5 text-xs text-white/75">{isExpanded ? "Hide breakdown" : "Open breakdown"}</p>
          </button>

          <article className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/80">Semantix Clicks</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em]">{semantixClicks.toLocaleString("en-US")}</p>
          </article>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-black/10 px-3.5 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">All Search Clicks</p>
            <p className="mt-1.5 text-lg font-bold text-white">{totalSearchClicks.toLocaleString("en-US")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-black/10 px-3.5 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">All Add to Cart</p>
            <p className="mt-1.5 text-lg font-bold text-white">{totalSearchCarts.toLocaleString("en-US")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-black/10 px-3.5 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">Semantix Add to Cart</p>
            <p className="mt-1.5 text-lg font-bold text-white">{semantixCarts.toLocaleString("en-US")}</p>
          </article>
        </div>

        {isExpanded ? (
          <div className="rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-2 border-b border-white/15 pb-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Attribution Details
                </p>
                <h3 className="mt-1.5 font-display text-xl font-bold tracking-[-0.04em] text-white">
                  What builds {formatCurrency(semantixValue)}
                </h3>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5">
              {attributedValueEvents.map((entry) => (
                <article
                  key={`${entry.source}-${entry.product}-${entry.timestamp ?? "unknown"}`}
                  className="rounded-2xl bg-white/10 px-3.5 py-3"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceTone[entry.source as keyof typeof sourceTone] ?? "bg-white/20 text-white"}`}>
                          {labels[entry.source]}
                        </span>
                        <p className="truncate text-sm font-semibold text-white">{entry.product}</p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/75">
                        <span>{entry.query ?? "-"}</span>
                        <span>{formatDate(entry.timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(entry.price)}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">Attributed price</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
