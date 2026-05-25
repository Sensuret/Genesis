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

// ---------------------------------------------------------------------
// Zodiac Season helpers
// ---------------------------------------------------------------------

export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

const ZODIAC_SIGNS: ZodiacSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  Aries: "\u2648", Taurus: "\u2649", Gemini: "\u264A", Cancer: "\u264B",
  Leo: "\u264C", Virgo: "\u264D", Libra: "\u264E", Scorpio: "\u264F",
  Sagittarius: "\u2650", Capricorn: "\u2651", Aquarius: "\u2652", Pisces: "\u2653"
};

function zodiacSeasonForDate(d: Date): ZodiacSign {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "Aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "Taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "Gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "Cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "Leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "Virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "Libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "Scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "Sagittarius";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "Capricorn";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
}

export type ZodiacSeasonPerformance = {
  sign: ZodiacSign;
  glyph: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  avgPnl: number;
  profitFactor: number;
};

export function performanceByZodiacSeason(trades: TradeRow[]): ZodiacSeasonPerformance[] {
  const map = new Map<ZodiacSign, TradeRow[]>();
  for (const t of trades) {
    if (!t.trade_date) continue;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) continue;
    const sign = zodiacSeasonForDate(d);
    const arr = map.get(sign) ?? [];
    arr.push(t);
    map.set(sign, arr);
  }

  return ZODIAC_SIGNS.map((sign) => {
    const rows = map.get(sign) ?? [];
    const w = rows.filter((t) => (t.pnl ?? 0) > 0);
    const l = rows.filter((t) => (t.pnl ?? 0) < 0);
    const net = netPnl(rows);
    const gross = w.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const lossAbs = Math.abs(l.reduce((s, t) => s + (t.pnl ?? 0), 0));
    return {
      sign,
      glyph: ZODIAC_GLYPHS[sign],
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

// ---------------------------------------------------------------------
// Mercury Retrograde Analytics
// ---------------------------------------------------------------------

type RetrogradePeriod = { start: Date; end: Date };

const MERCURY_RETROGRADES: RetrogradePeriod[] = [
  { start: new Date("2020-02-17"), end: new Date("2020-03-10") },
  { start: new Date("2020-06-18"), end: new Date("2020-07-12") },
  { start: new Date("2020-10-14"), end: new Date("2020-11-03") },
  { start: new Date("2021-01-30"), end: new Date("2021-02-21") },
  { start: new Date("2021-05-29"), end: new Date("2021-06-22") },
  { start: new Date("2021-09-27"), end: new Date("2021-10-18") },
  { start: new Date("2022-01-14"), end: new Date("2022-02-04") },
  { start: new Date("2022-05-10"), end: new Date("2022-06-03") },
  { start: new Date("2022-09-10"), end: new Date("2022-10-02") },
  { start: new Date("2022-12-29"), end: new Date("2023-01-18") },
  { start: new Date("2023-04-21"), end: new Date("2023-05-15") },
  { start: new Date("2023-08-23"), end: new Date("2023-09-15") },
  { start: new Date("2023-12-13"), end: new Date("2024-01-02") },
  { start: new Date("2024-04-01"), end: new Date("2024-04-25") },
  { start: new Date("2024-08-05"), end: new Date("2024-08-28") },
  { start: new Date("2024-11-26"), end: new Date("2024-12-15") },
  { start: new Date("2025-03-15"), end: new Date("2025-04-07") },
  { start: new Date("2025-07-18"), end: new Date("2025-08-11") },
  { start: new Date("2025-11-09"), end: new Date("2025-11-29") },
  { start: new Date("2026-03-02"), end: new Date("2026-03-23") },
  { start: new Date("2026-07-02"), end: new Date("2026-07-26") },
  { start: new Date("2026-10-24"), end: new Date("2026-11-13") }
];

function isInMercuryRetrograde(d: Date): boolean {
  return MERCURY_RETROGRADES.some((p) => d >= p.start && d <= p.end);
}

export type RetroGradePerformance = {
  label: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  avgPnl: number;
  profitFactor: number;
};

export function performanceDuringRetrograde(trades: TradeRow[]): {
  retrograde: RetroGradePerformance;
  direct: RetroGradePerformance;
  winRateDelta: number;
  pnlDelta: number;
} {
  const retro: TradeRow[] = [];
  const direct: TradeRow[] = [];

  for (const t of trades) {
    if (!t.trade_date) continue;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) continue;
    if (isInMercuryRetrograde(d)) retro.push(t);
    else direct.push(t);
  }

  function summarise(label: string, rows: TradeRow[]): RetroGradePerformance {
    const w = rows.filter((t) => (t.pnl ?? 0) > 0);
    const l = rows.filter((t) => (t.pnl ?? 0) < 0);
    const net = netPnl(rows);
    const gross = w.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const lossAbs = Math.abs(l.reduce((s, t) => s + (t.pnl ?? 0), 0));
    return {
      label,
      trades: rows.length,
      wins: w.length,
      losses: l.length,
      netPnl: net,
      winRate: winRate(rows),
      avgPnl: rows.length ? net / rows.length : 0,
      profitFactor: lossAbs > 0 ? gross / lossAbs : gross > 0 ? gross : 0
    };
  }

  const retroStats = summarise("Mercury Retrograde", retro);
  const directStats = summarise("Mercury Direct", direct);

  return {
    retrograde: retroStats,
    direct: directStats,
    winRateDelta: retroStats.winRate - directStats.winRate,
    pnlDelta: retroStats.avgPnl - directStats.avgPnl
  };
}

// ---------------------------------------------------------------------
// Retrograde Heatmap — monthly retrograde performance matrix
// ---------------------------------------------------------------------

export type RetroHeatmapCell = {
  month: string;
  year: number;
  isRetrograde: boolean;
  trades: number;
  netPnl: number;
  winRate: number;
};

export function retrogradeHeatmap(trades: TradeRow[]): RetroHeatmapCell[] {
  const cells: RetroHeatmapCell[] = [];
  const byYearMonth = new Map<string, TradeRow[]>();

  for (const t of trades) {
    if (!t.trade_date) continue;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const arr = byYearMonth.get(key) ?? [];
    arr.push(t);
    byYearMonth.set(key, arr);
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const [key, rows] of byYearMonth) {
    const [yearStr, monthStr] = key.split("-");
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const midMonth = new Date(year, monthIdx, 15);
    const retro = isInMercuryRetrograde(midMonth);
    const net = netPnl(rows);
    cells.push({
      month: monthNames[monthIdx],
      year,
      isRetrograde: retro,
      trades: rows.length,
      netPnl: net,
      winRate: winRate(rows)
    });
  }

  cells.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
  });

  return cells;
}

// ---------------------------------------------------------------------
// Planetary Transit Performance (simplified — Sun transit through signs)
// ---------------------------------------------------------------------

export type TransitPerformance = {
  transit: string;
  glyph: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  avgPnl: number;
};

export function performanceByPlanetaryTransit(trades: TradeRow[]): TransitPerformance[] {
  const map = new Map<ZodiacSign, TradeRow[]>();
  for (const t of trades) {
    if (!t.trade_date) continue;
    const d = new Date(t.trade_date);
    if (Number.isNaN(d.getTime())) continue;
    const sign = zodiacSeasonForDate(d);
    const arr = map.get(sign) ?? [];
    arr.push(t);
    map.set(sign, arr);
  }

  return ZODIAC_SIGNS.map((sign) => {
    const rows = map.get(sign) ?? [];
    const w = rows.filter((t) => (t.pnl ?? 0) > 0);
    const net = netPnl(rows);
    return {
      transit: `Sun in ${sign}`,
      glyph: ZODIAC_GLYPHS[sign],
      trades: rows.length,
      wins: w.length,
      losses: rows.length - w.length,
      netPnl: net,
      winRate: winRate(rows),
      avgPnl: rows.length ? net / rows.length : 0
    };
  });
}

// ---------------------------------------------------------------------
// Best Cosmic Trading Windows
// ---------------------------------------------------------------------

export type CosmicWindow = {
  label: string;
  glyph: string;
  winRate: number;
  avgPnl: number;
  trades: number;
  netPnl: number;
};

export function bestCosmicWindows(trades: TradeRow[]): CosmicWindow[] {
  const lunarPerf = performanceByLunarPhase(trades);
  const zodiacPerf = performanceByZodiacSeason(trades);
  const retroPerf = performanceDuringRetrograde(trades);

  const windows: CosmicWindow[] = [];

  for (const p of lunarPerf) {
    if (p.trades > 0) {
      windows.push({
        label: p.phase,
        glyph: p.glyph,
        winRate: p.winRate,
        avgPnl: p.avgPnl,
        trades: p.trades,
        netPnl: p.netPnl
      });
    }
  }

  for (const z of zodiacPerf) {
    if (z.trades > 0) {
      windows.push({
        label: `${z.sign} season`,
        glyph: z.glyph,
        winRate: z.winRate,
        avgPnl: z.avgPnl,
        trades: z.trades,
        netPnl: z.netPnl
      });
    }
  }

  if (retroPerf.retrograde.trades > 0) {
    windows.push({
      label: "Mercury Retrograde",
      glyph: "\u263F",
      winRate: retroPerf.retrograde.winRate,
      avgPnl: retroPerf.retrograde.avgPnl,
      trades: retroPerf.retrograde.trades,
      netPnl: retroPerf.retrograde.netPnl
    });
  }
  if (retroPerf.direct.trades > 0) {
    windows.push({
      label: "Mercury Direct",
      glyph: "\u263F",
      winRate: retroPerf.direct.winRate,
      avgPnl: retroPerf.direct.avgPnl,
      trades: retroPerf.direct.trades,
      netPnl: retroPerf.direct.netPnl
    });
  }

  windows.sort((a, b) => b.winRate - a.winRate);
  return windows;
}

// ---------------------------------------------------------------------
// Cosmic Insight Statements
// ---------------------------------------------------------------------

export type CosmicInsight = {
  icon: string;
  text: string;
  tone: "positive" | "negative" | "neutral";
};

export function generateCosmicInsights(trades: TradeRow[]): CosmicInsight[] {
  const insights: CosmicInsight[] = [];
  if (trades.length < 3) return insights;

  const retroPerf = performanceDuringRetrograde(trades);
  if (retroPerf.retrograde.trades >= 2 && retroPerf.direct.trades >= 2) {
    const delta = retroPerf.winRateDelta;
    if (Math.abs(delta) >= 3) {
      insights.push({
        icon: "\u263F",
        text: delta < 0
          ? `Win rate drops ${Math.abs(delta).toFixed(0)}% during Mercury Retrograde`
          : `Win rate rises ${delta.toFixed(0)}% during Mercury Retrograde`,
        tone: delta < 0 ? "negative" : "positive"
      });
    }
  }

  const lunarPerf = performanceByLunarPhase(trades);
  const activeLunar = lunarPerf.filter((p) => p.trades >= 2);
  if (activeLunar.length > 0) {
    const bestPhase = activeLunar.reduce((b, p) => (p.winRate > b.winRate ? p : b));
    const worstPhase = activeLunar.reduce((w, p) => (p.winRate < w.winRate ? p : w));
    if (bestPhase.winRate > 0) {
      insights.push({
        icon: bestPhase.glyph,
        text: `Best performance occurs during ${bestPhase.phase} phases (${bestPhase.winRate.toFixed(0)}% win rate)`,
        tone: "positive"
      });
    }
    if (worstPhase.winRate < 100 && worstPhase.phase !== bestPhase.phase) {
      insights.push({
        icon: worstPhase.glyph,
        text: `Weakest results during ${worstPhase.phase} (${worstPhase.winRate.toFixed(0)}% win rate)`,
        tone: "negative"
      });
    }
  }

  const zodiacPerf = performanceByZodiacSeason(trades);
  const activeZodiac = zodiacPerf.filter((z) => z.trades >= 2);
  if (activeZodiac.length > 0) {
    const bestSign = activeZodiac.reduce((b, z) => (z.netPnl > b.netPnl ? z : b));
    if (bestSign.netPnl > 0) {
      insights.push({
        icon: bestSign.glyph,
        text: `Highest profits during ${bestSign.sign} season`,
        tone: "positive"
      });
    }
  }

  if (retroPerf.retrograde.trades >= 2) {
    const retroAvg = retroPerf.retrograde.avgPnl;
    const directAvg = retroPerf.direct.avgPnl;
    if (retroAvg < directAvg && retroPerf.direct.trades >= 2) {
      insights.push({
        icon: "\u26A0",
        text: `Average P&L is lower during retrograde periods — consider reducing position size`,
        tone: "negative"
      });
    }
  }

  if (activeLunar.length >= 4) {
    const waxing = activeLunar.filter((p) => p.phase.startsWith("Waxing") || p.phase === "First Quarter");
    const waning = activeLunar.filter((p) => p.phase.startsWith("Waning") || p.phase === "Last Quarter");
    const waxWr = waxing.length > 0 ? waxing.reduce((s, p) => s + p.winRate, 0) / waxing.length : 0;
    const wanWr = waning.length > 0 ? waning.reduce((s, p) => s + p.winRate, 0) / waning.length : 0;
    if (Math.abs(waxWr - wanWr) >= 5) {
      insights.push({
        icon: waxWr > wanWr ? "\u{1F312}" : "\u{1F316}",
        text: waxWr > wanWr
          ? `Waxing moon phases outperform waning by ${(waxWr - wanWr).toFixed(0)}pp`
          : `Waning moon phases outperform waxing by ${(wanWr - waxWr).toFixed(0)}pp`,
        tone: "neutral"
      });
    }
  }

  return insights;
}

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
