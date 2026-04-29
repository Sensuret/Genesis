"use client";

import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import type { EquityPoint } from "@/lib/analytics";
import { Empty } from "@/components/ui/empty";

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  if (!data.length) return <Empty title="No trades yet" description="Equity curve will populate as you log or import trades." />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(138 58 255)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="rgb(138 58 255)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,150,0.15)" />
          <XAxis dataKey="date" stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgb(130 130 150)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number) =>
              new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
            }
            labelStyle={{ color: "rgb(130 130 150)" }}
          />
          <Area type="monotone" dataKey="equity" stroke="rgb(138 58 255)" fill="url(#equity)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
