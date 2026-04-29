"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function DailyPnlChart({ data }: { data: Array<{ date: string; pnl: number }> }) {
  if (!data.length) return <div className="text-sm text-fg-muted">No daily P&L yet.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,150,0.15)" />
          <XAxis dataKey="date" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.pnl >= 0 ? "rgb(34 197 94)" : "rgb(239 68 68)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
