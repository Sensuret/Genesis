"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { DayViewModal } from "@/components/day-view-modal";
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
  dailyEquityCurve,
  equityCurve,
  gsScore,
  losers,
  netPnl,
  performanceBy,
  performanceByEmotions,
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
import { formatNumber, pnlColor } from "@/lib/utils";
import { useFilters } from "@/lib/filters/store";
import { useLiveState } from "@/lib/hooks/use-live-state";
import { ProgressTracker } from "@/components/dashboard/progress-tracker";

export default function DashboardPage() {
  const { trades, files, loading } = useTrades();
  const { filters } = useFilters();
  const { snapshot: liveSnapshot } = useLiveState();

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  const fileBalance = useMemo(() => {
    let sum = 0;
    let any = false;
    for (const f of files) {
      if (f.account_balance != null) {
        sum += f.account_balance;
        any = true;
      }
    }
    return any ? sum : null;
  }, [files]);

  const parts = useMemo(() => computeGsScoreParts(filtered), [filtered]);
  const score = useMemo(() => gsScore(parts), [parts]);
  const equity = useMemo(() => dailyEquityCurve(filtered), [filtered]);
  const byPair = useMemo(() => performanceBy(filtered, "pair").slice(0, 8), [filtered]);
  const bySetup = useMemo(() => performanceBy(filtered, "setup_tag").slice(0, 8), [filtered]);
  const byEmotion = useMemo(() => performanceByEmotions(filtered).slice(0, 8), [filtered]);
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
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        extra={<MoonInline />}
        actions={
          <Link href="/add-trade">
            <Button><Plus className="h-4 w-4" /> Add Trade</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
          daysType={dayStreakNow.type}
          daysBestWin={dayStreakBest.winDays}
          daysBestLoss={dayStreakBest.lossDays}
          tradesCurrent={tradeStreakNow.trades}
          tradesType={tradeStreakNow.type}
          tradesBestWin={tradeStreakBest.winTrades}
          tradesBestLoss={tradeStreakBest.lossTrades}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col gap-3 lg:col-span-4">
          <DailyPnlCard data={equity} />
          <GsScoreCard parts={parts} score={score} />
        </div>
        <CalendarCard trades={filtered} fileBalance={fileBalance} />
      </div>

      {liveSnapshot && liveSnapshot.floating_pnl != null && (
        <Card>
          <CardBody className="flex items-center justify-between gap-4 py-3">
            <div className="text-xs font-medium text-fg-muted">Live floating P&L</div>
            <div className={`text-xl font-semibold tracking-tight ${pnlColor(liveSnapshot.floating_pnl)}`}>
              {formatNumber(liveSnapshot.floating_pnl, 2)}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Net daily P&L (last 30)</CardTitle>
          </CardHeader>
          <CardBody>
            <DailyPnlChart data={daily} />
          </CardBody>
        </Card>
        <div className="lg:col-span-4">
          <ProgressTracker trades={filtered} />
        </div>
      </div>

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
            <CardTitle>Performance by emotion</CardTitle>
          </CardHeader>
          <CardBody>
            <PerfBar data={byEmotion} />
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

function DailyPnlCard({ data }: { data: ReturnType<typeof equityCurve> }) {
  return (
    <Card className="flex flex-1 flex-col">
      <CardHeader className="px-4 py-3">
        <CardTitle>Daily net cumulative P&L</CardTitle>
      </CardHeader>
      <CardBody className="flex-1 px-3 pb-3">
        <div className="h-full min-h-[180px]">
          <EquityCurveChart data={data} height="h-full" />
        </div>
      </CardBody>
    </Card>
  );
}

function GsScoreCard({ parts, score }: { parts: Parameters<typeof gsScore>[0]; score: number }) {
  return (
    <Card className="flex flex-1 flex-col">
      <CardHeader className="px-4 py-3">
        <CardTitle>GS Score</CardTitle>
      </CardHeader>
      <CardBody className="flex-1 px-4 pb-4">
        <GsScoreRadar parts={parts} score={score} radarHeight="h-36" />
      </CardBody>
    </Card>
  );
}

function CalendarCard({
  trades,
  fileBalance
}: {
  trades: import("@/lib/supabase/types").TradeRow[];
  fileBalance: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const balanceFallback = (() => {
    for (let i = trades.length - 1; i >= 0; i -= 1) {
      const b = trades[i].account_balance;
      if (typeof b === "number" && b > 0) return b;
    }
    return null;
  })();
  return (
    <Card ref={ref} className="lg:col-span-8">
      <CardHeader className="px-4 py-3">
        <CardTitle>Trade calendar</CardTitle>
      </CardHeader>
      <CardBody className="px-4 pb-4">
        <TradeCalendar
          trades={trades}
          headerActions={<ScreenshotButton targetRef={ref} filename="trade-calendar" className="h-7 w-7" />}
          onDayClick={(iso) => setOpenDate(iso)}
        />
      </CardBody>
      {openDate && (
        <DayViewModal
          date={openDate}
          trades={trades}
          balanceFallback={balanceFallback}
          onClose={() => setOpenDate(null)}
        />
      )}
    </Card>
  );
}
