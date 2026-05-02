"use client";

import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from "recharts";
import { useMemo } from "react";
import type { TradeRow } from "@/lib/supabase/types";
import { useMoney } from "@/lib/filters/store";
import { formatMoney, formatMoneyCompact } from "@/lib/fx";

/**
 * Intraday equity curve for a single day — plots cumulative P&L across
 * the trades taken on that day, in order. Uses the same glossy split-
 * coloured fill as the dashboard equity curve so a winning day glows
 * green and a losing day glows red.
 */
export function IntradayEquityChart({ trades }: { trades: TradeRow[] }) {
  const { convert, currency } = useMoney();

  const data = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const ad = new Date(a.created_at).getTime();
      const bd = new Date(b.created_at).getTime();
      return ad - bd;
    });
    let equity = 0;
    const start = { idx: 0, label: "Start", equity: 0, pnl: 0 };
    const points = sorted.map((t, i) => {
      equity += t.pnl ?? 0;
      return {
        idx: i + 1,
        label: t.pair ? `${i + 1} · ${t.pair}` : `Trade ${i + 1}`,
        equity: convert(equity),
        pnl: convert(t.pnl ?? 0)
      };
    });
    return [start, ...points];
  }, [trades, convert]);

  const splitOffset = useMemo(() => {
    if (!data.length) return 1;
    const max = Math.max(...data.map((d) => d.equity));
    const min = Math.min(...data.map((d) => d.equity));
    if (max <= 0) return 0;
    if (min >= 0) return 1;
    return max / (max - min);
  }, [data]);

  if (data.length <= 1) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-fg-muted">
        No closed trades yet on this day.
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[180px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="day-eq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(63 219 131)" stopOpacity={0.55} />
              <stop offset="30%" stopColor="rgb(34 197 94)" stopOpacity={0.32} />
              <stop offset={`${splitOffset * 100}%`} stopColor="rgb(20 83 45)" stopOpacity={0.05} />
              <stop offset={`${splitOffset * 100}%`} stopColor="rgb(127 29 29)" stopOpacity={0.05} />
              <stop offset="70%" stopColor="rgb(239 68 68)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="rgb(248 113 113)" stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="day-eq-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(63 219 131)" />
              <stop offset={`${splitOffset * 100}%`} stopColor="rgb(63 219 131)" />
              <stop offset={`${splitOffset * 100}%`} stopColor="rgb(239 68 68)" />
              <stop offset="100%" stopColor="rgb(239 68 68)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,150,0.15)" />
          <XAxis
            dataKey="idx"
            stroke="rgb(130 130 150)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v === 0 ? "" : `#${v}`)}
          />
          <YAxis
            stroke="rgb(130 130 150)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={44}
            tickMargin={2}
            tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
          />
          <Tooltip
            formatter={(v: number) => formatMoney(v, currency)}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
            wrapperStyle={{ outline: "none" }}
          />
          <ReferenceLine y={0} stroke="rgba(127,127,150,0.45)" strokeDasharray="2 4" />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="url(#day-eq-stroke)"
            fill="url(#day-eq-fill)"
            strokeWidth={2}
            isAnimationActive={false}
            name={`Equity (${currency})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
