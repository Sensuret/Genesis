// =====================================================================
// GƎNƎSIS Prop Firm Challenge Simulator
// Replays user trades against a configurable rule set and reports
// pass/fail with the failure reason and the day it would have happened.
// =====================================================================

import type { TradeRow } from "@/lib/supabase/types";
import { dailyPnl, sortByDate } from "@/lib/analytics";

export type PropRules = {
  accountSize: number;
  dailyDdPct: number;       // e.g. 4 for FTMO-style 4% daily
  maxDdPct: number;         // overall, e.g. 8
  profitTargetPct?: number; // optional pass condition
  trailingDd?: boolean;     // false = static, true = trailing peak
  minTradingDays?: number;  // e.g. 5 days
  weekendHoldAllowed?: boolean;
};

export const DEFAULT_RULES: PropRules = {
  accountSize: 100_000,
  dailyDdPct: 4,
  maxDdPct: 8,
  profitTargetPct: 8,
  trailingDd: false,
  minTradingDays: 0,
  weekendHoldAllowed: true
};

export type SimDay = {
  date: string;
  pnl: number;
  equity: number;
  peak: number;
  dailyStartEquity: number;
  status: "ok" | "daily-dd-breach" | "max-dd-breach" | "target-hit";
};

export type SimResult = {
  passed: boolean;
  reason: string;
  finishedAt: string | null;
  finalEquity: number;
  highestEquity: number;
  worstDailyDdPct: number;
  worstOverallDdPct: number;
  tradingDays: number;
  days: SimDay[];
};

// =====================================================================
// Multi-phase challenge simulator
// =====================================================================
export type DdMode = "balance" | "equity";

export type PhaseRules = {
  name: string;            // e.g. "Phase 1", "Phase 2", "Funded"
  profitTargetPct: number; // 0 for funded / no target
  dailyDdPct: number;      // 0 means no daily DD (single-phase / funded)
  maxDdPct: number;
  maxDdMode: DdMode;       // "balance" = static from start; "equity" = trailing peak
  minTradingDays?: number;
};

export type MultiPhaseRules = {
  accountSize: number;
  phases: PhaseRules[];
  // True = single-phase / instant funding accounts use equity-based all the way
  singlePhaseEquityOnly?: boolean;
};

export type PhaseResult = SimResult & {
  phaseName: string;
  startEquity: number;
};

export type MultiPhaseResult = {
  passedAllPhases: boolean;
  failedAt: string | null;     // phase name where it failed
  phases: PhaseResult[];
  totalDays: number;
};

/**
 * Simulate a multi-phase prop challenge sequentially. Trades are partitioned
 * by trading-day, and we attempt Phase 1 first; if passed, the surviving
 * trades from the day-after-pass continue into Phase 2; etc.
 */
export function simulateMultiPhaseChallenge(
  trades: TradeRow[],
  config: MultiPhaseRules
): MultiPhaseResult {
  const sorted = sortByDate(trades);
  const days = dailyPnl(sorted);
  let cursor = 0;
  let baseEquity = config.accountSize;
  const phases: PhaseResult[] = [];

  for (let i = 0; i < config.phases.length; i++) {
    const phase = config.phases[i];
    const slice = days.slice(cursor);
    const sub = simulateSinglePhaseFromDays(slice, baseEquity, phase, !!config.singlePhaseEquityOnly && config.phases.length === 1);
    phases.push({ ...sub, phaseName: phase.name, startEquity: baseEquity });

    if (!sub.passed) {
      return {
        passedAllPhases: false,
        failedAt: phase.name,
        phases,
        totalDays: phases.reduce((s, p) => s + p.tradingDays, 0)
      };
    }

    // Advance cursor to the day AFTER the pass day; carry equity forward.
    if (sub.finishedAt) {
      const idx = slice.findIndex((d) => d.date === sub.finishedAt);
      cursor += Math.max(0, idx + 1);
    } else {
      cursor += sub.tradingDays;
    }
    baseEquity = sub.finalEquity;
  }

  return {
    passedAllPhases: true,
    failedAt: null,
    phases,
    totalDays: phases.reduce((s, p) => s + p.tradingDays, 0)
  };
}

function simulateSinglePhaseFromDays(
  days: { date: string; pnl: number }[],
  startEquity: number,
  rules: PhaseRules,
  forceEquity: boolean
): SimResult {
  const dailyLimit = (rules.dailyDdPct / 100) * startEquity;
  const maxLimit = (rules.maxDdPct / 100) * startEquity;
  const target = rules.profitTargetPct > 0
    ? (rules.profitTargetPct / 100) * startEquity
    : Number.POSITIVE_INFINITY;
  const useEquityDd = forceEquity || rules.maxDdMode === "equity";

  let equity = startEquity;
  let peak = startEquity;
  let worstDailyDd = 0;
  let worstOverallDd = 0;
  let passed = false;
  let reason = "Did not reach profit target within remaining trade history.";
  let finishedAt: string | null = null;
  const log: SimDay[] = [];

  for (const day of days) {
    const dailyStart = equity;
    equity += day.pnl;
    if (equity > peak) peak = equity;

    const dailyDd = dailyStart - equity;
    const overallBase = useEquityDd ? peak : startEquity;
    const overallDd = overallBase - equity;
    if (dailyDd > worstDailyDd) worstDailyDd = dailyDd;
    if (overallDd > worstOverallDd) worstOverallDd = overallDd;

    let status: SimDay["status"] = "ok";
    if (rules.dailyDdPct > 0 && dailyDd >= dailyLimit) status = "daily-dd-breach";
    else if (overallDd >= maxLimit) status = "max-dd-breach";
    else if (equity - startEquity >= target) status = "target-hit";

    log.push({
      date: day.date,
      pnl: day.pnl,
      equity,
      peak,
      dailyStartEquity: dailyStart,
      status
    });

    if (status === "daily-dd-breach") {
      reason = `${rules.name}: daily drawdown of ${rules.dailyDdPct}% breached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
    if (status === "max-dd-breach") {
      reason = `${rules.name}: max ${useEquityDd ? "equity" : "balance"} drawdown of ${rules.maxDdPct}% breached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
    if (status === "target-hit") {
      passed = true;
      reason = `${rules.name}: profit target of ${rules.profitTargetPct}% reached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
  }

  if (!finishedAt) {
    if (rules.minTradingDays && log.length < rules.minTradingDays) {
      passed = false;
      reason = `${rules.name}: only ${log.length} trading days, minimum is ${rules.minTradingDays}.`;
    } else if (rules.profitTargetPct === 0) {
      // Funded phase has no target — survived all trades = passed
      passed = true;
      reason = `${rules.name}: survived all trades without breach (funded — no target).`;
    }
  }

  return {
    passed,
    reason,
    finishedAt,
    finalEquity: equity,
    highestEquity: peak,
    worstDailyDdPct: (worstDailyDd / startEquity) * 100,
    worstOverallDdPct: (worstOverallDd / startEquity) * 100,
    tradingDays: log.length,
    days: log
  };
}

// =====================================================================
// Lot-size calculator
// =====================================================================
export type LotSizeInput = {
  accountSize: number;
  riskPct: number;            // % of account to risk per trade
  stopDistance: number;       // distance to SL — units depend on quoteUnit
  pipValuePerLot: number;     // $ value of 1 unit move per 1.0 lot
};

export type LotSizeResult = {
  riskAmount: number;
  recommendedLots: number;
  lotsRoundedDown: number;
};

export function calculateLotSize(input: LotSizeInput): LotSizeResult {
  const risk = (input.riskPct / 100) * input.accountSize;
  if (input.stopDistance <= 0 || input.pipValuePerLot <= 0) {
    return { riskAmount: risk, recommendedLots: 0, lotsRoundedDown: 0 };
  }
  const lots = risk / (input.stopDistance * input.pipValuePerLot);
  return {
    riskAmount: risk,
    recommendedLots: lots,
    lotsRoundedDown: Math.floor(lots * 100) / 100
  };
}

// =====================================================================
// Time-to-pass estimator
// =====================================================================
export type TimeToPassInput = {
  accountSize: number;
  profitTargetPct: number;
  recentTrades: TradeRow[];
  tradingDaysPerWeek?: number; // default 5
};

export type TimeToPassResult = {
  avgDailyPnl: number;
  tradingDays: number;
  calendarDays: number;
  weeks: number;
  months: number;
  achievable: boolean;
  note: string;
};

export function estimateTimeToPass(input: TimeToPassInput): TimeToPassResult {
  const days = dailyPnl(input.recentTrades);
  const target = (input.profitTargetPct / 100) * input.accountSize;
  if (!days.length) {
    return {
      avgDailyPnl: 0,
      tradingDays: 0,
      calendarDays: 0,
      weeks: 0,
      months: 0,
      achievable: false,
      note: "No trade history yet — can't estimate."
    };
  }
  const avg = days.reduce((s, d) => s + d.pnl, 0) / days.length;
  if (avg <= 0) {
    return {
      avgDailyPnl: avg,
      tradingDays: 0,
      calendarDays: 0,
      weeks: 0,
      months: 0,
      achievable: false,
      note: "Average daily P&L is non-positive — at this performance, you would not pass."
    };
  }
  const tradingDays = Math.ceil(target / avg);
  const tdPerWeek = input.tradingDaysPerWeek ?? 5;
  const calendarDays = Math.ceil((tradingDays / tdPerWeek) * 7);
  const weeks = Math.ceil(tradingDays / tdPerWeek);
  const months = Math.ceil(weeks / 4.345);
  return {
    avgDailyPnl: avg,
    tradingDays,
    calendarDays,
    weeks,
    months,
    achievable: true,
    note: `Based on avg daily P&L of $${avg.toFixed(2)} from ${days.length} trading days.`
  };
}

export function simulatePropChallenge(trades: TradeRow[], rules: PropRules = DEFAULT_RULES): SimResult {
  const sorted = sortByDate(trades);
  const days = dailyPnl(sorted);
  const dailyLimit = (rules.dailyDdPct / 100) * rules.accountSize;
  const maxLimit = (rules.maxDdPct / 100) * rules.accountSize;
  const target = rules.profitTargetPct
    ? (rules.profitTargetPct / 100) * rules.accountSize
    : Number.POSITIVE_INFINITY;

  let equity = rules.accountSize;
  let peak = rules.accountSize;
  let worstDailyDd = 0;
  let worstOverallDd = 0;
  let passed = false;
  let reason = "Survived all sessions without breach.";
  let finishedAt: string | null = null;
  const log: SimDay[] = [];

  for (const day of days) {
    const dailyStart = equity;
    equity += day.pnl;
    if (equity > peak) peak = equity;

    const dailyDd = dailyStart - equity;
    const overallBase = rules.trailingDd ? peak : rules.accountSize;
    const overallDd = overallBase - equity;

    if (dailyDd > worstDailyDd) worstDailyDd = dailyDd;
    if (overallDd > worstOverallDd) worstOverallDd = overallDd;

    let status: SimDay["status"] = "ok";
    if (dailyDd >= dailyLimit) status = "daily-dd-breach";
    else if (overallDd >= maxLimit) status = "max-dd-breach";
    else if (equity - rules.accountSize >= target) status = "target-hit";

    log.push({
      date: day.date,
      pnl: day.pnl,
      equity,
      peak,
      dailyStartEquity: dailyStart,
      status
    });

    if (status === "daily-dd-breach") {
      reason = `Daily drawdown of ${rules.dailyDdPct}% breached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
    if (status === "max-dd-breach") {
      reason = `Max drawdown of ${rules.maxDdPct}% breached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
    if (status === "target-hit") {
      passed = true;
      reason = `Profit target of ${rules.profitTargetPct ?? "—"}% reached on ${day.date}.`;
      finishedAt = day.date;
      break;
    }
  }

  if (!finishedAt) {
    if (rules.minTradingDays && log.length < rules.minTradingDays) {
      passed = false;
      reason = `Only ${log.length} trading days — minimum is ${rules.minTradingDays}.`;
    } else {
      passed = equity - rules.accountSize >= target;
      reason = passed
        ? "Passed: profit target reached without breach."
        : "Did not reach profit target within trade history.";
    }
  }

  return {
    passed,
    reason,
    finishedAt,
    finalEquity: equity,
    highestEquity: peak,
    worstDailyDdPct: (worstDailyDd / rules.accountSize) * 100,
    worstOverallDdPct: (worstOverallDd / rules.accountSize) * 100,
    tradingDays: log.length,
    days: log
  };
}
