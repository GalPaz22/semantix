"use client";

import { useEffect, useState } from "react";
import { isAdminEmail } from "/lib/admin";
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw, AlertCircle } from "lucide-react";

const RANGES = [
  { days: 7, label: "7 ימים" },
  { days: 30, label: "30 יום" },
  { days: 90, label: "90 יום" },
];

const nf = new Intl.NumberFormat("he-IL");
const money = (v) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v || 0);
const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

// Change vs. the previous period. `goodWhenUp` is false for failure rates.
function Delta({ current, previous, goodWhenUp = true, isRate = false }) {
  if (!previous) return <span className="text-xs text-gray-400">אין נתונים לתקופה הקודמת</span>;
  const diff = isRate ? (current - previous) * 100 : ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Minus className="w-3 h-3" /> ללא שינוי
      </span>
    );
  }
  const up = diff > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = isRate ? `${Math.abs(diff).toFixed(1)} נק׳ אחוז` : `${Math.abs(diff).toFixed(0)}%`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${good ? "text-emerald-700" : "text-rose-700"}`}>
      <Icon className="w-3 h-3" />
      {up ? "עלייה" : "ירידה"} של {text}
    </span>
  );
}

function Kpi({ label, value, hint, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className="mt-2">{children}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

function Table({ title, subtitle, columns, rows, empty }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-5 py-2 font-medium ${c.numeric ? "text-left" : "text-right"}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.query} className="hover:bg-gray-50">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-5 py-2 ${c.numeric ? "text-left tabular-nums text-gray-700" : "text-right text-gray-900"}`}
                    >
                      {c.format ? c.format(r[c.key]) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ClientSearchPanel({ onboarding, session }) {
  const isAdmin = isAdminEmail(session?.user?.email);
  const dbName = onboarding?.credentials?.dbName || onboarding?.dbName || "";
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ days: String(days) });
    // The server ignores this for clients and pins them to their own store.
    if (isAdmin && dbName) params.set("dbName", dbName);
    fetch(`/api/client/analytics?${params}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "טעינת הנתונים נכשלה");
        if (!cancelled) setData(json);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, dbName, isAdmin, reload]);

  const cur = data?.kpis?.current;
  const prev = data?.kpis?.previous;
  const byCheckout = cur?.conversionSource === "checkout";
  const orderCols = data?.topSearches?.some((r) => r.orders !== null);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">ביצועי החיפוש</h2>
          <p className="text-sm text-gray-500">מה הגולשים מחפשים, מה הם קונים ואיפה החיפוש מפספס</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  days === r.days ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setReload((n) => n + 1)}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
            aria-label="רענון"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        cur && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi
                label="אחוז המרה מחיפוש"
                value={pct(cur.conversionRate)}
                hint={byCheckout ? "רכישות מחיפוש מתוך כל החיפושים" : "הוספות לעגלה מחיפוש מתוך כל החיפושים (אין מעקב רכישות)"}
              >
                <Delta current={cur.conversionRate} previous={prev?.conversionRate} isRate />
              </Kpi>
              <Kpi
                label={cur.revenueSource === "checkout" ? "הכנסות מחיפוש" : "שווי עגלות מחיפוש"}
                value={money(cur.revenue)}
                hint={cur.revenueSource === "checkout" ? "הזמנות שהתחילו בחיפוש" : "אין מעקב רכישות, מוצג שווי העגלות"}
              >
                <Delta current={cur.revenue} previous={prev?.revenue} />
              </Kpi>
              <Kpi label="חיפושים" value={nf.format(cur.searches)}>
                <Delta current={cur.searches} previous={prev?.searches} />
              </Kpi>
              <Kpi label="חיפושים ללא תוצאות" value={pct(cur.failedRate)} hint={`${nf.format(cur.zeroResults)} חיפושים`}>
                <Delta current={cur.failedRate} previous={prev?.failedRate} goodWhenUp={false} isRate />
              </Kpi>
            </div>

            <Table
              title="חיפושים מובילים"
              columns={[
                { key: "query", label: "חיפוש" },
                { key: "searches", label: "חיפושים", numeric: true, format: (v) => nf.format(v) },
                { key: "clicks", label: "קליקים", numeric: true, format: (v) => nf.format(v) },
                { key: "cartAdds", label: "לעגלה", numeric: true, format: (v) => nf.format(v) },
                ...(orderCols ? [{ key: "orders", label: "רכישות", numeric: true, format: (v) => nf.format(v || 0) }] : []),
                { key: "revenue", label: orderCols ? "הכנסה" : "שווי עגלות", numeric: true, format: money },
              ]}
              rows={data.topSearches}
              empty="אין חיפושים בתקופה הזו."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Table
                title="חיפושים ללא תוצאות"
                subtitle="הגולש חיפש ולא קיבל אף מוצר"
                columns={[
                  { key: "query", label: "חיפוש" },
                  { key: "searches", label: "פעמים", numeric: true, format: (v) => nf.format(v) },
                ]}
                rows={data.failedSearches.zeroResults}
                empty="אין חיפושים ללא תוצאות בתקופה הזו."
              />
              <Table
                title="חיפושים שננטשו"
                subtitle="הוצגו תוצאות, אבל אף אחד לא לחץ או הוסיף לעגלה (5 חיפושים ומעלה)"
                columns={[
                  { key: "query", label: "חיפוש" },
                  { key: "searches", label: "פעמים", numeric: true, format: (v) => nf.format(v) },
                ]}
                rows={data.failedSearches.noEngagement}
                empty="לא נמצאו חיפושים כאלה."
              />
            </div>
          </>
        )
      )}
    </div>
  );
}
