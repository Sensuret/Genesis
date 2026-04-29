"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/page-header";
import { useTrades } from "@/lib/hooks/use-trades";
import {
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

export default function DashboardPage() {
  const { trades, loading } = useTrades();

  if (loading) return <div className="text-sm text-fg-muted">Loading dashboard…</div>;

  const parts = computeGsScoreParts(trades);
  const score = gsScore(parts);
  const equity = equityCurve(trades);
  const byPair = performanceBy(trades, "pair").slice(0, 8);
  const bySetup = performanceBy(trades, "setup_tag").slice(0, 8);
  const byMistake = performanceBy(trades, "mistake_tag").slice(0, 8);
  const daily = dailyPnl(trades).slice(-30);

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

      {!trades.length ? (
        <Empty
          title="No trades yet"
          description="Import a CSV/XLSX or add a trade manually to populate your dashboard."
          action={
            <Link href="/add-trade">
              <Button>Add your first trade</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Stat label="Net P&L" value={netPnl(trades)} format="currency" positive={netPnl(trades) >= 0} />
            <Stat label="Trade win %" value={winRate(trades)} format="percent" />
            <Stat label="Profit factor" value={profitFactor(trades)} format="number" />
            <Stat label="Max drawdown" value={maxDrawdown(trades)} format="currency" positive={false} />
            <Stat label="Recovery factor" value={recoveryFactor(trades)} format="number" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Commissions" value={totalCommissions(trades)} format="currency" />
            <Stat label="Spreads paid" value={totalSpread(trades)} format="currency" />
            <Stat label="Trades" value={trades.length} format="number" />
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
                <RDistributionChart trades={trades} />
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
