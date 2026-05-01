"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMoney } from "@/lib/filters/store";
import { formatMoney } from "@/lib/fx";

export function PerfBar({
  data
}: {
  data: Array<{ key: string; pnl: number; trades: number }>;
}) {
  const { convert, currency } = useMoney();
  const converted = useMemo(
    () => data.map((d) => ({ ...d, pnl: convert(d.pnl) })),
    [data, convert]
  );
  if (!data.length) return <div className="text-sm text-fg-muted">No data yet.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={converted} layout="vertical" margin={{ left: 24 }}>
          <XAxis
            type="number"
            stroke="rgb(130 130 150)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatMoney(v, currency)}
          />
          <YAxis dataKey="key" type="category" stroke="rgb(130 130 150)" fontSize={11} width={120} />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
            {converted.map((d) => (
              <Cell key={d.key} fill={d.pnl >= 0 ? "rgb(34 197 94)" : "rgb(239 68 68)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
