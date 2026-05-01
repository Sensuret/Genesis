"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMoney } from "@/lib/filters/store";
import { formatMoney } from "@/lib/fx";

export function DailyPnlChart({ data }: { data: Array<{ date: string; pnl: number }> }) {
  const { convert, currency } = useMoney();
  const converted = useMemo(
    () => data.map((d) => ({ ...d, pnl: convert(d.pnl) })),
    [data, convert]
  );
  if (!data.length) return <div className="text-sm text-fg-muted">No daily P&L yet.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={converted}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,150,0.15)" />
          <XAxis dataKey="date" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="rgb(130 130 150)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatMoney(v, currency)}
          />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
            {converted.map((d) => (
              <Cell key={d.date} fill={d.pnl >= 0 ? "rgb(34 197 94)" : "rgb(239 68 68)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
