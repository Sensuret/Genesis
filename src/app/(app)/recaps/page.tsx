"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  netPnl, profitFactor, winRate, maxDrawdown,
  totalCommissions, totalSpread, performanceBy, dailyPnl
} from "@/lib/analytics";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { PerfBar } from "@/components/charts/perf-bar";
import { GaugeRing } from "@/components/widgets/gauge";
import { KpiCard } from "@/components/widgets/kpi-card";
import { CalendarGrid } from "@/components/widgets/calendar-grid";
import { MoonWidget } from "@/components/moon-widget";
import { useAppState, convertFromUSD } from "@/components/app-context";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TABS = ["Week", "Month", "Quarter", "Year"] as const;
type Period = (typeof TABS)[number];

export default function RecapsPage() {
  const [period, setPeriod] = useState<Period>("Week");
  // anchor is a date inside the currently selected period
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const range = useMemo(() => buildRange(period, anchor), [period, anchor]);
  const label = useMemo(() => buildLabel(period, anchor), [period, anchor]);

  const { trades, loading } = useTrades();
  const { currency } = useAppState();

  const subset = useMemo(
    () =>
      trades.filter((t) => {
        if (!t.trade_date) return false;
        return t.trade_date >= range.from && t.trade_date <= range.to;
      }),
    [trades, range]
  );

  function shift(direction: -1 | 1) {
    const d = new Date(anchor);
    if (period === "Week") d.setUTCDate(d.getUTCDate() + 7 * direction);
    else if (period === "Month") d.setUTCMonth(d.getUTCMonth() + direction);
    else if (period === "Quarter") d.setUTCMonth(d.getUTCMonth() + 3 * direction);
    else if (period === "Year") d.setUTCFullYear(d.getUTCFullYear() + direction);
    setAnchor(d);
  }

  const fxValue = (n: number) => formatCurrency(convertFromUSD(n, currency), currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recaps"
        description="Zoom in on your edge — by week, month, quarter or year. Use the arrows to step through history."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-bg-soft p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPeriod(t)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-medium transition",
                period === t ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto inline-flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] rounded-xl border border-line bg-bg-soft px-3 py-1.5 text-center text-sm font-medium tabular text-fg">
            {label}
          </div>
          <Button variant="secondary" size="sm" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-fg-muted">Loading…</div>
      ) : !subset.length ? (
        <Empty
          title={`No trades for this ${period.toLowerCase()}`}
          description={`Window: ${range.from} → ${range.to}`}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Net P&L"
              value={fxValue(netPnl(subset))}
              hint={`${subset.length} trades`}
              tone={netPnl(subset) >= 0 ? "good" : "bad"}
            />
            <KpiCard
              title="Win rate"
              value={`${winRate(subset).toFixed(1)}%`}
              visual={<GaugeRing value={winRate(subset)} max={100} format="percent" />}
            />
            <KpiCard
              title="Profit factor"
              value={profitFactor(subset).toFixed(2)}
              visual={<GaugeRing value={Math.min(profitFactor(subset), 3)} max={3} format="x" />}
            />
            <KpiCard title="Max drawdown" value={fxValue(maxDrawdown(subset))} tone="bad" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Commissions" value={fxValue(totalCommissions(subset))} />
            <KpiCard title="Spread" value={fxValue(totalSpread(subset))} />
            <KpiCard
              title="Net costs"
              value={fxValue(totalCommissions(subset) + totalSpread(subset))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 card-elev">
              <CardHeader><CardTitle>Daily P&L</CardTitle></CardHeader>
              <CardBody><DailyPnlChart data={dailyPnl(subset)} /></CardBody>
            </Card>
            <MoonWidget />
          </div>

          {(period === "Month" || period === "Week") && (
            <Card className="card-elev">
              <CardHeader><CardTitle>Calendar</CardTitle></CardHeader>
              <CardBody>
                <CalendarGrid
                  trades={subset}
                  year={anchor.getUTCFullYear()}
                  month={anchor.getUTCMonth()}
                />
              </CardBody>
            </Card>
          )}

          {period === "Quarter" && (
            <Card className="card-elev">
              <CardHeader><CardTitle>3-month calendar</CardTitle></CardHeader>
              <CardBody className="grid gap-4 md:grid-cols-3">
                {monthsInQuarter(anchor).map((m) => (
                  <div key={m.toISOString()}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      {m.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </div>
                    <CalendarGrid
                      trades={trades}
                      year={m.getUTCFullYear()}
                      month={m.getUTCMonth()}
                      dense
                    />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {period === "Year" && (
            <Card className="card-elev">
              <CardHeader>
                <CardTitle>12-month calendar</CardTitle>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {monthsInYear(anchor).map((m) => (
                  <div key={m.toISOString()}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      {m.toLocaleDateString(undefined, { month: "short" })}
                    </div>
                    <CalendarGrid
                      trades={trades}
                      year={m.getUTCFullYear()}
                      month={m.getUTCMonth()}
                      dense
                    />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="card-elev">
              <CardHeader><CardTitle>By pair</CardTitle></CardHeader>
              <CardBody><PerfBar data={performanceBy(subset, "pair").slice(0, 8)} /></CardBody>
            </Card>
            <Card className="card-elev">
              <CardHeader><CardTitle>By setup</CardTitle></CardHeader>
              <CardBody><PerfBar data={performanceBy(subset, "setup_tag").slice(0, 8)} /></CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function buildRange(period: Period, anchor: Date): { from: string; to: string } {
  let from = new Date(anchor);
  let to = new Date(anchor);
  if (period === "Week") {
    const day = anchor.getUTCDay();
    from.setUTCDate(anchor.getUTCDate() - day);
    to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
  } else if (period === "Month") {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  } else if (period === "Quarter") {
    const q = Math.floor(anchor.getUTCMonth() / 3);
    from = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3, 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + 3, 0));
  } else {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), 11, 31));
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function buildLabel(period: Period, anchor: Date): string {
  if (period === "Week") {
    const r = buildRange("Week", anchor);
    return `${r.from} → ${r.to}`;
  }
  if (period === "Month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (period === "Quarter") {
    const q = Math.floor(anchor.getUTCMonth() / 3) + 1;
    return `Q${q} · ${anchor.getUTCFullYear()}`;
  }
  return `${anchor.getUTCFullYear()}`;
}

function monthsInQuarter(anchor: Date): Date[] {
  const q = Math.floor(anchor.getUTCMonth() / 3);
  return [0, 1, 2].map((i) => new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + i, 1)));
}

function monthsInYear(anchor: Date): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(anchor.getUTCFullYear(), i, 1)));
}
