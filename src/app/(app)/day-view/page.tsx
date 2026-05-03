"use client";

import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { Stat } from "@/components/ui/stat";
import { useTrades } from "@/lib/hooks/use-trades";
import { totalPnl, winRate, profitFactor, totalCommissions, totalSpread, applyAllFilters, realisedRR } from "@/lib/analytics";
import { useFilters } from "@/lib/filters/store";
import { MoonWidget } from "@/components/moon-widget";
import { IntradayEquityChart } from "@/components/charts/intraday-equity";
import { TradeLogTable } from "@/components/trades/trade-log-table";
import { formatNumber, shortDate } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";

export default function DayViewPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const pageRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);
  const today = useMemo(() => filtered.filter((t) => t.trade_date === date), [filtered, date]);
  const moonDate = useMemo(() => new Date(`${date}T12:00:00Z`), [date]);

  // Most recent observed account balance — used to compute Net ROI when a
  // trade row doesn't carry its own balance snapshot.
  const balanceFallback = useMemo<number | null>(() => {
    for (let i = trades.length - 1; i >= 0; i -= 1) {
      const b = trades[i].account_balance;
      if (typeof b === "number" && b > 0) return b;
    }
    return null;
  }, [trades]);

  const rrStats = useMemo(() => {
    const rrs = today.map(realisedRR).filter((x): x is number => x !== null && Number.isFinite(x));
    if (!rrs.length) return { count: 0, avg: null as number | null, total: null as number | null, best: null as number | null };
    const total = rrs.reduce((s, r) => s + r, 0);
    const avg = total / rrs.length;
    const best = Math.max(...rrs);
    return { count: rrs.length, avg, total, best };
  }, [today]);

  return (
    <div ref={pageRef} className="space-y-6">
      <PageHeader
        title="Day View"
        actions={
          <div className="flex items-center gap-2">
            <ScreenshotButton targetRef={pageRef} filename={`day-view-${date}`} label="Save day snapshot as PNG" />
            <DatePicker value={date} onChange={(next) => next && setDate(next)} max={new Date().toISOString().slice(0, 10)} />
          </div>
        }
      />

      {loading ? (
        <div className="text-sm text-fg-muted">Loading day…</div>
      ) : today.length === 0 ? (
        <Empty title={`No trades on ${shortDate(date)}`} description="Pick another day or import data." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <MoonWidget date={moonDate} />
            <Card className="lg:col-span-2 flex flex-col p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">Day&apos;s equity curve</div>
                <div className="text-xs text-fg-muted">{shortDate(date)}</div>
              </div>
              <div className="mt-3 flex-1">
                <IntradayEquityChart trades={today} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Stat label="Trades" value={today.length} />
            <Stat label="Net P&L" value={totalPnl(today)} format="currency" positive={totalPnl(today) >= 0} />
            <Stat label="Win rate" value={winRate(today)} format="percent" />
            <Stat label="Profit factor" value={profitFactor(today)} format="number" />
            <Stat label="Costs" value={totalCommissions(today) + totalSpread(today)} format="currency" />
          </div>

          <Card>
            <CardHeader><CardTitle>Trades</CardTitle></CardHeader>
            <CardBody className="p-0">
              <TradeLogTable trades={today} balanceFallback={balanceFallback} hideOpenDate pageSize={null} />
            </CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs">
              <div className="text-fg-muted">
                Total R:R is the average planned reward-to-risk across the day, calculated from each trade&apos;s TP and SL levels.
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Avg R:R</div>
                  <div className="text-sm font-semibold">
                    {rrStats.avg === null ? "—" : `1:${formatNumber(rrStats.avg, 2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Best R:R</div>
                  <div className="text-sm font-semibold">
                    {rrStats.best === null ? "—" : `1:${formatNumber(rrStats.best, 2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Total R:R</div>
                  <div className="text-sm font-semibold">
                    {rrStats.total === null ? "—" : `${formatNumber(rrStats.total, 2)}R`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Trades w/ R:R</div>
                  <div className="text-sm font-semibold">{rrStats.count} / {today.length}</div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
