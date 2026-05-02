"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TradeRow } from "@/lib/supabase/types";
import { useMoney } from "@/lib/filters/store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------
// Monthly trade calendar.
//
// Layout uses a single CSS grid with 7 day-columns + 1 week-summary
// column so each row of cells naturally aligns with its weekly summary
// card on the right (matches TradeZella's reference).
// ---------------------------------------------------------------------

type DayBucket = { pnl: number; trades: number; wins: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TradeCalendar({
  trades,
  headerActions
}: {
  trades: TradeRow[];
  /** Optional buttons rendered to the right of the monthly stats pill. */
  headerActions?: React.ReactNode;
}) {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const { fmt } = useMoney();

  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor]
  );
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor]
  );

  const byDay = useMemo(() => {
    const out = new Map<string, DayBucket>();
    for (const t of trades) {
      if (!t.trade_date) continue;
      const d = new Date(t.trade_date);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) continue;
      const key = isoKey(d);
      const prev = out.get(key) ?? { pnl: 0, trades: 0, wins: 0 };
      prev.pnl += t.pnl ?? 0;
      prev.trades += 1;
      if ((t.pnl ?? 0) > 0) prev.wins += 1;
      out.set(key, prev);
    }
    return out;
  }, [trades, cursor]);

  const cells = useMemo<(Date | null)[]>(() => {
    const lead = monthStart.getDay();
    const days: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthStart, monthEnd, cursor]);

  const weekRows = useMemo(() => {
    const rows: { cells: (Date | null)[]; totalUsd: number; trades: number; days: number }[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const slice = cells.slice(i, i + 7);
      let totalUsd = 0;
      let tradeCount = 0;
      let dayCount = 0;
      for (const cell of slice) {
        if (!cell) continue;
        const b = byDay.get(isoKey(cell));
        if (!b) continue;
        totalUsd += b.pnl;
        tradeCount += b.trades;
        dayCount += 1;
      }
      rows.push({ cells: slice, totalUsd, trades: tradeCount, days: dayCount });
    }
    return rows;
  }, [cells, byDay]);

  const monthlyUsd = useMemo(
    () => weekRows.reduce((s, w) => s + w.totalUsd, 0),
    [weekRows]
  );
  const tradingDays = useMemo(
    () => weekRows.reduce((s, w) => s + w.days, 0),
    [weekRows]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Header: month nav + monthly stats pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-brand-400 hover:text-fg"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-[7.5rem] text-center text-sm font-medium text-fg">
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-brand-400 hover:text-fg"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="ml-2 rounded-lg border border-line px-2.5 py-1 text-[11px] text-fg-muted hover:border-brand-400 hover:text-fg"
          >
            This month
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-fg-subtle">Monthly stats:</span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 font-semibold",
              monthlyUsd >= 0
                ? "bg-success/15 text-success"
                : "bg-danger/15 text-danger"
            )}
          >
            {fmt(monthlyUsd)}
          </span>
          <span className="rounded-md bg-bg-soft px-2 py-0.5 font-medium text-fg-muted">
            {tradingDays} day{tradingDays === 1 ? "" : "s"}
          </span>
          {headerActions ? <div className="ml-1 flex items-center gap-1">{headerActions}</div> : null}
        </div>
      </div>

      {/* Weekday headers — 7 day columns + week summary column at the end. */}
      <div
        className="grid gap-1 text-center text-[10px] uppercase tracking-wide text-fg-subtle"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr)) 5.5rem" }}
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-0.5">{w}</div>
        ))}
        <div className="py-0.5" />
      </div>

      {/* Calendar grid: each week row spans 7 day cells + 1 week summary cell. */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr)) 5.5rem" }}
      >
        {weekRows.map((week, rowIdx) => (
          <Fragment key={rowIdx}>
            {week.cells.map((cell, dayIdx) => (
              <CalendarCell
                key={`${rowIdx}-${dayIdx}`}
                date={cell}
                bucket={cell ? byDay.get(isoKey(cell)) ?? null : null}
              />
            ))}
            <WeekSummary index={rowIdx + 1} usd={week.totalUsd} days={week.days} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ date, bucket }: { date: Date | null; bucket: DayBucket | null }) {
  const { fmt } = useMoney();
  if (!date) return <div className="h-16 rounded-lg" />;
  const isToday = sameDay(date, new Date());
  if (!bucket) {
    return (
      <div
        className={cn(
          "flex h-16 flex-col rounded-lg border border-line/60 bg-bg-soft/40 px-1.5 py-1 text-[10px] text-fg-subtle",
          isToday && "border-brand-500/60"
        )}
      >
        <span className="self-end font-medium">{date.getDate()}</span>
      </div>
    );
  }
  const positive = bucket.pnl >= 0;
  const winPct = bucket.trades ? (bucket.wins / bucket.trades) * 100 : 0;
  return (
    <div
      className={cn(
        "flex h-16 flex-col justify-between rounded-lg border px-1.5 py-1 text-[10px]",
        positive
          ? "border-success/40 bg-success/15 text-success"
          : "border-danger/40 bg-danger/15 text-danger",
        isToday && "ring-1 ring-brand-500/60"
      )}
    >
      <div className="flex items-center justify-end">
        <span className="text-[9px] font-medium opacity-70">{date.getDate()}</span>
      </div>
      <div className="space-y-0 leading-tight">
        <div className="truncate text-[11px] font-semibold">{fmt(bucket.pnl)}</div>
        <div className="truncate text-[9px] opacity-80">
          {bucket.trades} trade{bucket.trades === 1 ? "" : "s"} · {winPct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function WeekSummary({ index, usd, days }: { index: number; usd: number; days: number }) {
  const { fmt } = useMoney();
  const positive = usd >= 0;
  return (
    <div className="flex h-16 flex-col justify-center rounded-lg border border-line bg-bg-soft/60 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wide text-fg-subtle">
        Week {index}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[12px] font-semibold leading-tight",
          days === 0 ? "text-fg-muted" : positive ? "text-success" : "text-danger"
        )}
      >
        {days === 0 ? fmt(0) : fmt(usd)}
      </div>
      <div className="text-[9px] text-fg-subtle">
        {days} day{days === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function isoKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
