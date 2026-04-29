"use client";

import { useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

type DayCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  pnl: number;
  trades: number;
};

/**
 * CalendarGrid — Tradezella-style month calendar with 7 day columns and
 * an 8th "weekly summary" column on the right. Cells colored green/red
 * by daily P&L. Empty/out-of-month days are flat.
 */
export function CalendarGrid({
  trades,
  year,
  month, // 0-indexed
  dense = false
}: {
  trades: TradeRow[];
  year: number;
  month: number;
  dense?: boolean;
}) {
  const cells = useMemo<DayCell[]>(() => buildMonthCells(trades, year, month), [trades, year, month]);

  // Group into rows of 7 + weekly summary cell
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className={cn("space-y-2", dense ? "text-[10px]" : "text-xs")}>
      <div className="grid grid-cols-8 gap-1.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Week"].map((d) => (
          <div key={d} className="px-1 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {weeks.flatMap((week, wi) => {
          const weekPnl = week.reduce((s, c) => s + (c.inMonth ? c.pnl : 0), 0);
          const weekTrades = week.reduce((s, c) => s + (c.inMonth ? c.trades : 0), 0);
          return [
            ...week.map((c) => (
              <DayCellView key={`${wi}-${c.iso}`} cell={c} dense={dense} />
            )),
            <WeekSummary key={`week-${wi}`} pnl={weekPnl} trades={weekTrades} dense={dense} />
          ];
        })}
      </div>
    </div>
  );
}

function DayCellView({ cell, dense }: { cell: DayCell; dense: boolean }) {
  const tone = !cell.inMonth || cell.trades === 0 ? "flat" : cell.pnl >= 0 ? "pos" : "neg";
  return (
    <div
      className={cn(
        "rounded-lg p-1.5",
        dense ? "h-12" : "h-16",
        "flex flex-col justify-between border",
        tone === "pos" && "border-success/40 bg-success/15 text-success",
        tone === "neg" && "border-danger/40 bg-danger/15 text-danger",
        tone === "flat" && "border-line bg-bg-soft/40 text-fg-subtle"
      )}
    >
      <div className={cn("font-semibold", dense ? "text-[10px]" : "text-[11px]")}>
        {cell.inMonth ? cell.day : ""}
      </div>
      {cell.inMonth && cell.trades > 0 && (
        <div className={cn("text-right tabular leading-none", dense ? "text-[9px]" : "text-[10px]")}>
          {compactCurrency(cell.pnl)}
        </div>
      )}
    </div>
  );
}

function WeekSummary({ pnl, trades, dense }: { pnl: number; trades: number; dense: boolean }) {
  const tone = trades === 0 ? "flat" : pnl >= 0 ? "pos" : "neg";
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-1.5",
        dense ? "h-12" : "h-16",
        "flex flex-col items-center justify-center",
        tone === "pos" && "border-success/40 bg-success/15 text-success",
        tone === "neg" && "border-danger/40 bg-danger/15 text-danger",
        tone === "flat" && "border-line bg-bg-soft/40 text-fg-subtle"
      )}
    >
      <div className={cn("font-semibold tabular", dense ? "text-[11px]" : "text-sm")}>
        {trades > 0 ? compactCurrency(pnl) : "—"}
      </div>
      {trades > 0 && (
        <div className={cn("text-fg-muted", dense ? "text-[9px]" : "text-[10px]")}>
          {trades} {trades === 1 ? "trade" : "trades"}
        </div>
      )}
    </div>
  );
}

function buildMonthCells(trades: TradeRow[], year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startDow = first.getUTCDay(); // 0..6 (Sun = 0)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  // Pre-aggregate trades by date
  const byDate = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    if (!t.trade_date || !t.pnl) continue;
    const d = t.trade_date;
    const cur = byDate.get(d) ?? { pnl: 0, trades: 0 };
    cur.pnl += t.pnl ?? 0;
    cur.trades += 1;
    byDate.set(d, cur);
  }

  const cells: DayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const date = new Date(Date.UTC(year, month, dayNum));
    const iso = date.toISOString().slice(0, 10);
    const agg = byDate.get(iso);
    cells.push({
      iso,
      day: dayNum,
      inMonth,
      pnl: agg?.pnl ?? 0,
      trades: agg?.trades ?? 0
    });
  }
  return cells;
}

function compactCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1000).toFixed(1)}k`;
  return formatCurrency(n);
}
