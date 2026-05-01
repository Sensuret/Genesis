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
          <defs>
            {/* Same glossy emerald/red gradients as the equity curve and
                daily P&L bars — applied left→right because the bars are
                horizontal here. */}
            <linearGradient id="perf-up" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(20 83 45)" stopOpacity={0.7} />
              <stop offset="55%" stopColor="rgb(34 197 94)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(63 219 131)" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="perf-down" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="rgb(127 29 29)" stopOpacity={0.7} />
              <stop offset="55%" stopColor="rgb(239 68 68)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(248 113 113)" stopOpacity={1} />
            </linearGradient>
          </defs>
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
              <Cell key={d.key} fill={d.pnl >= 0 ? "url(#perf-up)" : "url(#perf-down)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
