"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  applyAllFilters,
  avgLoss,
  avgWin,
  avgWinLoss,
  bestDayStreak,
  bestTradeStreak,
  computeGsScoreParts,
  currentDayStreak,
  currentTradeStreak,
  dailyPnl,
  equityCurve,
  gsScore,
  losers,
  netPnl,
  performanceBy,
  profitFactor,
  tpBeSl,
  totalLotSize,
  winners,
  winRate
} from "@/lib/analytics";
import {
  AvgWinLossCard,
  CurrentStreakCard,
  NetPnlCard,
  ProfitFactorCard,
  WinRateCard
} from "@/components/dashboard/hero-stats";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { PerfBar } from "@/components/charts/perf-bar";
import { RDistributionChart } from "@/components/charts/r-distribution";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { MoonInline } from "@/components/moon-inline";
import { TradeCalendar } from "@/components/trade-calendar";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { useFilters } from "@/lib/filters/store";

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
  const dayStreakNow = useMemo(() => currentDayStreak(filtered), [filtered]);
  const dayStreakBest = useMemo(() => bestDayStreak(filtered), [filtered]);
  const tradeStreakNow = useMemo(() => currentTradeStreak(filtered), [filtered]);
  const tradeStreakBest = useMemo(() => bestTradeStreak(filtered), [filtered]);
  const stats = useMemo(
    () => ({
      net: netPnl(filtered),
      win: winRate(filtered),
      pf: profitFactor(filtered),
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

  // Best-streak metrics for the secondary badge on the streak card —
  // current streak's matching "best" sits next to it.
  const dayBestForType =
    dayStreakNow.type === "win"
      ? dayStreakBest.winDays
      : dayStreakNow.type === "loss"
        ? dayStreakBest.lossDays
        : Math.max(dayStreakBest.winDays, dayStreakBest.lossDays);
  const tradeBestForType =
    tradeStreakNow.type === "win"
      ? tradeStreakBest.winTrades
      : tradeStreakNow.type === "loss"
        ? tradeStreakBest.lossTrades
        : Math.max(tradeStreakBest.winTrades, tradeStreakBest.lossTrades);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        extra={<MoonInline />}
        actions={
          <Link href="/add-trade">
            <Button><Plus className="h-4 w-4" /> Add Trade</Button>
          </Link>
        }
      />

      {/* Hero row — 5 stat cards mirroring the TradeZella reference. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <NetPnlCard value={stats.net} tradeCount={filtered.length} />
        <WinRateCard
          winRate={stats.win}
          wins={breakdown.tp}
          breakeven={breakdown.be}
          losses={breakdown.sl}
        />
        <AvgWinLossCard
          ratio={stats.avgWl}
          avgWin={stats.avgW}
          avgLoss={stats.avgL}
        />
        <ProfitFactorCard value={stats.pf} />
        <CurrentStreakCard
          daysCurrent={dayStreakNow.days}
          daysBest={dayBestForType}
          daysType={dayStreakNow.type}
          tradesCurrent={tradeStreakNow.trades}
          tradesBest={tradeBestForType}
          tradesType={tradeStreakNow.type}
        />
      </div>

      {/* Equity curve (left, 4 cols) + Trade calendar (right, 8 cols). */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Daily net cumulative P&L</CardTitle>
          </CardHeader>
          <CardBody>
            <EquityCurveChart data={equity} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Trade calendar</CardTitle>
          </CardHeader>
          <CardBody>
            <TradeCalendar trades={filtered} />
          </CardBody>
        </Card>
      </div>

      {/* GS score (left) + Net daily P&L bar chart (right). */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>GS Score</CardTitle>
          </CardHeader>
          <CardBody>
            <GsScoreRadar parts={parts} score={score} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Net daily P&L (last 30)</CardTitle>
          </CardHeader>
          <CardBody>
            <DailyPnlChart data={daily} />
          </CardBody>
        </Card>
      </div>

      {/* R:R distribution + Performance breakdowns. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>R:R distribution</CardTitle>
          </CardHeader>
          <CardBody>
            <RDistributionChart trades={filtered} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance by pair</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={byPair} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by setup</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={bySetup} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance by mistake</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={byMistake} />
          </CardBody>
        </Card>
      </div>

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
  const color = accent === "success" ? "text-success" : accent === "danger" ? "text-danger" : "text-fg";
  return (
    <div>
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-xl font-semibold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
