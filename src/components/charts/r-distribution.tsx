"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip } from "recharts";
import type { TradeRow } from "@/lib/supabase/types";
import { rDistribution } from "@/lib/analytics";

export function RDistributionChart({ trades }: { trades: TradeRow[] }) {
  const data = rDistribution(trades);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="bucket" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={d.bucket.startsWith("-") || d.bucket.startsWith("<-") ? "rgb(239 68 68)" : d.bucket === "0R" ? "rgb(130 130 150)" : "rgb(34 197 94)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
