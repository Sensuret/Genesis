"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/page-header";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  applyAllFilters,
  avgLoss,
  avgWin,
  avgWinLoss,
  computeGsScoreParts,
  currentDayStreak,
  dailyPnl,
  equityCurve,
  gsScore,
  losers,
  netPnl,
  performanceBy,
  profitFactor,
  recoveryFactor,
  tpBeSl,
  totalLotSize,
  winners,
  winRate
} from "@/lib/analytics";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { PerfBar } from "@/components/charts/perf-bar";
import { RDistributionChart } from "@/components/charts/r-distribution";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { MoonWidget } from "@/components/moon-widget";
import { TradeCalendar } from "@/components/trade-calendar";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { useFilters, useMoney } from "@/lib/filters/store";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { trades, files, loading } = useTrades();
  const { filters } = useFilters();

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  // Heavy computations — memoised so 10k+ trades don't recompute on every render.
  const parts = useMemo(() => computeGsScoreParts(filtered), [filtered]);
  const score = useMemo(() => gsScore(parts), [parts]);
  const equity = useMemo(() => equityCurve(filtered), [filtered]);
  const byPair = useMemo(() => performanceBy(filtered, "pair").slice(0, 8), [filtered]);
  const bySetup = useMemo(() => performanceBy(filtered, "setup_tag").slice(0, 8), [filtered]);
  const byMistake = useMemo(() => performanceBy(filtered, "mistake_tag").slice(0, 8), [filtered]);
  const daily = useMemo(() => dailyPnl(filtered).slice(-30), [filtered]);
  const breakdown = useMemo(() => tpBeSl(filtered), [filtered]);
  const streak = useMemo(() => currentDayStreak(filtered), [filtered]);
  const stats = useMemo(
    () => ({
      net: netPnl(filtered),
      win: winRate(filtered),
      pf: profitFactor(filtered),
      rf: recoveryFactor(filtered),
      avgWl: avgWinLoss(filtered),
      avgW: avgWin(filtered),
      avgL: avgLoss(filtered),
      lots: totalLotSize(filtered),
      winsCount: winners(filtered).length,
      lossCount: losers(filtered).length
    }),
    [filtered]
  );

  if (loading) return <div className="text-sm text-fg-muted">Loading dashboard…</div>;

  // No data → empty state. We deliberately do NOT fall back to mock/demo
  // numbers if the user clears their filters or has no accounts.
  if (!trades.length || !files.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={
            <Link href="/add-trade">
              <Button><Plus className="h-4 w-4" /> Add Trade</Button>
            </Link>
          }
        />
        <Empty
          title="No trades yet"
          description="Import a CSV/XLSX or add a trade manually to populate your dashboard."
          action={
            <Link href="/add-trade">
              <Button>Add your first trade</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={
            <Link href="/add-trade">
              <Button><Plus className="h-4 w-4" /> Add Trade</Button>
            </Link>
          }
        />
        <Empty
          title="No trades match the current filters"
          description="Try widening the date range or clearing account filters in the top bar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          <Link href="/add-trade">
            <Button><Plus className="h-4 w-4" /> Add Trade</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Net P&L"
          value={stats.net}
          format="currency"
          positive={stats.net >= 0}
          hint={`${filtered.length} trade${filtered.length === 1 ? "" : "s"}`}
        />
        <WinRateStat
          winRate={stats.win}
          tp={breakdown.tp}
          be={breakdown.be}
          sl={breakdown.sl}
        />
        <AvgWinLossStat avgWl={stats.avgWl} avgW={stats.avgW} avgL={stats.avgL} />
        <Stat
          label="Profit factor"
          value={stats.pf}
          format="number"
          positive={stats.pf >= 1}
          hint={`Recovery factor ${formatNumber(stats.rf, 2)}`}
        />
        <CurrentStreakStat
          type={streak.type}
          days={streak.days}
          trades={streak.trades}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Daily net cumulative P&L</CardTitle>
          </CardHeader>
          <CardBody>
            <EquityCurveChart data={equity} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Trade calendar</CardTitle>
          </CardHeader>
          <CardBody>
            <TradeCalendar trades={filtered} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>GS Score</CardTitle>
          </CardHeader>
          <CardBody>
            <GsScoreRadar parts={parts} score={score} />
          </CardBody>
        </Card>
        <div className="lg:col-span-7">
          <MoonWidget />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Net daily P&L (last 30)</CardTitle>
          </CardHeader>
          <CardBody>
            <DailyPnlChart data={daily} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>R:R distribution</CardTitle>
          </CardHeader>
          <CardBody>
            <RDistributionChart trades={filtered} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by pair</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={byPair} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance by setup</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={bySetup} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by mistake</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={byMistake} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Volume traded</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3">
            <MiniStat label="Lot size (total)" value={formatNumber(stats.lots, 2)} />
            <MiniStat label="Wins" value={String(stats.winsCount)} accent="success" />
            <MiniStat label="Losses" value={String(stats.lossCount)} accent="danger" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function WinRateStat({
  winRate,
  tp,
  be,
  sl
}: {
  winRate: number;
  tp: number;
  be: number;
  sl: number;
}) {
  return (
    <Card className="p-5">
      <div className="mb-1 text-xs font-medium text-fg-muted">Trade win %</div>
      <div className="text-2xl font-semibold tracking-tight text-fg">{winRate.toFixed(2)}%</div>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className="rounded-md bg-success/15 px-2 py-0.5 text-success">{tp} W</span>
        <span className="rounded-md bg-fg-muted/15 px-2 py-0.5 text-fg-muted">{be} BE</span>
        <span className="rounded-md bg-danger/15 px-2 py-0.5 text-danger">{sl} L</span>
      </div>
    </Card>
  );
}

function AvgWinLossStat({
  avgWl,
  avgW,
  avgL
}: {
  avgWl: number;
  avgW: number;
  avgL: number;
}) {
  const { fmt } = useMoney();
  return (
    <Card className="p-5">
      <div className="mb-1 text-xs font-medium text-fg-muted">Avg win/loss trade</div>
      <div className="text-2xl font-semibold tracking-tight text-fg">{formatNumber(avgWl, 2)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md bg-success/15 px-2 py-0.5 text-success">{fmt(avgW)}</div>
        <div className="rounded-md bg-danger/15 px-2 py-0.5 text-danger">{fmt(avgL)}</div>
      </div>
    </Card>
  );
}

function CurrentStreakStat({
  type,
  days,
  trades
}: {
  type: "win" | "loss" | null;
  days: number;
  trades: number;
}) {
  const positive = type === "win";
  return (
    <Card className="p-5">
      <div className="mb-1 text-xs font-medium text-fg-muted">Current streak</div>
      {type === null ? (
        <div className="text-2xl font-semibold tracking-tight text-fg-muted">—</div>
      ) : (
        <div className={`text-2xl font-semibold tracking-tight ${positive ? "text-success" : "text-danger"}`}>
          {days} day{days === 1 ? "" : "s"} {positive ? "▲" : "▼"}
        </div>
      )}
      <div className="mt-3 text-[11px] text-fg-muted">
        {trades} trade{trades === 1 ? "" : "s"} in run
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: "success" | "danger";
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div
        className={`mt-1 text-base font-semibold ${accent === "success" ? "text-success" : accent === "danger" ? "text-danger" : "text-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}
