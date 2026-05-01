"use client";

import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { useMemo } from "react";
import type { EquityPoint } from "@/lib/analytics";
import { Empty } from "@/components/ui/empty";
import { useMoney } from "@/lib/filters/store";
import { formatMoney } from "@/lib/fx";

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const { convert, currency } = useMoney();
  const converted = useMemo(
    () => data.map((d) => ({ ...d, equity: convert(d.equity), pnl: convert(d.pnl) })),
    [data, convert]
  );
  if (!data.length) return <Empty title="No trades yet" description="Equity curve will populate as you log or import trades." />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={converted}>
          <defs>
            <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(138 58 255)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="rgb(138 58 255)" stopOpacity={0} />
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
          <Tooltip
            formatter={(v: number) => formatMoney(v, currency)}
            labelStyle={{ color: "rgb(130 130 150)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="rgb(138 58 255)"
            fill="url(#equity)"
            strokeWidth={2}
            name={`Equity (${currency})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
