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
