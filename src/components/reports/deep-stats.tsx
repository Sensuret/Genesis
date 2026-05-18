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
  Legend
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { TradeRow } from "@/lib/supabase/types";
import {
  computeDeepStats,
  bucketsByHour,
  bucketsByWeekday,
  bucketsByMonth,
  type BucketEntry
} from "@/lib/analytics/deep-stats";
import { formatNumber } from "@/lib/utils";

function fmt(v: number, dp = 2): string {
  return formatNumber(v, dp);
}

function fmtCcy(v: number): string {
  return v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "\u2014";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function shortLabel(label: string): string {
  if (label.includes(":")) return String(parseInt(label, 10));
  const dayMap: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
  };
  if (dayMap[label]) return dayMap[label];
  return label.slice(0, 3);
}

// ── MT5-style metric row ─────────────────────────────────────────────

function MetricRow({ cells }: { cells: Array<{ label: string; value: string; cls?: string }> }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      {cells.map((cell, i) => (
        <td key={i} className="px-3 py-1.5">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-fg-subtle whitespace-nowrap">{cell.label}</span>
            <span className={`font-mono tabular-nums whitespace-nowrap ${cell.cls ?? ""}`}>{cell.value}</span>
          </div>
        </td>
      ))}
    </tr>
  );
}

function SectionBreak() {
  return <tr><td colSpan={3} className="h-1.5 border-b border-white/10" /></tr>;
}

// ── Trade breakdown row ──────────────────────────────────────────────

function BreakdownRow({ label, winLabel, winValue, lossLabel, lossValue, winCls, lossCls }: {
  label: string;
  winLabel: string;
  winValue: string;
  lossLabel: string;
  lossValue: string;
  winCls?: string;
  lossCls?: string;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-1.5 text-xs text-fg-subtle whitespace-nowrap text-right">{label}</td>
      <td className="px-3 py-1.5">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-fg-subtle">{winLabel}</span>
          <span className={`font-mono tabular-nums ${winCls ?? ""}`}>{winValue}</span>
        </div>
      </td>
      <td className="px-3 py-1.5">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-fg-subtle">{lossLabel}</span>
          <span className={`font-mono tabular-nums ${lossCls ?? ""}`}>{lossValue}</span>
        </div>
      </td>
    </tr>
  );
}

// ── Component ────────────────────────────────────────────────────────

export function DeepStats({ trades }: { trades: TradeRow[] }) {
  const stats = useMemo(() => computeDeepStats(trades), [trades]);
  const hourly = useMemo(() => bucketsByHour(trades), [trades]);
  const weekday = useMemo(() => bucketsByWeekday(trades), [trades]);
  const monthly = useMemo(() => bucketsByMonth(trades), [trades]);

  return (
    <div className="space-y-4">
      {/* Summary metrics — MT5 3-column grid */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy report</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full">
            <tbody>
              <MetricRow cells={[
                { label: "Gross Profit", value: fmtCcy(stats.grossProfit), cls: "text-success" },
                { label: "Maximal Drawdown", value: `${fmtCcy(stats.maximalDrawdown)} (${fmt(stats.maximalDrawdownPct)}%)`, cls: "text-danger" },
                { label: "Total Net Profit", value: fmtCcy(stats.totalNetProfit), cls: stats.totalNetProfit >= 0 ? "text-success" : "text-danger" }
              ]} />
              <MetricRow cells={[
                { label: "Gross Loss", value: `-${fmtCcy(stats.grossLoss)}`, cls: "text-danger" },
                { label: "Relative Drawdown", value: `${fmt(stats.relativeDrawdownPct)}% (${fmtCcy(stats.relativeDrawdown)})`, cls: "text-danger" },
                { label: "Absolute Drawdown", value: fmtCcy(stats.absoluteDrawdown), cls: "text-danger" }
              ]} />

              <SectionBreak />

              <MetricRow cells={[
                { label: "Profit Factor", value: fmt(stats.profitFactor) },
                { label: "Expected Payoff", value: fmtCcy(stats.expectedPayoff) },
                { label: "Sharpe Ratio", value: fmt(stats.sharpeRatio) }
              ]} />
              <MetricRow cells={[
                { label: "Recovery Factor", value: fmt(stats.recoveryFactor) },
                { label: "Avg Hold Time", value: fmtDuration(stats.avgHoldSeconds) },
                { label: "Win Rate", value: `${fmt(stats.winRate, 1)}%` }
              ]} />

              <SectionBreak />

              <MetricRow cells={[
                { label: "Total Trades", value: String(stats.totalTrades) },
                { label: "Short Trades (Won %)", value: `${stats.shortCount} (${fmt(stats.shortWinPct, 1)}%)` },
                { label: "Long Trades (Won %)", value: `${stats.longCount} (${fmt(stats.longWinPct, 1)}%)` }
              ]} />
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Trade breakdown — MT5 style */}
      <Card>
        <CardHeader>
          <CardTitle>Trade statistics</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <td className="px-3 py-1.5 text-xs font-semibold">Total Deals</td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="font-semibold">Profit Trades (% of total)</span>
                    <span className="font-mono tabular-nums text-success">{stats.winCount} ({fmt(stats.winRate, 2)}%)</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="font-semibold">Loss Trades (% of total)</span>
                    <span className="font-mono tabular-nums text-danger">{stats.lossCount} ({fmt(stats.lossRate, 2)}%)</span>
                  </div>
                </td>
              </tr>

              <BreakdownRow
                label="Largest"
                winLabel="profit trade" winValue={fmtCcy(stats.largestWin)} winCls="text-success"
                lossLabel="loss trade" lossValue={fmtCcy(stats.largestLoss)} lossCls="text-danger"
              />
              <BreakdownRow
                label="Average"
                winLabel="profit trade" winValue={fmtCcy(stats.avgWin)} winCls="text-success"
                lossLabel="loss trade" lossValue={fmtCcy(stats.avgLoss)} lossCls="text-danger"
              />
              <BreakdownRow
                label="Maximum"
                winLabel="consecutive wins ($)"
                winValue={`${stats.maxConsecWins} (${fmtCcy(stats.maxConsecWinAmount)})`}
                lossLabel="consecutive losses ($)"
                lossValue={`${stats.maxConsecLosses} (${fmtCcy(stats.maxConsecLossAmount)})`}
                lossCls="text-danger"
              />
              <BreakdownRow
                label="Average"
                winLabel="consecutive wins"
                winValue={fmt(stats.avgConsecWins, 1)}
                lossLabel="consecutive losses"
                lossValue={fmt(stats.avgConsecLosses, 1)}
              />
              <BreakdownRow
                label="Avg Hold"
                winLabel="winning trades"
                winValue={fmtDuration(stats.avgWinHoldSeconds)}
                lossLabel="losing trades"
                lossValue={fmtDuration(stats.avgLossHoldSeconds)}
              />
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Entry distribution charts — 3 in a row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <EntryChart title="Entries by hours" data={hourly} />
        <EntryChart title="Entries by weekdays" data={weekday} />
        <EntryChart title="Entries by months" data={monthly} />
      </div>

      {/* Profit/loss charts — 3 in a row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PnlChart title="Profits and losses by hours" data={hourly} />
        <PnlChart title="Profits and losses by weekdays" data={weekday} />
        <PnlChart title="Profits and losses by months" data={monthly} />
      </div>
    </div>
  );
}

// ── Entry distribution bar chart (teal, single bar per bucket) ───────

function EntryChart({ title, data }: { title: string; data: BucketEntry[] }) {
  const mapped = data.map((d) => ({ ...d, short: shortLabel(d.label) }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-xs">{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mapped} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="short"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} width={40} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#fff" }}
              labelFormatter={(_, payload) => {
                const entry = payload?.[0]?.payload as BucketEntry | undefined;
                return entry?.label ?? "";
              }}
            />
            <Bar dataKey="totalTrades" name="Entries" fill="#0d9488" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

// ── Profit/loss grouped bar chart (blue wins, red losses) ────────────

function PnlChart({ title, data }: { title: string; data: BucketEntry[] }) {
  const mapped = data.map((d) => ({ ...d, short: shortLabel(d.label) }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-xs">{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mapped} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="short"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} width={40} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#fff" }}
              labelFormatter={(_, payload) => {
                const entry = payload?.[0]?.payload as BucketEntry | undefined;
                return entry?.label ?? "";
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="winPnl" name="Profit" fill="#4a86c8" radius={[2, 2, 0, 0]} />
            <Bar dataKey="lossPnl" name="Loss" fill="#dc6868" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
