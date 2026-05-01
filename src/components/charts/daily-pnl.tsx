"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMoney } from "@/lib/filters/store";
import { formatMoney } from "@/lib/fx";

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
        <BarChart data={converted}>
          <defs>
            <linearGradient id="bar-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(134 239 172)" stopOpacity={1} />
              <stop offset="35%" stopColor="rgb(34 197 94)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="rgb(22 163 74)" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="bar-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(252 165 165)" stopOpacity={1} />
              <stop offset="35%" stopColor="rgb(239 68 68)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="rgb(185 28 28)" stopOpacity={0.85} />
            </linearGradient>
          </defs>
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
              <Cell key={d.date} fill={d.pnl >= 0 ? "url(#bar-up)" : "url(#bar-down)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
