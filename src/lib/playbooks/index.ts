// =====================================================================
// GƎNƎSIS Playbook engine
// Defines a playbook's rule shape, symbol aliasing, and rule-adherence
// reporting against TradeRow[].
// =====================================================================

import type { TradeRow, PlaybookRow, Json, ResolutionItem } from "@/lib/supabase/types";
import { detectSession } from "@/lib/parser";
import { isResolutionItemArray } from "@/lib/notebook/blocks";

export type Session = "New York" | "London" | "Asia" | "Sydney";

export type PlaybookRules = {
  /** Trade window in 24h (broker / exchange clock the user trades on). */
  timeWindow?: { startHour: number; startMinute: number; endHour: number; endMinute: number };
  /** Allowed sessions. */
  sessions?: Session[];
  /** Asset focus list — canonical symbols. The playbook's `symbol_aliases`
   *  array is what we match real broker symbols against (case-insensitive). */
  assetFocus?: string[];
  /** Max number of trades per session. */
  maxTradesPerSession?: number;
  /** Target Risk-to-Reward ratio (reward / risk). Trades below this are
   *  flagged as "below RR target". */
  rrTarget?: number;
  /** General notes / definition of what makes a valid setup. Plain text
   *  fallback — kept in sync with `notesBlocks` so legacy renderers,
   *  exports and search keep working. */
  notes?: string;
  /** Notion-style block list version of `notes`. When present and
   *  non-empty, the in-app editor renders this instead of the plain
   *  string, so block kinds (headings, callouts, toggles, …) round-trip
   *  across edits. Legacy playbooks without this field continue to
   *  render as their plain `notes`. */
  notesBlocks?: ResolutionItem[];
};

export const DEFAULT_RULES: PlaybookRules = {};

export function readRules(raw: Json | null | undefined): PlaybookRules {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PlaybookRules = {};
  const r = raw as Record<string, Json>;
  if (r.timeWindow && typeof r.timeWindow === "object" && !Array.isArray(r.timeWindow)) {
    const tw = r.timeWindow as Record<string, Json>;
    if (
      typeof tw.startHour === "number" &&
      typeof tw.startMinute === "number" &&
      typeof tw.endHour === "number" &&
      typeof tw.endMinute === "number"
    ) {
      out.timeWindow = {
        startHour: tw.startHour,
        startMinute: tw.startMinute,
        endHour: tw.endHour,
        endMinute: tw.endMinute
      };
    }
  }
  if (Array.isArray(r.sessions)) {
    out.sessions = r.sessions.filter(
      (x): x is Session => x === "New York" || x === "London" || x === "Asia" || x === "Sydney"
    );
  }
  if (Array.isArray(r.assetFocus)) {
    out.assetFocus = r.assetFocus.filter((x): x is string => typeof x === "string");
  }
  if (typeof r.maxTradesPerSession === "number") out.maxTradesPerSession = r.maxTradesPerSession;
  if (typeof r.rrTarget === "number") out.rrTarget = r.rrTarget;
  if (typeof r.notes === "string") out.notes = r.notes;
  if (isResolutionItemArray(r.notesBlocks)) out.notesBlocks = r.notesBlocks;
  return out;
}

/**
 * Normalize a broker symbol so we can compare across formats:
 *   "USA100" → "USA100"
 *   "US30.f" → "US30"  (strip ".f", ".x", etc. — broker suffixes)
 *   "Nas100.f" → "NAS100"
 *   "NAS 100" → "NAS100"
 */
export function normalizeSymbol(s: string): string {
  return String(s)
    .toUpperCase()
    .replace(/\.[A-Z0-9]+$/u, "") // strip trailing broker suffix like ".F", ".X"
    .replace(/[\s_\-]/g, "")      // strip separators
    .trim();
}

/** Returns true if a real broker symbol matches one of the playbook's
 *  symbol_aliases (case-insensitive, suffix-insensitive). */
export function symbolMatchesPlaybook(symbol: string | null | undefined, aliases: string[]): boolean {
  if (!symbol) return false;
  const norm = normalizeSymbol(symbol);
  for (const a of aliases) {
    if (normalizeSymbol(a) === norm) return true;
  }
  return false;
}

/**
 * Group raw broker symbols by their canonical symbol, given a list of
 * aliases. Symbols that don't match any alias are placed under their own
 * normalized key.
 *
 *   aliases = ["NAS100", "USA100", "Nas100.f"]
 *   broker symbols = ["NAS100", "USA100", "Nas100.f", "EURUSD"]
 *   → { "NAS100": ["NAS100", "USA100", "Nas100.f"], "EURUSD": ["EURUSD"] }
 */
export function groupSymbols(symbols: string[], aliasGroups: string[][]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  const aliasIndex = new Map<string, string>();
  for (const group of aliasGroups) {
    if (!group.length) continue;
    const canonical = normalizeSymbol(group[0]);
    for (const a of group) aliasIndex.set(normalizeSymbol(a), canonical);
  }
  for (const s of symbols) {
    const norm = normalizeSymbol(s);
    const key = aliasIndex.get(norm) ?? norm;
    (groups[key] ??= []).push(s);
  }
  return groups;
}

// =====================================================================
// Rule-adherence reporting
// =====================================================================
export type AdherenceIssue =
  | { kind: "outside-time-window"; tradeId: string }
  | { kind: "wrong-session"; tradeId: string; session: string | null }
  | { kind: "wrong-asset"; tradeId: string; symbol: string | null }
  | { kind: "below-rr-target"; tradeId: string; rr: number | null };

export type AdherenceReport = {
  totalTrades: number;
  followedRules: number;
  adherencePct: number;
  issues: AdherenceIssue[];
  perSession: Record<string, { count: number; max?: number; over: boolean }>;
};

function tradeOpenHourMinute(t: TradeRow): { hour: number; minute: number } | null {
  if (!t.trade_date) return null;
  const d = new Date(t.trade_date);
  if (Number.isNaN(d.getTime())) return null;
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function realisedRR(t: TradeRow): number | null {
  if (t.entry == null || t.stop_loss == null || t.exit_price == null) return null;
  const risk = Math.abs(t.entry - t.stop_loss);
  if (!Number.isFinite(risk) || risk === 0) return null;
  const reward = t.side === "short" ? t.entry - t.exit_price : t.exit_price - t.entry;
  return reward / risk;
}

export function reportAdherence(trades: TradeRow[], pb: PlaybookRow): AdherenceReport {
  const rules = readRules(pb.rules);
  const issues: AdherenceIssue[] = [];
  let followed = 0;
  const perSession: Record<string, { count: number; max?: number; over: boolean }> = {};

  for (const t of trades) {
    let ok = true;

    if (rules.timeWindow) {
      const hm = tradeOpenHourMinute(t);
      if (hm) {
        const { hour, minute } = hm;
        const cur = hour * 60 + minute;
        const start = rules.timeWindow.startHour * 60 + rules.timeWindow.startMinute;
        const end = rules.timeWindow.endHour * 60 + rules.timeWindow.endMinute;
        if (cur < start || cur > end) {
          issues.push({ kind: "outside-time-window", tradeId: t.id });
          ok = false;
        }
      }
    }

    const session = t.session ?? detectSession(t.trade_date);
    if (rules.sessions?.length) {
      if (!session || !rules.sessions.includes(session as Session)) {
        issues.push({ kind: "wrong-session", tradeId: t.id, session });
        ok = false;
      }
    }

    if (rules.assetFocus?.length) {
      if (!symbolMatchesPlaybook(t.pair, [...rules.assetFocus, ...pb.symbol_aliases])) {
        issues.push({ kind: "wrong-asset", tradeId: t.id, symbol: t.pair });
        ok = false;
      }
    }

    if (rules.rrTarget && rules.rrTarget > 0) {
      const rr = realisedRR(t);
      if (rr !== null && rr < rules.rrTarget) {
        issues.push({ kind: "below-rr-target", tradeId: t.id, rr });
        ok = false;
      }
    }

    if (session) {
      const slot = (perSession[session] ??= { count: 0, max: rules.maxTradesPerSession, over: false });
      slot.count += 1;
      if (rules.maxTradesPerSession && slot.count > rules.maxTradesPerSession) slot.over = true;
    }

    if (ok) followed += 1;
  }

  const totalTrades = trades.length;
  return {
    totalTrades,
    followedRules: followed,
    adherencePct: totalTrades ? (followed / totalTrades) * 100 : 0,
    issues,
    perSession
  };
}
