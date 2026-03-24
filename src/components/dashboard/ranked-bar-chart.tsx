"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RankedBarChart({
  data,
  dataKey,
  labelKey = "label",
  color = "#7b3ff2"
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  labelKey?: string;
  color?: string;
}) {
  if (!data.length) {
    return <p className="text-sm text-muted">No comparison data is available for this view.</p>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 36, bottom: 8 }}>
          <CartesianGrid stroke="#f0ebff" strokeDasharray="4 6" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8f86b5", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#2b223f", fontSize: 12, fontWeight: 700 }}
            width={120}
          />
          <Tooltip
            cursor={{ fill: "#f8f4ff" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e4dbff",
              background: "rgba(255,255,255,0.98)"
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 12, 12, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
