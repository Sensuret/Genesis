// =====================================================================
// GƎNƎSIS Trade Analytics Engine
// Pure functions over TradeRow[]. Used by Dashboard, Reports, Recaps.
// =====================================================================

import type { TradeRow } from "@/lib/supabase/types";

export type EquityPoint = { date: string; equity: number; pnl: number };

export function sortByDate(trades: TradeRow[]): TradeRow[] {
  return [...trades].sort((a, b) => {
    const ad = a.trade_date ? new Date(a.trade_date).getTime() : 0;
    const bd = b.trade_date ? new Date(b.trade_date).getTime() : 0;
    return ad - bd;
  });
}

export function totalPnl(trades: TradeRow[]): number {
  return trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
}

export function totalCommissions(trades: TradeRow[]): number {
  return trades.reduce((s, t) => s + (t.commissions ?? 0), 0);
}

export function totalSpread(trades: TradeRow[]): number {
  return trades.reduce((s, t) => s + (t.spread ?? 0), 0);
}

export function netPnl(trades: TradeRow[]): number {
  return totalPnl(trades) - totalCommissions(trades) - totalSpread(trades);
}

export function winners(trades: TradeRow[]) { return trades.filter((t) => (t.pnl ?? 0) > 0); }
export function losers(trades: TradeRow[]) { return trades.filter((t) => (t.pnl ?? 0) < 0); }

export function winRate(trades: TradeRow[]): number {
  const decided = trades.filter((t) => (t.pnl ?? 0) !== 0);
  if (!decided.length) return 0;
  return (winners(decided).length / decided.length) * 100;
}

export function profitFactor(trades: TradeRow[]): number {
  const gross = winners(trades).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const loss = Math.abs(losers(trades).reduce((s, t) => s + (t.pnl ?? 0), 0));
  if (loss === 0) return gross > 0 ? gross : 0;
  return gross / loss;
}

export function avgWin(trades: TradeRow[]): number {
  const w = winners(trades);
  return w.length ? w.reduce((s, t) => s + (t.pnl ?? 0), 0) / w.length : 0;
}
export function avgLoss(trades: TradeRow[]): number {
  const l = losers(trades);
  return l.length ? l.reduce((s, t) => s + (t.pnl ?? 0), 0) / l.length : 0;
}
export function avgWinLoss(trades: TradeRow[]): number {
  const al = Math.abs(avgLoss(trades));
  return al ? avgWin(trades) / al : 0;
}

export function expectancy(trades: TradeRow[]): number {
  const wr = winRate(trades) / 100;
  return wr * avgWin(trades) + (1 - wr) * avgLoss(trades);
}

export function maxDrawdown(trades: TradeRow[]): number {
  const sorted = sortByDate(trades);
  let peak = 0;
  let equity = 0;
  let mdd = 0;
  for (const t of sorted) {
    equity += t.pnl ?? 0;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
}

export function recoveryFactor(trades: TradeRow[]): number {
  const dd = maxDrawdown(trades);
  return dd ? netPnl(trades) / dd : 0;
}

export function consistencyScore(trades: TradeRow[]): number {
  // % of trading days that contributed <30% of total gross profit (lower variance = better).
  const byDay = groupByDate(trades);
  const dayPnls = Object.values(byDay).map((dayTrades) => totalPnl(dayTrades));
  const grossProfit = dayPnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  if (!grossProfit) return 0;
  const big = dayPnls.find((p) => p > 0 && p / grossProfit > 0.3);
  return big ? Math.max(0, 100 - (big / grossProfit) * 100) : 90;
}

export type GsScoreInputs = {
  winPct: number;
  profitFactor: number;
  avgWinLoss: number;
  recoveryFactor: number;
  maxDrawdown: number;
  consistency: number;
};

export function computeGsScoreParts(trades: TradeRow[]): GsScoreInputs {
  return {
    winPct: winRate(trades),
    profitFactor: profitFactor(trades),
    avgWinLoss: avgWinLoss(trades),
    recoveryFactor: recoveryFactor(trades),
    maxDrawdown: maxDrawdown(trades),
    consistency: consistencyScore(trades)
  };
}

/** GS Score 0–100 — six components blended on a fintech curve. */
export function gsScore(parts: GsScoreInputs): number {
  const winC = clamp01(parts.winPct / 70) * 100;
  const pfC = clamp01((parts.profitFactor - 1) / 2) * 100;
  const wlC = clamp01(parts.avgWinLoss / 2.5) * 100;
  const rfC = clamp01(parts.recoveryFactor / 5) * 100;
  const ddC = (1 - clamp01(parts.maxDrawdown ? parts.maxDrawdown / Math.max(parts.maxDrawdown * 4, 1) : 0)) * 100;
  const cnsC = clamp01(parts.consistency / 100) * 100;
  return Math.round((winC + pfC + wlC + rfC + ddC + cnsC) / 6);
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function equityCurve(trades: TradeRow[], start = 0): EquityPoint[] {
  const sorted = sortByDate(trades);
  let equity = start;
  return sorted.map((t) => {
    equity += t.pnl ?? 0;
    return { date: t.trade_date ?? "", pnl: t.pnl ?? 0, equity };
  });
}

export function dailyPnl(trades: TradeRow[]): Array<{ date: string; pnl: number; trades: number }> {
  const grouped = groupByDate(trades);
  return Object.entries(grouped)
    .map(([date, ts]) => ({ date, pnl: totalPnl(ts), trades: ts.length }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function groupByDate(trades: TradeRow[]): Record<string, TradeRow[]> {
  const out: Record<string, TradeRow[]> = {};
  for (const t of trades) {
    const key = t.trade_date ?? "unknown";
    (out[key] ||= []).push(t);
  }
  return out;
}

export function groupBy<T, K extends string | number>(items: T[], pick: (i: T) => K | null | undefined): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    const k = pick(it);
    if (k === null || k === undefined || k === "") continue;
    (out[String(k)] ||= []).push(it);
  }
  return out;
}

export function performanceBy<T extends keyof TradeRow>(trades: TradeRow[], key: T) {
  const grouped = groupBy(trades, (t) => t[key] as unknown as string);
  return Object.entries(grouped)
    .map(([k, ts]) => ({
      key: k,
      trades: ts.length,
      pnl: totalPnl(ts),
      winRate: winRate(ts),
      profitFactor: profitFactor(ts)
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

// ---------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------
export type Streak = { type: "win" | "loss"; length: number; pnl: number; startDate: string; endDate: string };

export function dayStreaks(trades: TradeRow[]) {
  const days = dailyPnl(trades);
  return computeStreaks(days.map((d) => ({ date: d.date, pnl: d.pnl })));
}

export function weekStreaks(trades: TradeRow[]) {
  return computeStreaks(bucket(trades, weekKey));
}

export function quarterStreaks(trades: TradeRow[]) {
  return computeStreaks(bucket(trades, quarterKey));
}

export function yearStreaks(trades: TradeRow[]) {
  return computeStreaks(bucket(trades, (d) => String(d.getUTCFullYear())));
}

function bucket(trades: TradeRow[], keyFn: (d: Date) => string) {
  const out: Record<string, number> = {};
  for (const t of trades) {
    if (!t.trade_date) continue;
    const k = keyFn(new Date(t.trade_date));
    out[k] = (out[k] ?? 0) + (t.pnl ?? 0);
  }
  return Object.entries(out)
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function computeStreaks(buckets: Array<{ date: string; pnl: number }>): Streak[] {
  const out: Streak[] = [];
  let cur: Streak | null = null;
  for (const b of buckets) {
    if (b.pnl === 0) continue;
    const type = b.pnl > 0 ? "win" : "loss";
    if (!cur || cur.type !== type) {
      if (cur) out.push(cur);
      cur = { type, length: 1, pnl: b.pnl, startDate: b.date, endDate: b.date };
    } else {
      cur.length += 1;
      cur.pnl += b.pnl;
      cur.endDate = b.date;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function weekKey(d: Date) {
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
function quarterKey(d: Date) {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

// ---------------------------------------------------------------------
// R:R distribution helper
// ---------------------------------------------------------------------
export function rDistribution(trades: TradeRow[]) {
  const buckets: Record<string, number> = {
    "<-3R": 0, "-3R": 0, "-2R": 0, "-1R": 0, "0R": 0, "+1R": 0, "+2R": 0, "+3R": 0, ">+3R": 0
  };
  for (const t of trades) {
    const r = t.result_r;
    if (r === null || r === undefined || Number.isNaN(r)) continue;
    if (r < -3) buckets["<-3R"] += 1;
    else if (r < -2) buckets["-3R"] += 1;
    else if (r < -1) buckets["-2R"] += 1;
    else if (r < 0) buckets["-1R"] += 1;
    else if (r === 0) buckets["0R"] += 1;
    else if (r <= 1) buckets["+1R"] += 1;
    else if (r <= 2) buckets["+2R"] += 1;
    else if (r <= 3) buckets["+3R"] += 1;
    else buckets[">+3R"] += 1;
  }
  return Object.entries(buckets).map(([key, count]) => ({ bucket: key, count }));
}

// ---------------------------------------------------------------------
// Session timing breakdown (Asia / London / NY / Other)
// ---------------------------------------------------------------------
export function sessionFromHour(hourUtc: number): "Asia" | "London" | "New York" | "Other" {
  if (hourUtc >= 0 && hourUtc < 7) return "Asia";
  if (hourUtc >= 7 && hourUtc < 12) return "London";
  if (hourUtc >= 12 && hourUtc < 21) return "New York";
  return "Other";
}
