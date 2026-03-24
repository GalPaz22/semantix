"use client";

import type { SearchRevenuePoint } from "@/lib/dashboard/types";
import { formatCompactCurrency } from "@/lib/dashboard/format";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export function RevenueOverTimeChart({ data }: { data: SearchRevenuePoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted">No revenue timeline is available for this filter window.</p>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="semantixRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7b3ff2" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#7b3ff2" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ede7ff" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#8f86b5", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8f86b5", fontSize: 12 }}
            tickFormatter={(value) => `₪${Math.round(value)}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e4dbff",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 10px 30px rgba(82, 52, 166, 0.12)"
            }}
            formatter={(value: number) => [formatCompactCurrency(value), "Revenue"]}
          />
          <Area type="monotone" dataKey="revenue" fill="url(#semantixRevenue)" stroke="transparent" />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#6f42f5"
            strokeWidth={3}
            dot={{ r: 0 }}
            activeDot={{ r: 5, fill: "#6f42f5" }}
          />
          <Line type="monotone" dataKey="queries" stroke="#16131f" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
