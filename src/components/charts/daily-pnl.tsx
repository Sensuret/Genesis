"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMoney } from "@/lib/filters/store";
import { formatMoney, formatMoneyCompact } from "@/lib/fx";

/**
 * Daily P&L bar chart with glossy green/red gradient bars — bright
 * highlight at the top fading into the base colour for a glassy
 * reflective look (matches the equity curve's treatment).
 */
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
        <BarChart data={converted} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            {/* Emerald + coral palette matching the equity curve. */}
            <linearGradient id="bar-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(63 219 131)" stopOpacity={1} />
              <stop offset="55%" stopColor="rgb(34 197 94)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(20 83 45)" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="bar-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(248 113 113)" stopOpacity={1} />
              <stop offset="55%" stopColor="rgb(239 68 68)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(127 29 29)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,150,0.15)" />
          <XAxis dataKey="date" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="rgb(130 130 150)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={48}
            tickMargin={2}
            tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              background: "rgb(15 14 26 / 0.95)",
              border: "1px solid rgb(168 102 255 / 0.4)",
              borderRadius: 12,
              color: "white",
              fontSize: 12
            }}
            formatter={(v: number) => formatMoney(v, currency)}
          />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
            {converted.map((d) => (
              <Cell key={d.date} fill={d.pnl >= 0 ? "url(#bar-up)" : "url(#bar-down)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
