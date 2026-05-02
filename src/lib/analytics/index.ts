// =====================================================================
// GƎNƎSIS Trade Analytics Engine
// Pure functions over TradeRow[]. Used by Dashboard, Reports, Recaps.
// =====================================================================

import type { TradeRow } from "@/lib/supabase/types";
import type { AppFilters } from "@/lib/filters/store";

export type EquityPoint = { date: string; equity: number; pnl: number };

/**
 * Planned R:R for a trade — the ratio defined by the trade's
 * take-profit and stop-loss levels relative to the entry. This is the
 * "$1 risk → $2 reward = 1:2" number. Always positive (never negative)
 * because it describes the *intent* of the setup, not the outcome.
 *
 * Returns null when the trade is missing entry / stop-loss / take-profit,
 * or when the levels make no sense (zero risk, or TP/SL on the wrong
 * side of entry for the trade direction).
 */
export function realisedRR(t: TradeRow): number | null {
  if (t.entry == null || t.stop_loss == null || t.take_profit == null) return null;
  const risk = Math.abs(t.entry - t.stop_loss);
  const reward = Math.abs(t.take_profit - t.entry);
  if (!Number.isFinite(risk) || risk === 0) return null;
  if (!Number.isFinite(reward)) return null;
  return reward / risk;
}

/**
 * A row counts as "real" if it has any of the meaningful fields populated.
 * The legacy parser sometimes appended an empty trailing row (the famous
 * "April 29 ghost row" the user reported) — those have no pair, no pnl,
 * no entry. We filter those out everywhere they're displayed.
 */
export function isRealTrade(t: TradeRow): boolean {
  return !!(t.pair || t.pnl != null || t.entry != null || t.exit_price != null || t.lot_size != null);
}

export function applyDateRange(trades: TradeRow[], range: AppFilters["dateRange"]): TradeRow[] {
  if (range === "all") return trades;
  const now = new Date();
  let from: Date;
  switch (range) {
    case "7d":
      from = new Date(now.getTime() - 7 * 86_400_000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 86_400_000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 86_400_000);
      break;
    case "ytd":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "1y":
      from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return trades;
  }
  return trades.filter((t) => {
    if (!t.trade_date) return false;
    const d = new Date(t.trade_date);
    return !Number.isNaN(d.getTime()) && d >= from;
  });
}

export function applyAccountFilter(trades: TradeRow[], accountIds: string[]): TradeRow[] {
  if (!accountIds.length) return trades;
  const set = new Set(accountIds);
  return trades.filter((t) => t.file_id && set.has(t.file_id));
}

export function applyPlaybookFilter(trades: TradeRow[], playbookId: string | null): TradeRow[] {
  if (!playbookId) return trades;
  return trades.filter((t) => t.playbook_id === playbookId);
}

export function applyAllFilters(trades: TradeRow[], filters: AppFilters): TradeRow[] {
  const real = trades.filter(isRealTrade);
  const range = applyDateRange(real, filters.dateRange);
  const acct = applyAccountFilter(range, filters.accountIds);
  return applyPlaybookFilter(acct, filters.playbookId);
}

export type TpBeSlBreakdown = { tp: number; be: number; sl: number; total: number; winRate: number };

/**
 * Classify each trade as Take-Profit / Break-Even / Stop-Loss using the realised PnL:
 *   - pnl > 0 → TP
 *   - pnl < 0 → SL
 *   - pnl === 0 → BE
 *   - null pnl is excluded
 * Win rate is TP / (TP + SL) (BE doesn't count toward either side).
 */
export function tpBeSl(trades: TradeRow[]): TpBeSlBreakdown {
  let tp = 0;
  let be = 0;
  let sl = 0;
  for (const t of trades) {
    if (t.pnl == null) continue;
    if (t.pnl > 0) tp += 1;
    else if (t.pnl < 0) sl += 1;
    else be += 1;
  }
  const decided = tp + sl;
  return { tp, be, sl, total: tp + be + sl, winRate: decided ? (tp / decided) * 100 : 0 };
}

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

/**
 * Win rate = wins / (wins + losses).
 *
 * Matches the industry-standard TradeZella convention: break-even (pnl === 0)
 * trades are excluded from BOTH numerator and denominator, and unsettled
 * (pnl === null) trades are also excluded. So with 14 wins, 4 BE, 17 losses
 * the win rate is `14 / (14 + 17) = 45.16%` — not `14 / 35`.
 *
 * Used by every win-rate display in the app (Dashboard hero stats + calendar
 * cells, Day View, Reports overview, GS Insights, Recaps) so they all agree
 * on the same number for the same set of trades.
 */
export function winRate(trades: TradeRow[]): number {
  let w = 0;
  let l = 0;
  for (const t of trades) {
    if (t.pnl == null) continue;
    if (t.pnl > 0) w += 1;
    else if (t.pnl < 0) l += 1;
  }
  const decided = w + l;
  return decided ? (w / decided) * 100 : 0;
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
  netPnl: number;
};

export function computeGsScoreParts(trades: TradeRow[]): GsScoreInputs {
  return {
    winPct: winRate(trades),
    profitFactor: profitFactor(trades),
    avgWinLoss: avgWinLoss(trades),
    recoveryFactor: recoveryFactor(trades),
    maxDrawdown: maxDrawdown(trades),
    consistency: consistencyScore(trades),
    netPnl: netPnl(trades)
  };
}

/**
 * GS Score 0–100 — weighted blend of six components.
 *
 * Weights (sum = 100):
 *   - Win % .................. 25 (curve: 70% wins → full credit)
 *   - Profit factor .......... 20 (curve: PF 3.0 → full credit)
 *   - Avg win/loss ........... 15 (curve: ratio 3.0 → full credit)
 *   - Recovery factor ........ 10 (curve: RF 3.0 → full credit)
 *   - Drawdown discipline .... 15 (max DD relative to net P&L)
 *   - Consistency ............ 15 (already 0–100 scale)
 *
 * Win-rate is given the heaviest single weight, so a low win % cannot be
 * masked by an extremely high profit factor — the score reflects the
 * combined quality of the system rather than letting one metric dominate.
 */
export function gsScore(parts: GsScoreInputs): number {
  const winC = clamp01(parts.winPct / 70) * 100;
  const pfC = clamp01((parts.profitFactor - 1) / 2) * 100;
  const wlC = clamp01((parts.avgWinLoss - 1) / 2) * 100;
  const rfC = clamp01(parts.recoveryFactor / 3) * 100;
  // Drawdown discipline: max-DD compared to absolute net P&L.
  //   ratio = maxDD / max(|netPnl|, $1) — capped at 1.
  //   Small DD vs big net → high score; DD ≥ net → score crashes to 0.
  const ddDenom = Math.max(Math.abs(parts.netPnl), 1);
  const ddRatio = parts.maxDrawdown > 0 ? Math.min(parts.maxDrawdown / ddDenom, 1) : 0;
  const ddC = (1 - ddRatio) * 100;
  const cnsC = clamp01(parts.consistency / 100) * 100;
  const weighted = winC * 0.25 + pfC * 0.20 + wlC * 0.15 + rfC * 0.10 + ddC * 0.15 + cnsC * 0.15;
  return Math.round(weighted);
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

/**
 * Current day-streak — extends the most recent run of winning *or* losing
 * days (whichever the latest day is). Returns the streak length in days
 * and trades plus the type. Days with zero PnL break the streak.
 */
export function currentDayStreak(trades: TradeRow[]): {
  type: "win" | "loss" | null;
  days: number;
  trades: number;
} {
  const days = dailyPnl(trades).filter((d) => d.pnl !== 0);
  if (!days.length) return { type: null, days: 0, trades: 0 };
  const last = days[days.length - 1];
  const type: "win" | "loss" = last.pnl > 0 ? "win" : "loss";
  let count = 0;
  let tradeTotal = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const d = days[i];
    const t: "win" | "loss" = d.pnl > 0 ? "win" : "loss";
    if (t !== type) break;
    count += 1;
    tradeTotal += d.trades;
  }
  return { type, days: count, trades: tradeTotal };
}

/**
 * Best (longest) winning *and* losing day-streak ever recorded across the
 * full filtered set. Used for the secondary "best 4 days" badge on the
 * dashboard hero card.
 */
export function bestDayStreak(trades: TradeRow[]): { winDays: number; lossDays: number } {
  const streaks = dayStreaks(trades);
  let win = 0;
  let loss = 0;
  for (const s of streaks) {
    if (s.type === "win" && s.length > win) win = s.length;
    if (s.type === "loss" && s.length > loss) loss = s.length;
  }
  return { winDays: win, lossDays: loss };
}

/**
 * Current consecutive-trade streak — walks the filtered trade history in
 * date order and extends the most recent run of winners or losers. Trades
 * with zero PnL break the streak. Returns trade-level type + length.
 */
export function currentTradeStreak(trades: TradeRow[]): {
  type: "win" | "loss" | null;
  trades: number;
} {
  const decided = sortByDate(trades).filter((t) => (t.pnl ?? 0) !== 0);
  if (!decided.length) return { type: null, trades: 0 };
  const last = decided[decided.length - 1];
  const type: "win" | "loss" = (last.pnl ?? 0) > 0 ? "win" : "loss";
  let count = 0;
  for (let i = decided.length - 1; i >= 0; i -= 1) {
    const t = (decided[i].pnl ?? 0) > 0 ? "win" : "loss";
    if (t !== type) break;
    count += 1;
  }
  return { type, trades: count };
}

/** Best (longest) consecutive-trade streak ever recorded — winners + losers. */
export function bestTradeStreak(trades: TradeRow[]): { winTrades: number; lossTrades: number } {
  const decided = sortByDate(trades).filter((t) => (t.pnl ?? 0) !== 0);
  let win = 0;
  let loss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of decided) {
    if ((t.pnl ?? 0) > 0) {
      curWin += 1;
      curLoss = 0;
      if (curWin > win) win = curWin;
    } else {
      curLoss += 1;
      curWin = 0;
      if (curLoss > loss) loss = curLoss;
    }
  }
  return { winTrades: win, lossTrades: loss };
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

/**
 * Session streaks — group by trading day, computing win/loss streak per session
 * (NY / London / Asia / Sydney). Each entry in the returned map is the streak
 * series for that session.
 */
export function sessionStreaks(
  trades: TradeRow[],
  resolveSession: (t: TradeRow) => string | null
): Record<string, Streak[]> {
  const bySession: Record<string, TradeRow[]> = {};
  for (const t of trades) {
    const s = resolveSession(t);
    if (!s) continue;
    (bySession[s] ??= []).push(t);
  }
  const out: Record<string, Streak[]> = {};
  for (const [session, ts] of Object.entries(bySession)) {
    out[session] = computeStreaks(bucket(ts, isoDayKey));
  }
  return out;
}

function isoDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function totalLotSize(trades: TradeRow[]): number {
  let sum = 0;
  for (const t of trades) {
    if (typeof t.lot_size === "number" && Number.isFinite(t.lot_size)) sum += t.lot_size;
  }
  return sum;
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
//
// Bucketed by planned R:R (TP vs SL relative to entry). Planned RR is
// always positive — it's the ratio you set up *before* the trade, so
// "$1 risk → $2 reward" = 1:2.
//
// Buckets group nearby ratios so the histogram is readable: half-step
// bins below 1:2 (where most setups cluster) then integer bins beyond.
//
// Trades with no usable RR (missing TP, SL or entry) are excluded.
// ---------------------------------------------------------------------
const RR_BUCKETS = [
  "<1:1", "1:1", "1:1.5", "1:2", "1:3", "1:4", "1:5+"
] as const;
type RrBucket = (typeof RR_BUCKETS)[number];

function rrBucketFor(r: number): RrBucket {
  if (!Number.isFinite(r) || r < 1) return "<1:1";
  if (r >= 5) return "1:5+";
  if (r >= 4) return "1:4";
  if (r >= 3) return "1:3";
  if (r >= 2) return "1:2";
  if (r >= 1.25) return "1:1.5";
  return "1:1";
}

export function rDistribution(trades: TradeRow[]) {
  const buckets: Record<RrBucket, number> = {
    "<1:1": 0, "1:1": 0, "1:1.5": 0, "1:2": 0, "1:3": 0, "1:4": 0, "1:5+": 0
  };
  for (const t of trades) {
    const r = realisedRR(t);
    if (r === null || !Number.isFinite(r) || r <= 0) continue;
    buckets[rrBucketFor(r)] += 1;
  }
  return RR_BUCKETS.map((bucket) => ({ bucket, count: buckets[bucket] }));
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
