"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TradeRow } from "@/lib/supabase/types";
import { useMoney } from "@/lib/filters/store";
import { cn } from "@/lib/utils";

type DayBucket = { pnl: number; trades: number; wins: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TradeCalendar({ trades }: { trades: TradeRow[] }) {
  const [cursor, setCursor] = useState<Date>(() => new Date());

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

  const cells = useMemo(() => {
    // Fill leading blanks so the 1st lands on its weekday column.
    const lead = monthStart.getDay();
    const days: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthStart, monthEnd, cursor]);

  const weekly = useMemo(() => {
    const weeks: { totalUsd: number; trades: number; days: number }[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      let totalUsd = 0;
      let tradeCount = 0;
      let dayCount = 0;
      for (let j = 0; j < 7; j += 1) {
        const cell = cells[i + j];
        if (!cell) continue;
        const b = byDay.get(isoKey(cell));
        if (!b) continue;
        totalUsd += b.pnl;
        tradeCount += b.trades;
        dayCount += 1;
      }
      weeks.push({ totalUsd, trades: tradeCount, days: dayCount });
    }
    return weeks;
  }, [cells, byDay]);

  const monthlyUsd = useMemo(
    () => weekly.reduce((s, w) => s + w.totalUsd, 0),
    [weekly]
  );
  const tradingDays = useMemo(
    () => weekly.reduce((s, w) => s + w.days, 0),
    [weekly]
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-brand-400 hover:text-fg"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="text-sm font-medium text-fg">
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
              className="ml-2 rounded-lg border border-line px-2 py-1 text-[11px] text-fg-muted hover:border-brand-400 hover:text-fg"
            >
              This month
            </button>
          </div>
          <MonthlyTotals usd={monthlyUsd} days={tradingDays} />
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wide text-fg-subtle">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, idx) => (
            <CalendarCell key={idx} date={cell} bucket={cell ? byDay.get(isoKey(cell)) ?? null : null} />
          ))}
        </div>
      </div>

      <div className="flex flex-row gap-1.5 lg:w-32 lg:flex-col">
        {weekly.map((w, idx) => (
          <WeekSummary key={idx} index={idx + 1} usd={w.totalUsd} days={w.days} />
        ))}
      </div>
    </div>
  );
}

function MonthlyTotals({ usd, days }: { usd: number; days: number }) {
  const { fmt } = useMoney();
  const positive = usd >= 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-fg-subtle">Monthly stats:</span>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 font-medium",
          positive
            ? "bg-success/15 text-success"
            : "bg-danger/15 text-danger"
        )}
      >
        {fmt(usd)}
      </span>
      <span className="text-fg-muted">{days} day{days === 1 ? "" : "s"}</span>
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
          "h-16 rounded-lg border border-line/60 bg-bg-soft/40 px-1.5 py-1 text-[11px] text-fg-subtle",
          isToday && "border-brand-500/60"
        )}
      >
        {date.getDate()}
      </div>
    );
  }
  const positive = bucket.pnl >= 0;
  const winPct = bucket.trades ? (bucket.wins / bucket.trades) * 100 : 0;
  return (
    <div
      className={cn(
        "flex h-16 flex-col justify-between rounded-lg border px-1.5 py-1 text-[11px]",
        positive
          ? "border-success/40 bg-success/15 text-success"
          : "border-danger/40 bg-danger/15 text-danger",
        isToday && "ring-1 ring-brand-500/60"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium opacity-80">{date.getDate()}</span>
      </div>
      <div className="leading-tight">
        <div className="truncate font-semibold">{fmt(bucket.pnl)}</div>
        <div className="truncate text-[10px] opacity-80">
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
    <div className="flex-1 rounded-lg border border-line bg-bg-soft/40 px-2 py-2 lg:flex-none">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">Week {index}</div>
      <div
        className={cn(
          "mt-0.5 text-sm font-semibold",
          days === 0 ? "text-fg-muted" : positive ? "text-success" : "text-danger"
        )}
      >
        {days === 0 ? "—" : fmt(usd)}
      </div>
      <div className="text-[10px] text-fg-subtle">
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
