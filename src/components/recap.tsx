"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  netPnl, profitFactor, winRate, maxDrawdown, totalCommissions, totalSpread,
  performanceBy, dailyPnl
} from "@/lib/analytics";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { PerfBar } from "@/components/charts/perf-bar";
import { MoonWidget } from "@/components/moon-widget";
import { PageHeader } from "@/components/page-header";
import { useMemo } from "react";

export type RecapPeriod = "week" | "month" | "quarter" | "year";

const TITLES: Record<RecapPeriod, { title: string; description: string }> = {
  week: { title: "Weekly Recap", description: "This week's edge — net P&L, costs, and behavior." },
  month: { title: "Monthly Recap", description: "Zoom out: month-on-month performance, behavior and lunar context." },
  quarter: { title: "Quarterly Recap", description: "Quarter-level review of edge, drawdowns and consistency." },
  year: { title: "Annual Recap", description: "The full year — your story told in trades." }
};

export function Recap({ period }: { period: RecapPeriod }) {
  const { trades, loading } = useTrades();

  const range = useMemo(() => buildRange(period), [period]);
  const subset = useMemo(
    () =>
      trades.filter((t) => {
        if (!t.trade_date) return false;
        const d = t.trade_date;
        return d >= range.from && d <= range.to;
      }),
    [trades, range]
  );

  if (loading) return <div className="text-sm text-fg-muted">Loading…</div>;

  const meta = TITLES[period];
  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.title}
        description={`${meta.description}  ·  ${range.from} → ${range.to}`}
      />

      {!subset.length ? (
        <Empty title={`No trades this ${period}`} description={`Window: ${range.from} – ${range.to}`} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Stat label="Net P&L" value={netPnl(subset)} format="currency" positive={netPnl(subset) >= 0} />
            <Stat label="Trades" value={subset.length} />
            <Stat label="Win rate" value={winRate(subset)} format="percent" />
            <Stat label="Profit factor" value={profitFactor(subset)} format="number" />
            <Stat label="Max DD" value={maxDrawdown(subset)} format="currency" positive={false} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Commissions" value={totalCommissions(subset)} format="currency" />
            <Stat label="Spread" value={totalSpread(subset)} format="currency" />
            <Stat label="Net costs" value={totalCommissions(subset) + totalSpread(subset)} format="currency" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Daily P&L</CardTitle></CardHeader>
              <CardBody><DailyPnlChart data={dailyPnl(subset)} /></CardBody>
            </Card>
            <MoonWidget />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>By pair</CardTitle></CardHeader><CardBody><PerfBar data={performanceBy(subset, "pair").slice(0, 8)} /></CardBody></Card>
            <Card><CardHeader><CardTitle>By setup</CardTitle></CardHeader><CardBody><PerfBar data={performanceBy(subset, "setup_tag").slice(0, 8)} /></CardBody></Card>
          </div>
        </>
      )}
    </div>
  );
}

function buildRange(period: RecapPeriod): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  let to = new Date(now);
  if (period === "week") {
    const day = now.getUTCDay();
    from = new Date(now);
    from.setUTCDate(now.getUTCDate() - day);
  } else if (period === "month") {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (period === "quarter") {
    const q = Math.floor(now.getUTCMonth() / 3);
    from = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));
  } else {
    from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
