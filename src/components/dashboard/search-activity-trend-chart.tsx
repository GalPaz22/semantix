"use client";

import type { SearchActivityPoint } from "@/lib/dashboard/types";

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

export function SearchActivityTrendChart({ data }: { data: SearchActivityPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted">אין כרגע מגמת סקירה זמינה עבור הסינון שנבחר.</p>;
  }

  return (
    <div className="h-[320px] w-full">
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
          <Line type="monotone" dataKey="queries" stroke="#111827" strokeWidth={2.5} dot={false} name="שאילתות" />
          <Line type="monotone" dataKey="clicks" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="קליקים" />
          <Line
            type="monotone"
            dataKey="attributedCarts"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            name="הוספות לעגלה מיוחסות"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
