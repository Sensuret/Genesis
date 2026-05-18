// =====================================================================
// GƎNƎSIS Deep Stats + Lunar Performance Analytics
// MT5 Strategy Tester-style metrics + moon-phase bucketing.
// =====================================================================

import type { TradeRow } from "@/lib/supabase/types";
import {
  winners,
  losers,
  netPnl,
  totalPnl,
  winRate,
  profitFactor,
  avgWin,
  avgLoss,
  maxDrawdown,
  recoveryFactor,
  expectancy,
  sortByDate,
  equityCurve
} from "@/lib/analytics";

// ---------------------------------------------------------------------
// Deep Stats — MT5 Strategy Tester report equivalent
// ---------------------------------------------------------------------

export type DeepStatsResult = {
  totalTrades: number;
  totalNetProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  expectedPayoff: number;
  absoluteDrawdown: number;
  maximalDrawdown: number;
  maximalDrawdownPct: number;
  relativeDrawdown: number;
  relativeDrawdownPct: number;
  winRate: number;
  lossRate: number;
  winCount: number;
  lossCount: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  maxConsecWinAmount: number;
  maxConsecLossAmount: number;
  avgConsecWins: number;
  avgConsecLosses: number;
  sharpeRatio: number;
  recoveryFactor: number;
  longCount: number;
  shortCount: number;
  longWinPct: number;
  shortWinPct: number;
  avgHoldSeconds: number;
  avgWinHoldSeconds: number;
  avgLossHoldSeconds: number;
};

export function computeDeepStats(trades: TradeRow[]): DeepStatsResult {
  const sorted = sortByDate(trades);
  const w = winners(sorted);
  const l = losers(sorted);

  const grossProfit = w.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(l.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const totalNet = grossProfit - grossLoss;
  const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const expectedPayoff = sorted.length > 0 ? totalNet / sorted.length : 0;

  const largestWin = w.length ? Math.max(...w.map((t) => t.pnl ?? 0)) : 0;
  const largestLoss = l.length ? Math.min(...l.map((t) => t.pnl ?? 0)) : 0;

  // Drawdown calculations
  const eq = equityCurve(sorted, 0);
  let peak = 0;
  let maxDD = 0;
  let maxDDPct = 0;
  let absDD = 0;
  let relDD = 0;
  let relDDPct = 0;

  for (const pt of eq) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak - pt.equity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = ddPct;
    }
    if (ddPct > relDDPct) {
      relDDPct = ddPct;
      relDD = dd;
    }
    if (pt.equity < 0 && Math.abs(pt.equity) > absDD) {
      absDD = Math.abs(pt.equity);
    }
  }

  // Consecutive wins/losses
  let curWinStreak = 0;
  let curLossStreak = 0;
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWinAmount = 0;
  let curLossAmount = 0;
  let maxConsecWinAmount = 0;
  let maxConsecLossAmount = 0;
  let totalWinStreaks = 0;
  let winStreakCount = 0;
  let totalLossStreaks = 0;
  let lossStreakCount = 0;

  for (const t of sorted) {
    if (t.pnl == null) continue;
    if (t.pnl > 0) {
      curWinStreak += 1;
      curWinAmount += t.pnl;
      if (curLossStreak > 0) {
        if (curLossStreak > maxConsecLosses) maxConsecLosses = curLossStreak;
        if (curLossAmount > maxConsecLossAmount) maxConsecLossAmount = curLossAmount;
        totalLossStreaks += curLossStreak;
        lossStreakCount += 1;
        curLossStreak = 0;
        curLossAmount = 0;
      }
    } else if (t.pnl < 0) {
      curLossStreak += 1;
      curLossAmount += Math.abs(t.pnl);
      if (curWinStreak > 0) {
        if (curWinStreak > maxConsecWins) maxConsecWins = curWinStreak;
        if (curWinAmount > maxConsecWinAmount) maxConsecWinAmount = curWinAmount;
        totalWinStreaks += curWinStreak;
        winStreakCount += 1;
        curWinStreak = 0;
        curWinAmount = 0;
      }
    }
  }
  if (curWinStreak > maxConsecWins) maxConsecWins = curWinStreak;
  if (curWinAmount > maxConsecWinAmount) maxConsecWinAmount = curWinAmount;
  if (curLossStreak > maxConsecLosses) maxConsecLosses = curLossStreak;
  if (curLossAmount > maxConsecLossAmount) maxConsecLossAmount = curLossAmount;
  if (curWinStreak > 0) { totalWinStreaks += curWinStreak; winStreakCount += 1; }
  if (curLossStreak > 0) { totalLossStreaks += curLossStreak; lossStreakCount += 1; }

  // Sharpe ratio (daily returns)
  const dailyMap = new Map<string, number>();
  for (const t of sorted) {
    const d = t.trade_date ?? "unknown";
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + (t.pnl ?? 0));
  }
  const dailyReturns = [...dailyMap.values()];
  const meanReturn = dailyReturns.length ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  // Longs / shorts
  const longs = sorted.filter((t) => t.side === "long");
  const shorts = sorted.filter((t) => t.side === "short");
  const longWinPct = longs.length ? winRate(longs) : 0;
  const shortWinPct = shorts.length ? winRate(shorts) : 0;

  // Hold times
  function holdSec(t: TradeRow): number | null {
    if (t.duration_seconds != null && t.duration_seconds > 0) return t.duration_seconds;
    if (t.open_time && t.close_time) {
      const d = (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 1000;
      return d > 0 ? d : null;
    }
    return null;
  }
  function avgHold(rows: TradeRow[]): number {
    const durations = rows.map(holdSec).filter((d): d is number => d !== null);
    return durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
  }

  const wr = winRate(sorted);

  return {
    totalTrades: sorted.length,
    totalNetProfit: totalNet,
    grossProfit,
    grossLoss,
    profitFactor: pf,
    expectedPayoff,
    absoluteDrawdown: absDD,
    maximalDrawdown: maxDD,
    maximalDrawdownPct: maxDDPct,
    relativeDrawdown: relDD,
    relativeDrawdownPct: relDDPct,
    winRate: wr,
    lossRate: 100 - wr,
    winCount: w.length,
    lossCount: l.length,
    largestWin,
    largestLoss,
    avgWin: avgWin(sorted),
    avgLoss: avgLoss(sorted),
    maxConsecWins,
    maxConsecLosses,
    maxConsecWinAmount,
    maxConsecLossAmount,
    avgConsecWins: winStreakCount > 0 ? totalWinStreaks / winStreakCount : 0,
    avgConsecLosses: lossStreakCount > 0 ? totalLossStreaks / lossStreakCount : 0,
    sharpeRatio: sharpe,
    recoveryFactor: recoveryFactor(sorted),
    longCount: longs.length,
    shortCount: shorts.length,
    longWinPct,
    shortWinPct,
    avgHoldSeconds: avgHold(sorted),
    avgWinHoldSeconds: avgHold(w),
    avgLossHoldSeconds: avgHold(l)
  };
}

// ---------------------------------------------------------------------
// Bucketing — per-hour / per-weekday / per-month
// ---------------------------------------------------------------------

export type BucketEntry = {
  label: string;
  winCount: number;
  lossCount: number;
  winPnl: number;
  lossPnl: number;
  totalTrades: number;
  netPnl: number;
};

function bucketTrades(
  trades: TradeRow[],
  keyFn: (t: TradeRow) => string | null
): BucketEntry[] {
  const map = new Map<string, { wins: TradeRow[]; losses: TradeRow[] }>();
  for (const t of trades) {
    const k = keyFn(t);
    if (k === null) continue;
    const entry = map.get(k) ?? { wins: [], losses: [] };
    if ((t.pnl ?? 0) > 0) entry.wins.push(t);
    else if ((t.pnl ?? 0) < 0) entry.losses.push(t);
    map.set(k, entry);
  }
  return [...map.entries()].map(([label, { wins, losses }]) => ({
    label,
    winCount: wins.length,
    lossCount: losses.length,
    winPnl: wins.reduce((s, t) => s + (t.pnl ?? 0), 0),
    lossPnl: Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0)),
    totalTrades: wins.length + losses.length,
    netPnl: wins.reduce((s, t) => s + (t.pnl ?? 0), 0) + losses.reduce((s, t) => s + (t.pnl ?? 0), 0)
  }));
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");

export function bucketsByHour(trades: TradeRow[]): BucketEntry[] {
  const raw = bucketTrades(trades, (t) => {
    const time = t.open_time ?? t.close_time;
    if (!time) return null;
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return null;
    return String(d.getUTCHours()).padStart(2, "0") + ":00";
  });
  const map = new Map(raw.map((r) => [r.label, r]));
  return HOUR_LABELS.map(
    (h) => map.get(h) ?? { label: h, winCount: 0, lossCount: 0, winPnl: 0, lossPnl: 0, totalTrades: 0, netPnl: 0 }
  );
}

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function bucketsByWeekday(trades: TradeRow[]): BucketEntry[] {
  const raw = bucketTrades(trades, (t) => {
    if (!t.trade_date) return null;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { weekday: "long" });
  });
  const map = new Map(raw.map((r) => [r.label, r]));
  return WEEKDAY_LABELS.map(
    (w) => map.get(w) ?? { label: w, winCount: 0, lossCount: 0, winPnl: 0, lossPnl: 0, totalTrades: 0, netPnl: 0 }
  );
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function bucketsByMonth(trades: TradeRow[]): BucketEntry[] {
  const raw = bucketTrades(trades, (t) => {
    if (!t.trade_date) return null;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { month: "long" });
  });
  const map = new Map(raw.map((r) => [r.label, r]));
  return MONTH_LABELS.map(
    (m) => map.get(m) ?? { label: m, winCount: 0, lossCount: 0, winPnl: 0, lossPnl: 0, totalTrades: 0, netPnl: 0 }
  );
}

// ---------------------------------------------------------------------
// Lunar Phase Analytics
// ---------------------------------------------------------------------

export type LunarPhase = "New Moon" | "Waxing Crescent" | "First Quarter" | "Waxing Gibbous"
  | "Full Moon" | "Waning Gibbous" | "Last Quarter" | "Waning Crescent";

const LUNAR_CYCLE_DAYS = 29.53059;

function lunarAge(date: Date): number {
  const known = new Date("2000-01-06T18:14:00Z");
  const diff = (date.getTime() - known.getTime()) / 86_400_000;
  return ((diff % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
}

export function lunarPhaseForDate(date: Date): LunarPhase {
  const age = lunarAge(date);
  const frac = age / LUNAR_CYCLE_DAYS;
  if (frac < 0.0625) return "New Moon";
  if (frac < 0.1875) return "Waxing Crescent";
  if (frac < 0.3125) return "First Quarter";
  if (frac < 0.4375) return "Waxing Gibbous";
  if (frac < 0.5625) return "Full Moon";
  if (frac < 0.6875) return "Waning Gibbous";
  if (frac < 0.8125) return "Last Quarter";
  if (frac < 0.9375) return "Waning Crescent";
  return "New Moon";
}

export const LUNAR_PHASE_GLYPHS: Record<LunarPhase, string> = {
  "New Moon": "\u{1F311}",
  "Waxing Crescent": "\u{1F312}",
  "First Quarter": "\u{1F313}",
  "Waxing Gibbous": "\u{1F314}",
  "Full Moon": "\u{1F315}",
  "Waning Gibbous": "\u{1F316}",
  "Last Quarter": "\u{1F317}",
  "Waning Crescent": "\u{1F318}"
};

export type LunarPhasePerformance = {
  phase: LunarPhase;
  glyph: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  avgPnl: number;
  profitFactor: number;
};

export function performanceByLunarPhase(trades: TradeRow[]): LunarPhasePerformance[] {
  const phaseMap = new Map<LunarPhase, TradeRow[]>();
  for (const t of trades) {
    if (!t.trade_date) continue;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) continue;
    const phase = lunarPhaseForDate(d);
    const arr = phaseMap.get(phase) ?? [];
    arr.push(t);
    phaseMap.set(phase, arr);
  }

  const phases: LunarPhase[] = [
    "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
  ];

  return phases.map((phase) => {
    const rows = phaseMap.get(phase) ?? [];
    const w = rows.filter((t) => (t.pnl ?? 0) > 0);
    const l = rows.filter((t) => (t.pnl ?? 0) < 0);
    const net = netPnl(rows);
    const gross = w.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const lossAbs = Math.abs(l.reduce((s, t) => s + (t.pnl ?? 0), 0));
    return {
      phase,
      glyph: LUNAR_PHASE_GLYPHS[phase],
      trades: rows.length,
      wins: w.length,
      losses: l.length,
      netPnl: net,
      winRate: winRate(rows),
      avgPnl: rows.length ? net / rows.length : 0,
      profitFactor: lossAbs > 0 ? gross / lossAbs : gross > 0 ? gross : 0
    };
  });
}
