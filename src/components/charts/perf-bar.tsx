"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PerfBar({
  data
}: {
  data: Array<{ key: string; pnl: number; trades: number }>;
}) {
  if (!data.length) return <div className="text-sm text-fg-muted">No data yet.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <XAxis type="number" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis dataKey="key" type="category" stroke="rgb(130 130 150)" fontSize={11} width={120} />
          <Tooltip />
          <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.pnl >= 0 ? "rgb(34 197 94)" : "rgb(239 68 68)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
