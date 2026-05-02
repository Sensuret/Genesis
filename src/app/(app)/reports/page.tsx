"use client";

import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { Stat } from "@/components/ui/stat";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  applyAllFilters,
  performanceBy,
  totalCommissions,
  totalSpread,
  dailyPnl,
  winRate,
  profitFactor,
  netPnl,
  totalPnl,
  groupBy,
  maxDrawdown,
  recoveryFactor,
  realisedRR,
  tpBeSl
} from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import { PerfBar } from "@/components/charts/perf-bar";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { DayViewModal } from "@/components/day-view-modal";
import { Empty } from "@/components/ui/empty";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";
import { useFilters, useMoney } from "@/lib/filters/store";

type Fmt = (n: number | null | undefined) => string;

const TABS = ["Overview", "Detailed", "Risk", "Wins vs Losses", "Compare", "Calendar"] as const;
type Tab = (typeof TABS)[number];

export default function ReportsPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [tab, setTab] = useState<Tab>("Overview");

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);
  const screenshotRef = useRef<HTMLDivElement>(null);

  if (loading) return <div className="text-sm text-fg-muted">Loading reports…</div>;
  if (!filtered.length)
    return (
      <Empty
        title={trades.length ? "No trades match filters" : "No trades"}
        description={
          trades.length
            ? "Adjust the date range or accounts in the top bar."
            : "Reports unlock once you log trades."
        }
      />
    );

  return (
    <div ref={screenshotRef} className="space-y-6">
      <PageHeader
        title="Reports"
        description="Tradezella-depth insights — overview, detailed cuts, risk, wins vs losses, comparisons and calendar."
        actions={<ScreenshotButton targetRef={screenshotRef} filename={`reports-${tab.toLowerCase().replace(/\s+/g, "-")}`} />}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              tab === t
                ? "border-brand-400 bg-brand-500/15 text-brand-200"
                : "border-line bg-bg-soft text-fg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview trades={filtered} currency={filters.currency} />}
      {tab === "Detailed" && <Detailed trades={filtered} fmt={fmt} />}
      {tab === "Risk" && <Risk trades={filtered} currency={filters.currency} />}
      {tab === "Wins vs Losses" && <WinsLosses trades={filtered} fmt={fmt} />}
      {tab === "Compare" && <Compare trades={filtered} fmt={fmt} />}
      {tab === "Calendar" && <CalendarView trades={filtered} fmt={fmt} />}
    </div>
  );
}

function Overview({ trades, currency }: { trades: TradeRow[]; currency: string }) {
  const breakdown = tpBeSl(trades);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Net P&L" value={netPnl(trades)} format="currency" positive={netPnl(trades) >= 0} />
        <Stat label="Trade win %" value={winRate(trades)} format="percent" />
        <Stat label="Profit factor" value={profitFactor(trades)} format="number" />
        <Stat label="Total trades" value={trades.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label={<span className="text-success">TP</span>}
          value={breakdown.tp}
          format="number"
          valueClassName="text-success"
        />
        <Stat
          label={<span>BE</span>}
          value={breakdown.be}
          format="number"
          valueClassName="text-fg"
        />
        <Stat
          label={<span className="text-danger">SL</span>}
          value={breakdown.sl}
          format="number"
          valueClassName="text-danger"
        />
      </div>
      <Card>
        <CardHeader><CardTitle>Daily net P&L</CardTitle></CardHeader>
        <CardBody><DailyPnlChart data={dailyPnl(trades).slice(-60)} /></CardBody>
      </Card>
      <DisplayCurrencyNote currency={currency} />
    </>
  );
}

function DisplayCurrencyNote({ currency }: { currency: string }) {
  if (currency === "USD") return null;
  return (
    <div className="text-xs text-fg-subtle">
      Amounts are converted from USD to {currency} using live FX rates.
    </div>
  );
}

function Detailed({ trades, fmt }: { trades: TradeRow[]; fmt: Fmt }) {
  const byMistake = performanceBy(trades, "mistake_tag");
  const bySetup = performanceBy(trades, "setup_tag");
  const byEmotion = useEmotions(trades);
  const sessions = performanceBy(trades, "session");
  const pairs = performanceBy(trades, "pair");
  const dayBuckets = groupBy(trades, (t) =>
    t.trade_date
      ? new Date(t.trade_date).toLocaleDateString("en-US", { weekday: "long" })
      : null
  );
  const days = Object.entries(dayBuckets).map(([k, v]) => ({
    key: k,
    pnl: totalPnl(v),
    trades: v.length
  }));

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Best setups</CardTitle></CardHeader>
          <CardBody><PerfBar data={bySetup.slice(0, 8)} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Worst habits (mistakes)</CardTitle></CardHeader>
          <CardBody><PerfBar data={byMistake.slice(-8).reverse()} /></CardBody>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>By session</CardTitle></CardHeader><CardBody><PerfBar data={sessions} /></CardBody></Card>
        <Card><CardHeader><CardTitle>By day of week</CardTitle></CardHeader><CardBody><PerfBar data={days} /></CardBody></Card>
      </div>
      <Card><CardHeader><CardTitle>Pairs</CardTitle></CardHeader><CardBody><PerfBar data={pairs.slice(0, 12)} /></CardBody></Card>
      <Card>
        <CardHeader><CardTitle>Emotion → P&L correlation</CardTitle></CardHeader>
        <CardBody>
          {byEmotion.length === 0 ? (
            <div className="text-sm text-fg-muted">Tag emotions on your trades to unlock this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2 font-medium">Emotion</th>
                    <th className="px-3 py-2 font-medium">Trades</th>
                    <th className="px-3 py-2 font-medium">Win %</th>
                    <th className="px-3 py-2 font-medium">Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byEmotion.map((e) => (
                    <tr key={e.emotion} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2 font-medium">{e.emotion}</td>
                      <td className="px-3 py-2">{e.trades}</td>
                      <td className="px-3 py-2">{formatPercent(e.winRate)}</td>
                      <td className="px-3 py-2">{fmt(e.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Risk({ trades, currency }: { trades: TradeRow[]; currency: string }) {
  const dd = maxDrawdown(trades);
  const rf = recoveryFactor(trades);
  const winRRs = trades.filter((t) => (t.pnl ?? 0) > 0).map(realisedRR).filter((x): x is number => x !== null);
  const lossRRs = trades.filter((t) => (t.pnl ?? 0) < 0).map(realisedRR).filter((x): x is number => x !== null);
  const allRRs = trades.map(realisedRR).filter((x): x is number => x !== null);
  const avgRR = allRRs.length ? allRRs.reduce((s, x) => s + x, 0) / allRRs.length : 0;
  const expectancy = trades.length
    ? trades.reduce((s, t) => s + (t.pnl ?? 0), 0) / trades.length
    : 0;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Max drawdown" value={dd} format="currency" positive={false} />
        <Stat label="Recovery factor" value={rf} format="number" />
        <Stat label="Avg planned R:R" value={avgRR} format="number" positive={avgRR >= 1} />
        <Stat label="Per-trade expectancy" value={expectancy} format="currency" positive={expectancy >= 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="R:R on winning trades" value={avg(winRRs)} format="number" />
        <Stat label="R:R on losing trades" value={avg(lossRRs)} format="number" positive={false} />
        <Stat label="Trades with R:R data" value={allRRs.length} format="number" />
      </div>
      <Card>
        <CardHeader><CardTitle>R:R distribution buckets</CardTitle></CardHeader>
        <CardBody>
          <div className="text-xs text-fg-muted">
            Planned R:R is computed from each trade&apos;s entry, stop-loss and take-profit levels.
            Display currency: <span className="text-fg">{currency}</span>.
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}

function WinsLosses({ trades, fmt }: { trades: TradeRow[]; fmt: Fmt }) {
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);
  const breakEven = trades.filter((t) => (t.pnl ?? 0) === 0);
  const totalWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalLoss = losses.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const largestWin = wins.reduce((m, t) => Math.max(m, t.pnl ?? 0), 0);
  const largestLoss = losses.reduce((m, t) => Math.min(m, t.pnl ?? 0), 0);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Wins" value={wins.length} format="number" valueClassName="text-success" />
        <Stat label="Losses" value={losses.length} format="number" valueClassName="text-danger" />
        <Stat label="Break-even" value={breakEven.length} format="number" valueClassName="text-fg" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total winnings" value={totalWin} format="currency" valueClassName="text-success" />
        <Stat label="Total losses" value={totalLoss} format="currency" valueClassName="text-danger" />
        <Stat label="Largest win" value={largestWin} format="currency" valueClassName="text-success" />
        <Stat label="Largest loss" value={largestLoss} format="currency" valueClassName="text-danger" />
      </div>
      <Card>
        <CardHeader><CardTitle>Average trade size</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <Cell label="Avg win" valueClassName="text-success">
              {fmt(wins.length ? totalWin / wins.length : 0)}
            </Cell>
            <Cell label="Avg loss" valueClassName="text-danger">
              {fmt(losses.length ? totalLoss / losses.length : 0)}
            </Cell>
            <Cell
              label="Win/loss ratio"
              valueClassName={ratioClass(totalWin, totalLoss)}
            >
              {losses.length ? formatNumber(Math.abs(totalWin / totalLoss), 2) : "—"}
            </Cell>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Cell({
  label,
  children,
  valueClassName
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated p-3">
      <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={`mt-0.5 text-base font-medium ${valueClassName ?? ""}`}>{children}</div>
    </div>
  );
}

function ratioClass(totalWin: number, totalLoss: number): string {
  if (!totalLoss) return "text-fg";
  const r = Math.abs(totalWin / totalLoss);
  if (r >= 1) return "text-success";
  return "text-danger";
}

function Compare({ trades, fmt }: { trades: TradeRow[]; fmt: Fmt }) {
  // Compare sessions side-by-side.
  const sessions = ["New York", "London", "Asia", "Sydney"];
  const rows = sessions.map((s) => {
    const ts = trades.filter((t) => (t.session ?? detectSession(t.trade_date)) === s);
    return {
      session: s,
      trades: ts.length,
      pnl: totalPnl(ts),
      winRate: winRate(ts),
      pf: profitFactor(ts),
      avg: ts.length ? totalPnl(ts) / ts.length : 0
    };
  });
  return (
    <Card>
      <CardHeader><CardTitle>Side-by-side: sessions</CardTitle></CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">Trades</th>
              <th className="px-3 py-2 font-medium">Net P&L</th>
              <th className="px-3 py-2 font-medium">Avg P&L</th>
              <th className="px-3 py-2 font-medium">Win %</th>
              <th className="px-3 py-2 font-medium">Profit factor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.session} className="border-b border-line/50 last:border-0">
                <td className="px-3 py-2 font-medium">{r.session}</td>
                <td className="px-3 py-2">{r.trades}</td>
                <td className={`px-3 py-2 font-medium ${r.pnl >= 0 ? "text-success" : "text-danger"}`}>{fmt(r.pnl)}</td>
                <td className="px-3 py-2">{fmt(r.avg)}</td>
                <td className="px-3 py-2">{formatPercent(r.winRate, 1)}</td>
                <td className="px-3 py-2">{formatNumber(r.pf, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function CalendarView({ trades, fmt }: { trades: TradeRow[]; fmt: Fmt }) {
  const days = useMemo(() => dailyPnl(trades), [trades]);
  const [openDate, setOpenDate] = useState<string | null>(null);
  // Available years in the data; default cursor to most recent.
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const d of days) {
      const y = Number(d.date.slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
    }
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => a - b);
  }, [days]);
  const [year, setYear] = useState<number>(() => years[years.length - 1] ?? new Date().getFullYear());

  // Year-scoped daily map and max abs P&L for colour intensity.
  const { byDay, maxAbs } = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number }>();
    let max = 0;
    for (const d of days) {
      const y = Number(d.date.slice(0, 4));
      if (y !== year) continue;
      map.set(d.date, { pnl: d.pnl, trades: d.trades });
      const abs = Math.abs(d.pnl);
      if (abs > max) max = abs;
    }
    return { byDay: map, maxAbs: max };
  }, [days, year]);

  const monthlyTotals = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => ({ pnl: 0, trades: 0 }));
    for (const [iso, v] of byDay.entries()) {
      const m = Number(iso.slice(5, 7)) - 1;
      if (m < 0 || m > 11) continue;
      arr[m].pnl += v.pnl;
      arr[m].trades += v.trades;
    }
    return arr;
  }, [byDay]);

  const yearTotal = monthlyTotals.reduce((s, m) => s + m.pnl, 0);
  const yearTrades = monthlyTotals.reduce((s, m) => s + m.trades, 0);

  const calRef = useRef<HTMLDivElement>(null);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Calendar — {year}</CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear((y) => Math.max(years[0] ?? y, y - 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-brand-400 hover:text-fg"
            aria-label="Previous year"
          >
            ‹
          </button>
          <span className="rounded-md bg-bg-soft px-2 py-0.5 text-xs text-fg-muted">
            {yearTrades} trade{yearTrades === 1 ? "" : "s"}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              yearTotal >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            }`}
          >
            {fmt(yearTotal)}
          </span>
          <button
            type="button"
            onClick={() => setYear((y) => Math.min(years[years.length - 1] ?? y, y + 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-brand-400 hover:text-fg"
            aria-label="Next year"
          >
            ›
          </button>
          <ScreenshotButton targetRef={calRef} filename={`reports-calendar-${year}`} />
        </div>
      </CardHeader>
      <CardBody>
        <div ref={calRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, m) => (
            <MiniMonth
              key={m}
              year={year}
              month={m}
              byDay={byDay}
              maxAbs={maxAbs}
              total={monthlyTotals[m]}
              fmt={fmt}
              onDayClick={(iso) => setOpenDate(iso)}
            />
          ))}
        </div>
      </CardBody>
      {openDate && (
        <DayViewModal
          date={openDate}
          trades={trades}
          onClose={() => setOpenDate(null)}
        />
      )}
    </Card>
  );
}

const MINI_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function MiniMonth({
  year,
  month,
  byDay,
  maxAbs,
  total,
  fmt,
  onDayClick
}: {
  year: number;
  month: number;
  byDay: Map<string, { pnl: number; trades: number }>;
  maxAbs: number;
  total: { pnl: number; trades: number };
  fmt: Fmt;
  onDayClick?: (iso: string) => void;
}) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const lead = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= last.getDate(); d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{MONTH_NAMES[month]}</span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
            total.pnl > 0
              ? "bg-success/15 text-success"
              : total.pnl < 0
                ? "bg-danger/15 text-danger"
                : "bg-fg-muted/15 text-fg-muted"
          }`}
          title={`${total.trades} trade${total.trades === 1 ? "" : "s"} · ${fmt(total.pnl)}`}
        >
          {fmt(total.pnl)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {MINI_WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`} className="text-[9px] uppercase tracking-wide text-fg-subtle">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) {
            return <span key={`empty-${i}`} className="aspect-square" />;
          }
          // Build ISO key in local time (avoid UTC drift swallowing a day).
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const cell = byDay.get(iso);
          const intensity = cell && maxAbs ? Math.min(Math.abs(cell.pnl) / maxAbs, 1) : 0;
          const tone = !cell
            ? "bg-bg-elevated text-fg-subtle"
            : cell.pnl > 0
              ? "text-success"
              : cell.pnl < 0
                ? "text-danger"
                : "bg-fg-muted/15 text-fg-muted";
          const bg = cell && cell.pnl !== 0
            ? cell.pnl > 0
              ? `rgba(34,197,94,${0.18 + intensity * 0.55})`
              : `rgba(239,68,68,${0.18 + intensity * 0.55})`
            : undefined;
          const clickable = !!cell && !!onDayClick;
          const className = `flex aspect-square items-center justify-center rounded text-[10px] font-medium transition ${tone}${
            clickable ? " cursor-pointer hover:scale-[1.08] hover:shadow" : ""
          }`;
          if (clickable) {
            return (
              <button
                type="button"
                key={iso}
                onClick={() => onDayClick(iso)}
                className={className}
                style={bg ? { backgroundColor: bg } : undefined}
                title={`${iso} · ${cell!.trades} trade${cell!.trades === 1 ? "" : "s"} · ${fmt(cell!.pnl)}`}
                aria-label={`Open day view for ${iso}`}
              >
                {d.getDate()}
              </button>
            );
          }
          return (
            <span
              key={iso}
              className={className}
              style={bg ? { backgroundColor: bg } : undefined}
              title={cell ? `${iso} · ${cell.trades} trade${cell.trades === 1 ? "" : "s"} · ${fmt(cell.pnl)}` : iso}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function useEmotions(trades: TradeRow[]) {
  const buckets: Record<string, TradeRow[]> = {};
  for (const t of trades) {
    for (const e of t.emotions ?? []) {
      (buckets[e] ||= []).push(t);
    }
  }
  return Object.entries(buckets)
    .map(([emotion, ts]) => ({
      emotion,
      trades: ts.length,
      pnl: totalPnl(ts),
      winRate: winRate(ts)
    }))
    .sort((a, b) => b.pnl - a.pnl);
}
