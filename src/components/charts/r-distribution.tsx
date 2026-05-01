"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip } from "recharts";
import type { TradeRow } from "@/lib/supabase/types";
import { rDistribution } from "@/lib/analytics";

function colorFor(bucket: string): string {
  if (bucket === "0R") return "rgb(130 130 150)";
  // Negative buckets start with "-" or "≤-".
  if (bucket.startsWith("-") || bucket.startsWith("≤-")) return "rgb(239 68 68)";
  return "rgb(34 197 94)";
}

export function RDistributionChart({ trades }: { trades: TradeRow[] }) {
  const data = rDistribution(trades);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-xs text-fg-muted">
        No RR data — trades need entry, stop loss and exit prices to compute realised RR.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="bucket" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={colorFor(d.bucket)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
