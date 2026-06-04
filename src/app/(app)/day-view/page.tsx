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
import { formatNumber, pnlColor, shortDate } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";
import { useLiveState } from "@/lib/hooks/use-live-state";

export default function DayViewPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { positions } = useLiveState();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const captureRef = useRef<HTMLDivElement>(null);

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
    <div className="space-y-6">
      <div data-screenshot-ignore="true">
        <PageHeader
          title="Day View"
          actions={
            <div className="flex items-center gap-2">
              <ScreenshotButton targetRef={captureRef} filename={`day-view-${date}`} label="Save day snapshot as PNG" />
              <DatePicker value={date} onChange={(next) => next && setDate(next)} max={new Date().toISOString().slice(0, 10)} />
            </div>
          }
        />
      </div>

      <div ref={captureRef} className="space-y-6">
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
              <TradeLogTable trades={today} balanceFallback={balanceFallback} hideOpenDate pageSize={null} editableTags />
            </CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs">
              <div className="text-fg-muted">
                Total R:R is the average planned risk-to-reward across the day, calculated from each trade&apos;s TP and SL levels.
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

          {/* Open trades overlay — live from EA */}
          {positions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Open trades (live)</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line text-fg-subtle">
                      <tr>
                        <th className="px-3 py-2">Symbol</th>
                        <th className="px-3 py-2">Side</th>
                        <th className="px-3 py-2 text-right">Lots</th>
                        <th className="px-3 py-2 text-right">Entry</th>
                        <th className="px-3 py-2 text-right">Current</th>
                        <th className="px-3 py-2 text-right">Floating P&L</th>
                        <th className="px-3 py-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p) => {
                        const openMs = p.open_time ? new Date(p.open_time).getTime() : 0;
                        const durationSec = openMs ? Math.max(0, (Date.now() - openMs) / 1000) : 0;
                        const dH = Math.floor(durationSec / 3600);
                        const dM = Math.floor((durationSec % 3600) / 60);
                        const durationStr = openMs ? `${dH}h ${dM}m` : "\u2014";
                        return (
                          <tr key={p.id} className="border-b border-line/50">
                            <td className="px-3 py-2 font-medium">{p.symbol ?? "\u2014"}</td>
                            <td className="px-3 py-2">{p.side ?? "\u2014"}</td>
                            <td className="px-3 py-2 text-right">{p.lot_size ?? "\u2014"}</td>
                            <td className="px-3 py-2 text-right">{p.entry ?? "\u2014"}</td>
                            <td className="px-3 py-2 text-right">{p.current_price ?? "\u2014"}</td>
                            <td className={`px-3 py-2 text-right font-medium ${pnlColor(p.floating_pnl)}`}>
                              {p.floating_pnl != null ? formatNumber(p.floating_pnl, 2) : "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-right text-fg-muted">{durationStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  );
}
