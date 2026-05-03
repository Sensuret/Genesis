"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip } from "recharts";
import type { TradeRow } from "@/lib/supabase/types";
import { rDistribution } from "@/lib/analytics";

function fillFor(bucket: string): string {
  if (bucket === "<1:1") return "url(#rr-down)";
  return "url(#rr-up)";
}

export function RDistributionChart({ trades }: { trades: TradeRow[] }) {
  const data = rDistribution(trades);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-xs text-fg-muted">
        No R:R data — trades need entry, stop-loss and take-profit levels.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <defs>
            <linearGradient id="rr-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(63 219 131)" stopOpacity={1} />
              <stop offset="55%" stopColor="rgb(34 197 94)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(20 83 45)" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="rr-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(248 113 113)" stopOpacity={1} />
              <stop offset="55%" stopColor="rgb(239 68 68)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(127 29 29)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <XAxis dataKey="bucket" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              background: "rgb(15 14 26 / 0.95)",
              border: "1px solid rgb(168 102 255 / 0.4)",
              borderRadius: 12,
              color: "white",
              fontSize: 12
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={fillFor(d.bucket)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
