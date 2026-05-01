"use client";

import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from "recharts";
import { useMemo } from "react";
import type { EquityPoint } from "@/lib/analytics";
import { Empty } from "@/components/ui/empty";
import { useMoney } from "@/lib/filters/store";
import { formatMoney } from "@/lib/fx";

/**
 * Cumulative equity area chart with a glossy split-coloured fill —
 * positive equity is green with a glassy gradient, negative is red.
 * The split point is computed from where 0 lives inside the visible
 * y-domain so the colour transition snaps to the zero line.
 */
export function EquityCurveChart({ data, variant = "default" }: { data: EquityPoint[]; variant?: "default" | "purple" }) {
  const { convert, currency } = useMoney();
  const converted = useMemo(
    () => data.map((d) => ({ ...d, equity: convert(d.equity), pnl: convert(d.pnl) })),
    [data, convert]
  );

  const splitOffset = useMemo(() => {
    if (!converted.length) return 0;
    const max = Math.max(...converted.map((d) => d.equity));
    const min = Math.min(...converted.map((d) => d.equity));
    if (max <= 0) return 0;
    if (min >= 0) return 1;
    return max / (max - min);
  }, [converted]);

  if (!data.length)
    return <Empty title="No trades yet" description="Equity curve will populate as you log or import trades." />;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={converted}>
          <defs>
            {variant === "purple" ? (
              <>
                <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(168 102 255)" stopOpacity={0.55} />
                  <stop offset="50%" stopColor="rgb(138 58 255)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="rgb(80 30 200)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="equity-stroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(168 102 255)" />
                  <stop offset="100%" stopColor="rgb(138 58 255)" />
                </linearGradient>
              </>
            ) : (
              <>
                <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(63 219 131)" stopOpacity={0.55} />
                  <stop offset="30%" stopColor="rgb(34 197 94)" stopOpacity={0.32} />
                  <stop offset={`${splitOffset * 100}%`} stopColor="rgb(20 83 45)" stopOpacity={0.05} />
                  <stop offset={`${splitOffset * 100}%`} stopColor="rgb(127 29 29)" stopOpacity={0.05} />
                  <stop offset="70%" stopColor="rgb(239 68 68)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="rgb(248 113 113)" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="equity-stroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(63 219 131)" />
                  <stop offset={`${splitOffset * 100}%`} stopColor="rgb(63 219 131)" />
                  <stop offset={`${splitOffset * 100}%`} stopColor="rgb(239 68 68)" />
                  <stop offset="100%" stopColor="rgb(239 68 68)" />
                </linearGradient>
              </>
            )}
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
          <ReferenceLine y={0} stroke="rgba(127,127,150,0.45)" strokeDasharray="2 4" />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="url(#equity-stroke)"
            fill="url(#equity-fill)"
            strokeWidth={2}
            name={`Equity (${currency})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
