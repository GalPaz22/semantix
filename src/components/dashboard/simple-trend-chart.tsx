import type { TrendPoint } from "@/lib/dashboard/types";

import { formatCompactNumber } from "@/lib/dashboard/format";

type SimpleTrendChartProps = {
  data: TrendPoint[];
};

export function SimpleTrendChart({ data }: SimpleTrendChartProps) {
  if (!data.length) {
    return <p className="text-sm text-muted">No trend data available for the selected filters.</p>;
  }

  const width = 720;
  const height = 240;
  const padding = 24;
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);
  const maxOrders = Math.max(...data.map((point) => point.orders), 1);

  const revenuePath = data
    .map((point, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (point.revenue / maxRevenue) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const ordersPath = data
    .map((point, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (point.orders / maxOrders) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Records
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="revenue-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(123,63,242,0.35)" />
            <stop offset="100%" stopColor="rgba(123,63,242,0)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((index) => {
          const y = padding + (index / 3) * (height - padding * 2);
          return (
            <line
              key={index}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(123,99,200,0.16)"
              strokeDasharray="4 8"
            />
          );
        })}
        <path d={revenuePath} fill="none" stroke="rgb(123,63,242)" strokeWidth="3.25" strokeLinecap="round" />
        <path d={ordersPath} fill="none" stroke="rgb(44,103,242)" strokeWidth="2.75" strokeLinecap="round" />
      </svg>
      <div className="grid gap-3 sm:grid-cols-4">
        {data.slice(-4).map((point) => (
          <div key={point.date} className="rounded-2xl border border-[#e4dbff] bg-[#faf7ff] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{point.label}</p>
            <p className="mt-2 text-lg font-bold text-ink">{formatCompactNumber(point.revenue)}</p>
            <p className="text-xs text-muted">{point.orders} records</p>
          </div>
        ))}
      </div>
    </div>
  );
}
