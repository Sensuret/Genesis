// =====================================================================
// GƎNƎSIS Prop Firm Challenge Simulator
// Replays user trades against a configurable rule set with 1/2/3-phase
// support. Reports per-phase pass/fail with the failure reason and the
// day it would have happened.
// =====================================================================

import type { TradeRow } from "@/lib/supabase/types";
import { dailyPnl, sortByDate } from "@/lib/analytics";

export type PhaseRule = {
  /** Profit target in % of the original account size (e.g. 8 = 8%). */
  profitTargetPct: number;
};

export type PropRules = {
  accountSize: number;
  /** Daily drawdown ceiling as % of original size. Use 0 for "no daily DD". */
  dailyDdPct: number;
  /** Max overall drawdown as % of original size. */
  maxDdPct: number;
  trailingDd?: boolean;       // false = static, true = trailing peak
  minTradingDays?: number;    // e.g. 5 days per phase
  weekendHoldAllowed?: boolean;
  /** 1, 2 or 3 phases. Each phase resets equity to account size, walks forward in time. */
  phases: PhaseRule[];
};

export const ACCOUNT_SIZES = [
  2_000, 5_000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000, 400_000, 500_000
] as const;

export const DAILY_DD_OPTIONS = [0, 4, 5] as const;
export const MAX_DD_OPTIONS = [8, 10, 12] as const;

/** Sensible defaults — FTMO-style 2-phase 100k. */
export const DEFAULT_RULES: PropRules = {
  accountSize: 100_000,
  dailyDdPct: 5,
  maxDdPct: 10,
  trailingDd: false,
  minTradingDays: 5,
  weekendHoldAllowed: true,
  phases: [{ profitTargetPct: 8 }, { profitTargetPct: 5 }]
};

/** Default per-phase targets keyed by phase count, used when the user toggles phase count. */
export const DEFAULT_PHASE_TARGETS: Record<1 | 2 | 3, number[]> = {
  1: [10],
  2: [8, 5],
  3: [8, 5, 2]
};

export type SimDay = {
  date: string;
  pnl: number;
  equity: number;
  peak: number;
  dailyStartEquity: number;
  status: "ok" | "daily-dd-breach" | "max-dd-breach" | "target-hit";
};

export type PhaseResult = {
  phaseIndex: number;
  phaseLabel: string;
  passed: boolean;
  reason: string;
  finishedAt: string | null;
  startEquity: number;
  finalEquity: number;
  highestEquity: number;
  worstDailyDdPct: number;
  worstOverallDdPct: number;
  tradingDays: number;
  days: SimDay[];
  /** Date the phase started consuming trades (inclusive). */
  startedAt: string | null;
};

export type SimResult = {
  passedAll: boolean;
  phases: PhaseResult[];
  /** Convenience aggregations for top-level UI. */
  passed: boolean;       // true if ALL phases passed
  reason: string;        // first failure reason or "All phases cleared."
  finishedAt: string | null;
  finalEquity: number;
  highestEquity: number;
  worstDailyDdPct: number;
  worstOverallDdPct: number;
  tradingDays: number;
  days: SimDay[];        // concatenated logs across phases
};

/**
 * Walks user trades through each phase sequentially. Each phase resets
 * equity to the account size and consumes trades from where the previous
 * phase stopped (the day after the target was hit, or all remaining trades
 * if the previous phase was the last one to pass).
 */
export function simulatePropChallenge(trades: TradeRow[], rules: PropRules = DEFAULT_RULES): SimResult {
  const sorted = sortByDate(trades);
  const allDays = dailyPnl(sorted);
  const dailyLimit = (rules.dailyDdPct > 0 ? rules.dailyDdPct / 100 : 1) * rules.accountSize;
  const useDailyDd = rules.dailyDdPct > 0;
  const maxLimit = (rules.maxDdPct / 100) * rules.accountSize;

  const phases: PhaseResult[] = [];
  let cursor = 0;
  let runningPassed = true;

  for (let p = 0; p < rules.phases.length; p++) {
    const phase = rules.phases[p];
    const target = (phase.profitTargetPct / 100) * rules.accountSize;

    let equity = rules.accountSize;
    let peak = rules.accountSize;
    let worstDailyDd = 0;
    let worstOverallDd = 0;
    let phasePassed = false;
    let phaseReason = "Survived all sessions without breach.";
    let finishedAt: string | null = null;
    const log: SimDay[] = [];
    const startedAt = allDays[cursor]?.date ?? null;

    let consumed = 0;
    while (cursor < allDays.length) {
      const day = allDays[cursor];
      const dailyStart = equity;
      equity += day.pnl;
      if (equity > peak) peak = equity;

      const dailyDd = dailyStart - equity;
      const overallBase = rules.trailingDd ? peak : rules.accountSize;
      const overallDd = overallBase - equity;

      if (dailyDd > worstDailyDd) worstDailyDd = dailyDd;
      if (overallDd > worstOverallDd) worstOverallDd = overallDd;

      let status: SimDay["status"] = "ok";
      if (useDailyDd && dailyDd >= dailyLimit) status = "daily-dd-breach";
      else if (overallDd >= maxLimit) status = "max-dd-breach";
      else if (equity - rules.accountSize >= target) status = "target-hit";

      log.push({ date: day.date, pnl: day.pnl, equity, peak, dailyStartEquity: dailyStart, status });
      consumed += 1;
      cursor += 1;

      if (status === "daily-dd-breach") {
        phaseReason = `Daily drawdown of ${rules.dailyDdPct}% breached on ${day.date}.`;
        finishedAt = day.date;
        break;
      }
      if (status === "max-dd-breach") {
        phaseReason = `Max drawdown of ${rules.maxDdPct}% breached on ${day.date}.`;
        finishedAt = day.date;
        break;
      }
      if (status === "target-hit") {
        phasePassed = true;
        phaseReason = `Profit target of ${phase.profitTargetPct}% reached on ${day.date}.`;
        finishedAt = day.date;
        break;
      }
    }

    if (!finishedAt) {
      // Ran out of trades inside this phase
      if (rules.minTradingDays && consumed < rules.minTradingDays) {
        phasePassed = false;
        phaseReason = `Only ${consumed} trading days for phase ${p + 1} — minimum is ${rules.minTradingDays}.`;
      } else {
        phasePassed = equity - rules.accountSize >= target;
        phaseReason = phasePassed
          ? "Passed: profit target reached without breach."
          : `Did not reach phase ${p + 1} target (${phase.profitTargetPct}%) within remaining trades.`;
      }
    }

    phases.push({
      phaseIndex: p,
      phaseLabel: phaseLabel(p, rules.phases.length),
      passed: phasePassed,
      reason: phaseReason,
      finishedAt,
      startEquity: rules.accountSize,
      finalEquity: equity,
      highestEquity: peak,
      worstDailyDdPct: (worstDailyDd / rules.accountSize) * 100,
      worstOverallDdPct: (worstOverallDd / rules.accountSize) * 100,
      tradingDays: consumed,
      days: log,
      startedAt
    });

    if (!phasePassed) {
      runningPassed = false;
      break;
    }
  }

  const lastPhase = phases[phases.length - 1];
  const allDaysLogged = phases.flatMap((p) => p.days);

  return {
    passedAll: runningPassed && phases.length === rules.phases.length,
    phases,
    passed: runningPassed && phases.length === rules.phases.length,
    reason: runningPassed
      ? "All phases cleared."
      : phases.find((p) => !p.passed)?.reason ?? "—",
    finishedAt: lastPhase?.finishedAt ?? null,
    finalEquity: lastPhase?.finalEquity ?? rules.accountSize,
    highestEquity: Math.max(rules.accountSize, ...phases.map((p) => p.highestEquity)),
    worstDailyDdPct: Math.max(0, ...phases.map((p) => p.worstDailyDdPct)),
    worstOverallDdPct: Math.max(0, ...phases.map((p) => p.worstOverallDdPct)),
    tradingDays: phases.reduce((s, p) => s + p.tradingDays, 0),
    days: allDaysLogged
  };
}

function phaseLabel(index: number, total: number): string {
  if (total === 1) return "Evaluation";
  if (total === 2) return ["Phase 1", "Phase 2"][index] ?? `Phase ${index + 1}`;
  return ["Phase 1", "Phase 2", "Phase 3"][index] ?? `Phase ${index + 1}`;
}
