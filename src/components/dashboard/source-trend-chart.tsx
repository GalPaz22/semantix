"use client";

import type { SourceTrendPoint } from "@/lib/dashboard/types";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const series = [
  { key: "native", label: "Native", color: "#111827" },
  { key: "zeroResults", label: "Zero Results", color: "#dc2626" },
  { key: "inject", label: "Inject", color: "#0f766e" },
  { key: "rerank", label: "ReRank", color: "#7c3aed" },
  { key: "ai", label: "AI", color: "#2563eb" },
  { key: "unknown", label: "Unknown", color: "#9ca3af" }
] as const;

export function SourceTrendChart({ data }: { data: SourceTrendPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted">No source trend is available yet.</p>;
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#ede7ff" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#8f86b5", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8f86b5", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)"
            }}
          />
          <Legend />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={2.25}
              dot={false}
              name={item.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
