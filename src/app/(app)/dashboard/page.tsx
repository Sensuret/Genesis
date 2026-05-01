"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/page-header";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  applyAllFilters,
  computeGsScoreParts, equityCurve, gsScore, netPnl, profitFactor, totalCommissions,
  totalSpread, winRate, maxDrawdown, performanceBy, dailyPnl, recoveryFactor
} from "@/lib/analytics";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { PerfBar } from "@/components/charts/perf-bar";
import { RDistributionChart } from "@/components/charts/r-distribution";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { MoonWidget } from "@/components/moon-widget";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useFilters } from "@/lib/filters/store";

export default function DashboardPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  // Memoise heavy computations so 10k+ trades don't recompute on every re-render.
  const parts = useMemo(() => computeGsScoreParts(filtered), [filtered]);
  const score = useMemo(() => gsScore(parts), [parts]);
  const equity = useMemo(() => equityCurve(filtered), [filtered]);
  const byPair = useMemo(() => performanceBy(filtered, "pair").slice(0, 8), [filtered]);
  const bySetup = useMemo(() => performanceBy(filtered, "setup_tag").slice(0, 8), [filtered]);
  const byMistake = useMemo(() => performanceBy(filtered, "mistake_tag").slice(0, 8), [filtered]);
  const daily = useMemo(() => dailyPnl(filtered).slice(-30), [filtered]);
  const stats = useMemo(
    () => ({
      net: netPnl(filtered),
      win: winRate(filtered),
      pf: profitFactor(filtered),
      dd: maxDrawdown(filtered),
      rf: recoveryFactor(filtered),
      comm: totalCommissions(filtered),
      spread: totalSpread(filtered)
    }),
    [filtered]
  );

  if (loading) return <div className="text-sm text-fg-muted">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your edge at a glance — analytics, behavior, and the moon."
        actions={
          <Link href="/add-trade">
            <Button><Plus className="h-4 w-4" /> Add Trade</Button>
          </Link>
        }
      />

      {!filtered.length ? (
        <Empty
          title={trades.length ? "No trades match the current filters" : "No trades yet"}
          description={trades.length ? "Try widening the date range or clearing account filters in the top bar." : "Import a CSV/XLSX or add a trade manually to populate your dashboard."}
          action={
            <Link href="/add-trade">
              <Button>{trades.length ? "Add another trade" : "Add your first trade"}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Stat label="Net P&L" value={stats.net} format="currency" positive={stats.net >= 0} />
            <Stat label="Trade win %" value={stats.win} format="percent" />
            <Stat label="Profit factor" value={stats.pf} format="number" />
            <Stat label="Max drawdown" value={stats.dd} format="currency" positive={false} />
            <Stat label="Recovery factor" value={stats.rf} format="number" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Commissions" value={stats.comm} format="currency" />
            <Stat label="Spreads paid" value={stats.spread} format="currency" />
            <Stat label="Trades" value={filtered.length} format="number" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily net cumulative P&L</CardTitle>
              </CardHeader>
              <CardBody>
                <EquityCurveChart data={equity} />
              </CardBody>
            </Card>
            <MoonWidget />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>GS Score</CardTitle>
              </CardHeader>
              <CardBody>
                <GsScoreRadar parts={parts} score={score} />
              </CardBody>
            </Card>
            <Card className="lg:col-span-2">
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
                <CardTitle>Net daily P&L (last 30)</CardTitle>
              </CardHeader>
              <CardBody>
                <DailyPnlChart data={daily} />
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
        </>
      )}
    </div>
  );
}
