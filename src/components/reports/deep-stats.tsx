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
  PieChart,
  Pie,
  Cell
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

type CcyFmt = (n: number | null | undefined) => string;

function fmtNum(v: number, dp = 2): string {
  return formatNumber(v, dp);
}

function fmtCcy(v: number): string {
  return v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(2)}k`;
  return fmtCcy(v);
}

function fmtDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "\u2014";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
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

// -- Gauge indicator ------------------------------------------------------

function GaugeBar({ label, value, min, max, displayValue, colour }: {
  label: string;
  value: number;
  min: number;
  max: number;
  displayValue: string;
  colour: "green" | "red" | "amber";
}) {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = max !== min ? ((clamped - min) / (max - min)) * 100 : 0;
  const barBg = colour === "green"
    ? "bg-emerald-500"
    : colour === "red"
      ? "bg-red-500"
      : "bg-amber-500";
  const trackGrad = colour === "green"
    ? "from-emerald-500/20 to-emerald-500/5"
    : colour === "red"
      ? "from-red-500/20 to-red-500/5"
      : "from-amber-500/20 to-amber-500/5";

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-fg">{label}</div>
      <div className="relative h-4 rounded bg-gradient-to-r from-bg-soft to-bg-elevated border border-line overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${barBg} opacity-80 rounded-l`}
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${trackGrad}`}
          style={{ width: "100%" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-fg-subtle">
        <span>{min}</span>
        <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-mono font-semibold text-fg border border-line">
          {displayValue}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// -- Visual summary header ------------------------------------------------

function VisualSummary({ stats, trades, ccyFmt }: {
  stats: ReturnType<typeof computeDeepStats>;
  trades: TradeRow[];
  ccyFmt: CcyFmt;
}) {
  const donutData = [
    { name: "Gross Profit", value: stats.grossProfit },
    { name: "Gross Loss", value: stats.grossLoss }
  ];
  const totalNet = stats.grossProfit - stats.grossLoss;

  const swaps = trades.reduce((s, t) => {
    const row = t as Record<string, unknown>;
    const v = typeof row.swap === "number" ? row.swap : 0;
    return s + v;
  }, 0);
  const commissions = trades.reduce((s, t) => s + (t.commissions ?? 0), 0);
  const dividends = 0;

  const tradesPerWeek = useMemo(() => {
    if (trades.length < 2) return 0;
    const dates = trades
      .map((t) => t.trade_date)
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));
    if (dates.length < 2) return 0;
    const span = (Math.max(...dates) - Math.min(...dates)) / (7 * 86_400_000);
    return span > 0 ? trades.length / span : trades.length;
  }, [trades]);

  return (
    <Card>
      <CardBody>
        <div className="grid gap-6 md:grid-cols-[280px_1fr_1fr]">
          {/* Left: donut + side stats */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-start gap-4 self-stretch">
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Gross Loss
                </div>
                <div className="text-sm font-semibold text-danger">
                  -{ccyFmt(stats.grossLoss)}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs text-fg-subtle">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Gross Profit
                </div>
                <div className="text-sm font-semibold text-success">
                  +{ccyFmt(stats.grossProfit)}
                </div>
              </div>
            </div>

            <div className="relative">
              <PieChart width={180} height={180}>
                <Pie
                  data={donutData}
                  cx={85}
                  cy={85}
                  innerRadius={55}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-lg font-bold ${totalNet >= 0 ? "text-success" : "text-danger"}`}>
                  {ccyFmt(totalNet)}
                </span>
                <span className="text-[10px] text-fg-subtle">Total</span>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-fg">{ccyFmt(swaps)}</div>
                <div className="text-[10px] text-fg-subtle">Swaps</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-fg">{ccyFmt(commissions)}</div>
                <div className="text-[10px] text-fg-subtle">Commissions</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-fg">{ccyFmt(dividends)}</div>
                <div className="text-[10px] text-fg-subtle">Dividends</div>
              </div>
            </div>
          </div>

          {/* Middle column: Sharpe, Profit Factor, Recovery Factor */}
          <div className="space-y-4">
            <GaugeBar
              label="Sharpe Ratio"
              value={stats.sharpeRatio}
              min={-1}
              max={5}
              displayValue={fmtNum(stats.sharpeRatio)}
              colour={stats.sharpeRatio >= 1 ? "green" : stats.sharpeRatio >= 0 ? "amber" : "red"}
            />
            <GaugeBar
              label="Profit Factor"
              value={stats.profitFactor}
              min={0}
              max={4}
              displayValue={fmtNum(stats.profitFactor)}
              colour={stats.profitFactor >= 1.5 ? "green" : stats.profitFactor >= 1 ? "amber" : "red"}
            />
            <GaugeBar
              label="Recovery Factor"
              value={stats.recoveryFactor}
              min={0}
              max={7}
              displayValue={fmtNum(stats.recoveryFactor)}
              colour={stats.recoveryFactor >= 2 ? "green" : stats.recoveryFactor >= 1 ? "amber" : "red"}
            />
          </div>

          {/* Right column: Max DD, Deposit Load, Trades/wk, Avg Hold */}
          <div className="space-y-4">
            <GaugeBar
              label="Max. Drawdown"
              value={stats.maximalDrawdownPct}
              min={0}
              max={200}
              displayValue={`${fmtNum(stats.maximalDrawdownPct)}%`}
              colour={stats.maximalDrawdownPct <= 10 ? "green" : stats.maximalDrawdownPct <= 30 ? "amber" : "red"}
            />
            <GaugeBar
              label="Max. Deposit Load"
              value={stats.relativeDrawdownPct}
              min={0}
              max={200}
              displayValue={`${fmtNum(stats.relativeDrawdownPct)}%`}
              colour={stats.relativeDrawdownPct <= 20 ? "green" : stats.relativeDrawdownPct <= 50 ? "amber" : "red"}
            />
            <div className="grid grid-cols-2 gap-3">
              <GaugeBar
                label="Trades per Week"
                value={tradesPerWeek}
                min={0}
                max={86}
                displayValue={fmtNum(tradesPerWeek, 0)}
                colour="green"
              />
              <GaugeBar
                label="Average Hold Time"
                value={stats.avgHoldSeconds}
                min={0}
                max={86400}
                displayValue={fmtDuration(stats.avgHoldSeconds)}
                colour="green"
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// -- MT5-style metric row -------------------------------------------------

function MetricRow({ cells }: { cells: Array<{ label: string; value: string; cls?: string }> }) {
  return (
    <tr className="border-b border-line hover:bg-bg-soft/50">
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
  return <tr><td colSpan={3} className="h-1.5 border-b border-line" /></tr>;
}

// -- Trade breakdown row --------------------------------------------------

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
    <tr className="border-b border-line hover:bg-bg-soft/50">
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

// -- Component ------------------------------------------------------------

export function DeepStats({ trades, fmt: ccyFmt }: { trades: TradeRow[]; fmt: CcyFmt }) {
  const stats = useMemo(() => computeDeepStats(trades), [trades]);
  const hourly = useMemo(() => bucketsByHour(trades), [trades]);
  const weekday = useMemo(() => bucketsByWeekday(trades), [trades]);
  const monthly = useMemo(() => bucketsByMonth(trades), [trades]);

  return (
    <div className="space-y-4">
      {/* Visual summary header: donut + gauges */}
      <VisualSummary stats={stats} trades={trades} ccyFmt={ccyFmt} />

      {/* Summary metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy report</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full">
            <tbody>
              <MetricRow cells={[
                { label: "Gross Profit", value: ccyFmt(stats.grossProfit) ?? "", cls: "text-success" },
                { label: "Maximal Drawdown", value: `${ccyFmt(stats.maximalDrawdown)} (${fmtNum(stats.maximalDrawdownPct)}%)`, cls: "text-danger" },
                { label: "Total Net Profit", value: ccyFmt(stats.totalNetProfit) ?? "", cls: stats.totalNetProfit >= 0 ? "text-success" : "text-danger" }
              ]} />
              <MetricRow cells={[
                { label: "Gross Loss", value: ccyFmt(-stats.grossLoss) ?? "", cls: "text-danger" },
                { label: "Relative Drawdown", value: `${fmtNum(stats.relativeDrawdownPct)}% (${ccyFmt(stats.relativeDrawdown)})`, cls: "text-danger" },
                { label: "Absolute Drawdown", value: ccyFmt(stats.absoluteDrawdown) ?? "", cls: "text-danger" }
              ]} />

              <SectionBreak />

              <MetricRow cells={[
                { label: "Profit Factor", value: fmtNum(stats.profitFactor) },
                { label: "Expected Payoff", value: ccyFmt(stats.expectedPayoff) ?? "" },
                { label: "Sharpe Ratio", value: fmtNum(stats.sharpeRatio) }
              ]} />
              <MetricRow cells={[
                { label: "Recovery Factor", value: fmtNum(stats.recoveryFactor) },
                { label: "Avg Hold Time", value: fmtDuration(stats.avgHoldSeconds) },
                { label: "Win Rate", value: `${fmtNum(stats.winRate, 1)}%` }
              ]} />

              <SectionBreak />

              <MetricRow cells={[
                { label: "Total Trades", value: String(stats.totalTrades) },
                { label: "Short Trades (Won %)", value: `${stats.shortCount} (${fmtNum(stats.shortWinPct, 1)}%)` },
                { label: "Long Trades (Won %)", value: `${stats.longCount} (${fmtNum(stats.longWinPct, 1)}%)` }
              ]} />
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Trade breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Trade statistics</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-line bg-bg-soft/50">
                <td className="px-3 py-1.5 text-xs font-semibold">Total Deals</td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="font-semibold">Profit Trades (% of total)</span>
                    <span className="font-mono tabular-nums text-success">{stats.winCount} ({fmtNum(stats.winRate, 2)}%)</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="font-semibold">Loss Trades (% of total)</span>
                    <span className="font-mono tabular-nums text-danger">{stats.lossCount} ({fmtNum(stats.lossRate, 2)}%)</span>
                  </div>
                </td>
              </tr>

              <BreakdownRow
                label="Largest"
                winLabel="profit trade" winValue={ccyFmt(stats.largestWin) ?? ""} winCls="text-success"
                lossLabel="loss trade" lossValue={ccyFmt(stats.largestLoss) ?? ""} lossCls="text-danger"
              />
              <BreakdownRow
                label="Average"
                winLabel="profit trade" winValue={ccyFmt(stats.avgWin) ?? ""} winCls="text-success"
                lossLabel="loss trade" lossValue={ccyFmt(stats.avgLoss) ?? ""} lossCls="text-danger"
              />
              <BreakdownRow
                label="Maximum"
                winLabel="consecutive wins ($)"
                winValue={`${stats.maxConsecWins} (${ccyFmt(stats.maxConsecWinAmount)})`}
                lossLabel="consecutive losses"
                lossValue={`${stats.maxConsecLosses} (${ccyFmt(stats.maxConsecLossAmount)})`}
                lossCls="text-danger"
              />
              <BreakdownRow
                label="Average"
                winLabel="consecutive wins"
                winValue={fmtNum(stats.avgConsecWins, 1)}
                lossLabel="consecutive losses"
                lossValue={fmtNum(stats.avgConsecLosses, 1)}
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

      {/* Entry distribution charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <EntryChart title="Entries by hours" data={hourly} ccyFmt={ccyFmt} />
        <EntryChart title="Entries by weekdays" data={weekday} ccyFmt={ccyFmt} />
        <EntryChart title="Entries by months" data={monthly} ccyFmt={ccyFmt} />
      </div>

      {/* Profit/loss charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PnlChart title="Profits and losses by hours" data={hourly} ccyFmt={ccyFmt} />
        <PnlChart title="Profits and losses by weekdays" data={weekday} ccyFmt={ccyFmt} />
        <PnlChart title="Profits and losses by months" data={monthly} ccyFmt={ccyFmt} />
      </div>
    </div>
  );
}

// -- Entry distribution bar chart -----------------------------------------

function EntryChart({ title, data, ccyFmt }: { title: string; data: BucketEntry[]; ccyFmt: CcyFmt }) {
  const mapped = data.map((d) => ({ ...d, short: shortLabel(d.label) }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-xs">{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mapped} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis dataKey="short" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={40} tickFormatter={(v: number) => fmtNum(v, 0)} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ fontSize: 11 }}
              formatter={(value: number, name: string) => {
                if (name === "Entries") return [fmtNum(value, 0), name];
                return [ccyFmt(value), name];
              }}
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

// -- Profit/loss grouped bar chart ----------------------------------------

function PnlChart({ title, data, ccyFmt }: { title: string; data: BucketEntry[]; ccyFmt: CcyFmt }) {
  const mapped = data.map((d) => ({ ...d, short: shortLabel(d.label) }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-xs">{title}</CardTitle></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mapped} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis dataKey="short" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={40} tickFormatter={(v: number) => fmtNum(v, 0)} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ fontSize: 11 }}
              formatter={(value: number, name: string) => [ccyFmt(value), name]}
              labelFormatter={(_, payload) => {
                const entry = payload?.[0]?.payload as BucketEntry | undefined;
                return entry?.label ?? "";
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="winPnl" name="Profit" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="lossPnl" name="Loss" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
