"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  computeGsScoreParts, equityCurve, gsScore, netPnl, profitFactor, totalCommissions,
  totalSpread, winRate, maxDrawdown, performanceBy, dailyPnl, recoveryFactor,
  avgWin, avgLoss
} from "@/lib/analytics";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { PerfBar } from "@/components/charts/perf-bar";
import { RDistributionChart } from "@/components/charts/r-distribution";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { MoonWidget } from "@/components/moon-widget";
import { GaugeRing } from "@/components/widgets/gauge";
import { AvgWinLoss } from "@/components/widgets/avg-win-loss";
import { KpiCard } from "@/components/widgets/kpi-card";
import { useAppState, convertFromUSD } from "@/components/app-context";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { trades, loading } = useTrades();
  const { currency } = useAppState();

  if (loading) return <div className="text-sm text-fg-muted">Loading dashboard…</div>;

  const parts = computeGsScoreParts(trades);
  const score = gsScore(parts);
  const equity = equityCurve(trades);
  const byPair = performanceBy(trades, "pair").slice(0, 8);
  const bySetup = performanceBy(trades, "setup_tag").slice(0, 8);
  const byMistake = performanceBy(trades, "mistake_tag").slice(0, 8);
  const daily = dailyPnl(trades).slice(-30);

  const wr = winRate(trades);
  const pf = profitFactor(trades);
  const np = netPnl(trades);
  const dd = maxDrawdown(trades);
  const rec = recoveryFactor(trades);
  const aW = avgWin(trades);
  const aL = avgLoss(trades);

  const fxValue = (n: number) => formatCurrency(convertFromUSD(n, currency), currency);

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
          {/* KPI strip — Tradezella-style with rings + dual circles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Net P&L"
              value={fxValue(np)}
              hint={`${trades.length} trades`}
              tone={np >= 0 ? "good" : "bad"}
            />
            <KpiCard
              title="Trade win %"
              value={`${wr.toFixed(1)}%`}
              hint="Closed positions"
              visual={<GaugeRing value={wr} max={100} label="" sublabel="" format="percent" tone="auto" />}
            />
            <KpiCard
              title="Profit factor"
              value={pf.toFixed(2)}
              hint={pf >= 1 ? "Gross gain ÷ gross loss" : "Below break-even"}
              visual={<GaugeRing value={Math.min(pf, 3)} max={3} format="x" tone="auto" />}
            />
            <KpiCard title="Avg W / L" value="" visual={<AvgWinLoss avgWin={aW} avgLoss={aL} />} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Max drawdown" value={fxValue(dd)} hint="Peak-to-trough" tone="bad" />
            <KpiCard title="Recovery factor" value={rec.toFixed(2)} hint="Net ÷ DD" />
            <KpiCard title="Commissions" value={fxValue(totalCommissions(trades))} />
            <KpiCard title="Spread paid" value={fxValue(totalSpread(trades))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 card-elev">
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
            <Card className="card-elev">
              <CardHeader>
                <CardTitle>GS Score</CardTitle>
              </CardHeader>
              <CardBody>
                <GsScoreRadar parts={parts} score={score} />
              </CardBody>
            </Card>
            <Card className="lg:col-span-2 card-elev">
              <CardHeader>
                <CardTitle>R:R distribution</CardTitle>
              </CardHeader>
              <CardBody>
                <RDistributionChart trades={trades} />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="card-elev">
              <CardHeader>
                <CardTitle>Net daily P&L (last 30)</CardTitle>
              </CardHeader>
              <CardBody>
                <DailyPnlChart data={daily} />
              </CardBody>
            </Card>
            <Card className="card-elev">
              <CardHeader>
                <CardTitle>Performance by pair</CardTitle>
              </CardHeader>
              <CardBody>
                <PerfBar data={byPair} />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="card-elev">
              <CardHeader>
                <CardTitle>Performance by setup</CardTitle>
              </CardHeader>
              <CardBody>
                <PerfBar data={bySetup} />
              </CardBody>
            </Card>
            <Card className="card-elev">
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
