'use client'
import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export const fmt = n => n.toLocaleString("he-IL");
export const money = n => `${"₪"}${fmt(n)}`;
export const compactMoney = n =>
  n >= 1e6 ? `${"₪"}${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${"₪"}${Math.round(n / 1e3)}K` : money(n);

export function Card({ className = "", children }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 px-5 pt-5 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0 self-start md:self-auto">{right}</div>}
    </div>
  );
}

// Delta vs previous period. `invert` marks metrics where down is good.
export function Delta({ value, invert = false, suffix = "%" }) {
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} dir="ltr">
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}{suffix}
    </span>
  );
}

export function Segmented({ options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]";
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5">
      {options.map(o => (
        <button type="button" key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`${pad} rounded-md font-medium transition ${value === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="text-[13px] font-medium text-indigo-600 mb-1">{eyebrow}</div>}
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="max-w-full self-start md:self-auto">{right}</div>}
    </div>
  );
}
