"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import type { TradeRow } from "@/lib/supabase/types";
import {
  computeDeepStats,
  bucketsByHour,
  bucketsByWeekday,
  bucketsByMonth,
  type BucketEntry
} from "@/lib/analytics/deep-stats";
import { formatNumber } from "@/lib/utils";

function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "\u2014";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function DeepStats({ trades }: { trades: TradeRow[] }) {
  const stats = useMemo(() => computeDeepStats(trades), [trades]);
  const hourly = useMemo(() => bucketsByHour(trades), [trades]);
  const weekday = useMemo(() => bucketsByWeekday(trades), [trades]);
  const monthly = useMemo(() => bucketsByMonth(trades), [trades]);

  return (
    <div className="space-y-4">
      {/* Summary grid */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy report</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total trades" value={stats.totalTrades} />
            <Stat
              label="Total net profit"
              value={stats.totalNetProfit}
              format="currency"
              positive={stats.totalNetProfit >= 0}
            />
            <Stat label="Gross profit" value={stats.grossProfit} format="currency" valueClassName="text-success" />
            <Stat label="Gross loss" value={stats.grossLoss} format="currency" valueClassName="text-danger" />

            <Stat label="Profit factor" value={formatNumber(stats.profitFactor, 2)} format="text" />
            <Stat label="Expected payoff" value={stats.expectedPayoff} format="currency" />
            <Stat label="Sharpe ratio" value={formatNumber(stats.sharpeRatio, 2)} format="text" />
            <Stat label="Recovery factor" value={formatNumber(stats.recoveryFactor, 2)} format="text" />

            <Stat label="Maximal drawdown" value={stats.maximalDrawdown} format="currency" valueClassName="text-danger" />
            <Stat label="Maximal DD %" value={formatNumber(stats.maximalDrawdownPct, 2) + "%"} format="text" valueClassName="text-danger" />
            <Stat label="Relative drawdown" value={stats.relativeDrawdown} format="currency" valueClassName="text-danger" />
            <Stat label="Relative DD %" value={formatNumber(stats.relativeDrawdownPct, 2) + "%"} format="text" valueClassName="text-danger" />
          </div>
        </CardBody>
      </Card>

      {/* Win/Loss breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Winning trades</CardTitle></CardHeader>
          <CardBody>
            <div className="grid gap-3 grid-cols-2">
              <Stat label="Count" value={stats.winCount} />
              <Stat label="Win rate" value={formatNumber(stats.winRate, 1) + "%"} format="text" />
              <Stat label="Largest win" value={stats.largestWin} format="currency" valueClassName="text-success" />
              <Stat label="Avg win" value={stats.avgWin} format="currency" valueClassName="text-success" />
              <Stat label="Max consec. wins" value={stats.maxConsecWins} />
              <Stat label="Avg consec. wins" value={formatNumber(stats.avgConsecWins, 1)} format="text" />
              <Stat label="Avg win hold" value={formatDuration(stats.avgWinHoldSeconds)} format="text" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Losing trades</CardTitle></CardHeader>
          <CardBody>
            <div className="grid gap-3 grid-cols-2">
              <Stat label="Count" value={stats.lossCount} />
              <Stat label="Loss rate" value={formatNumber(stats.lossRate, 1) + "%"} format="text" />
              <Stat label="Largest loss" value={stats.largestLoss} format="currency" valueClassName="text-danger" />
              <Stat label="Avg loss" value={stats.avgLoss} format="currency" valueClassName="text-danger" />
              <Stat label="Max consec. losses" value={stats.maxConsecLosses} />
              <Stat label="Avg consec. losses" value={formatNumber(stats.avgConsecLosses, 1)} format="text" />
              <Stat label="Avg loss hold" value={formatDuration(stats.avgLossHoldSeconds)} format="text" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Longs vs Shorts */}
      <Card>
        <CardHeader><CardTitle>Direction breakdown</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Long trades" value={stats.longCount} />
            <Stat label="Long win %" value={formatNumber(stats.longWinPct, 1) + "%"} format="text" />
            <Stat label="Short trades" value={stats.shortCount} />
            <Stat label="Short win %" value={formatNumber(stats.shortWinPct, 1) + "%"} format="text" />
          </div>
        </CardBody>
      </Card>

      {/* Distribution charts — 3 in a row like MT5 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BucketChart title="By hour (UTC)" data={hourly} />
        <BucketChart title="By weekday" data={weekday} />
        <BucketChart title="By month" data={monthly} />
      </div>

      {/* Win/loss bar chart per bucket */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WinLossChart title="Wins vs losses by hour" data={hourly} />
        <WinLossChart title="Wins vs losses by weekday" data={weekday} />
        <WinLossChart title="Wins vs losses by month" data={monthly} />
      </div>
    </div>
  );
}

function BucketChart({ title, data }: { title: string; data: BucketEntry[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} width={50} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="netPnl" name="Net P&L" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.netPnl >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

function WinLossChart({ title, data }: { title: string; data: BucketEntry[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} width={40} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="winCount" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lossCount" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
