"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { useTrades } from "@/lib/hooks/use-trades";
import { totalPnl, winRate, profitFactor, totalCommissions, totalSpread, applyAllFilters, realisedRR } from "@/lib/analytics";
import { useFilters, useMoney } from "@/lib/filters/store";
import { MoonWidget } from "@/components/moon-widget";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day View"
        description="Every trade — and every emotion — from a single day."
        actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />}
      />

      {loading ? (
        <div className="text-sm text-fg-muted">Loading day…</div>
      ) : today.length === 0 ? (
        <Empty title={`No trades on ${shortDate(date)}`} description="Pick another day or import data." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <MoonWidget date={moonDate} />
            <Card className="lg:col-span-2 p-5">
              <div className="text-xs text-fg-muted">{shortDate(date)}</div>
              <div className="mt-1 text-sm text-fg-muted">Day-in-detail view. The moon widget shows the moon phase for this exact date.</div>
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
                    {["Pair", "Side", "Session", "P&L", "RR", "Setup", "Mistake", "Emotions", "Notes"].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {today.map((t) => (
                    <tr key={t.id} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2.5 font-medium">{t.pair ?? "—"}</td>
                      <td className="px-3 py-2.5">{t.side ? <Badge variant={t.side === "long" ? "success" : "danger"}>{t.side}</Badge> : "—"}</td>
                      <td className="px-3 py-2.5 text-fg-muted">{t.session ?? "—"}</td>
                      <td className={`px-3 py-2.5 font-medium ${pnlColor(t.pnl)}`}>{fmt(t.pnl)}</td>
                      <td className={`px-3 py-2.5 ${pnlColor(realisedRR(t) ?? t.result_r)}`}>{formatNumber(realisedRR(t) ?? t.result_r, 2)}</td>
                      <td className="px-3 py-2.5 text-fg-muted">{t.setup_tag ?? "—"}</td>
                      <td className="px-3 py-2.5 text-fg-muted">{t.mistake_tag ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(t.emotions ?? []).map((e) => <Badge key={e} variant="brand">{e}</Badge>)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs truncate text-fg-muted">{t.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
