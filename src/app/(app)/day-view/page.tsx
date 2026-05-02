"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { useTrades } from "@/lib/hooks/use-trades";
import { totalPnl, winRate, profitFactor, totalCommissions, totalSpread, applyAllFilters, realisedRR } from "@/lib/analytics";
import { useFilters, useMoney } from "@/lib/filters/store";
import { MoonWidget } from "@/components/moon-widget";
import { IntradayEquityChart } from "@/components/charts/intraday-equity";
import { formatNumber, pnlColor, shortDate } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";

export default function DayViewPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);
  const today = useMemo(() => filtered.filter((t) => t.trade_date === date), [filtered, date]);
  const moonDate = useMemo(() => new Date(`${date}T12:00:00Z`), [date]);

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
      <PageHeader
        title="Day View"
        actions={<DatePicker value={date} onChange={(next) => next && setDate(next)} max={new Date().toISOString().slice(0, 10)} />}
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
            <CardBody className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-fg-subtle">
                  <tr>
                    {["Pair", "Side", "Session", "P&L", "R:R", "Setup", "Mistake", "Emotions", "Notes"].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {today.map((t) => {
                    const rr = realisedRR(t);
                    return (
                      <tr key={t.id} className="border-b border-line/50 last:border-0">
                        <td className="px-3 py-2.5 font-medium">{t.pair ?? "—"}</td>
                        <td className="px-3 py-2.5">{t.side ? <Badge variant={t.side === "long" ? "success" : "danger"}>{t.side}</Badge> : "—"}</td>
                        <td className="px-3 py-2.5 text-fg-muted">{t.session ?? "—"}</td>
                        <td className={`px-3 py-2.5 font-medium ${pnlColor(t.pnl)}`}>{fmt(t.pnl)}</td>
                        <td className="px-3 py-2.5">{rr === null ? <span className="text-fg-muted">—</span> : `1:${formatNumber(rr, 2)}`}</td>
                        <td className="px-3 py-2.5 text-fg-muted">{t.setup_tag ?? "—"}</td>
                        <td className="px-3 py-2.5 text-fg-muted">{t.mistake_tag ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(t.emotions ?? []).map((e) => <Badge key={e} variant="brand">{e}</Badge>)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 max-w-xs truncate text-fg-muted">{t.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
