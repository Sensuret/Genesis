/**
 * Map a `trade_files` row onto the labelling pair used everywhere we
 * surface an account in the UI (Top-bar Accounts dropdown, Trades →
 * Imported files toggle, Settings → Import history).
 *
 * The visual contract — matching the Settings → Import history style
 * the user signed off on — is:
 *
 *   ┌─────────────────────────┐
 *   │ MT4/MT5 EA              │  ← small "chip" with the sync kind
 *   │ JustMarkets · Live      │  ← broker line + Live/Demo qualifier
 *   │ #2001900944 · 432 trades│  ← account number + trade count
 *   └─────────────────────────┘
 *
 * - `chip.text` is always the sync kind, never the broker.
 *   That keeps the chip small, low-attention and consistent across
 *   surfaces, so the visual hierarchy is: broker first, chip second.
 * - `brokerLine` is the broker name + optional " · Live" / " · Demo"
 *   qualifier. For manual / broker-API imports where the file can't
 *   tell us if it's a demo or a live account we drop the qualifier.
 *
 * Live-vs-Demo distinction for EA rows is heuristic: MetaTrader doesn't
 * report ACCOUNT_TRADE_MODE through the current EA build, but every
 * broker server name follows a `<Broker>-Demo` / `<Broker>-Real` /
 * `<Broker>-Live` convention. We sniff for the demo / practice / test
 * tokens — anything else is treated as Live. When a future EA build
 * posts the trade-mode enum explicitly, this helper can be upgraded
 * to use it as the source of truth.
 */

import type { TradeFileRow } from "@/lib/supabase/types";

export type AccountSourceTone = "manual" | "ea" | "broker";

export type AccountSourceLabel = {
  /** Small chip rendered above the broker / file line. Matches the
   *  Settings → Import history chip text. */
  chip: {
    text: string;
    tone: AccountSourceTone;
  };
  /** Broker name with an optional " · Live" / " · Demo" qualifier when
   *  the file source lets us infer the account mode. Falls back to the
   *  file name when no broker is recorded. */
  brokerLine: string;
  /** Long-form tooltip / aria-label so screen readers announce the
   *  ingestion path in full. */
  description: string;
};

// Letter-boundary patterns. We can't use `\b` because JS word-
// boundaries treat digits as word chars, so `\b(real)\b` would fail
// to match the very common MetaTrader server-name suffix `Real3`.
// Instead we anchor with "not preceded / followed by an ASCII letter"
// — that matches "JustMarkets-Real3" (hyphen + digit are non-letters)
// while still rejecting embedded-letter substrings like "delivery"
// (⊃ "live"), "unrealized" (⊃ "real"), "Contest" / "Tester" /
// "Latest" / "Protest" (⊃ "test"), "Paperwork" (⊃ "paper") and
// "Reproduction" (⊃ "prod").
// `simulat` is deliberately a PREFIX token (matches "Simulation",
// "Simulated", "Simulator"); the rest are whole tokens. Split into
// two branches so the trailing `(?![a-z])` boundary only applies to
// the whole-token group.
const DEMO_PATTERNS = /(?:^|[^a-z])(?:(?:demo|practice|paper|test|sandbox)(?![a-z])|simulat)/i;
const LIVE_PATTERNS = /(?:^|[^a-z])(live|real)(?![a-z])/i;

/**
 * Try to detect Live / Demo from whatever signal the file source gave
 * us. Returns "Live" / "Demo" / null when nothing is detectable.
 *
 * Fields are checked in priority order, NOT concatenated, so a noisy
 * signal in a low-priority field (e.g. the literal user-typed name
 * "Contest Winner") never overrides a strong signal from a high-
 * priority field (the server name "JustMarkets-Real3").
 *
 * Priority:
 *  1. `server` — MetaTrader server names use a strict `<Broker>-Real /
 *     -Demo / -Live` convention and are the single most reliable signal.
 *  2. `broker` — usually carries an explicit "Demo" qualifier when set.
 *  3. `account_name` — user-typed; less reliable.
 *  4. `name` — file display name; least reliable (often contains the
 *     filename, which can be anything).
 *
 * The first field that yields a verdict wins.
 */
function detectAccountMode(row: TradeFileRow): "Live" | "Demo" | null {
  const fields: Array<string | null | undefined> = [
    row.server,
    row.broker,
    row.account_name,
    row.name
  ];
  for (const raw of fields) {
    const field = raw?.trim();
    if (!field) continue;
    if (DEMO_PATTERNS.test(field)) return "Demo";
    if (LIVE_PATTERNS.test(field)) return "Live";
  }
  return null;
}

export function accountSourceLabel(row: TradeFileRow): AccountSourceLabel {
  const kind = row.sync_kind ?? "manual";
  const broker = row.broker?.trim() || null;

  if (kind === "broker_api") {
    // Broker-API rows: we usually have the broker name but no reliable
    // Live/Demo signal — show the broker name plain when we can't tell.
    const mode = detectAccountMode(row);
    return {
      chip: { text: "Broker API", tone: "broker" },
      brokerLine: broker
        ? mode
          ? `${broker} · ${mode}`
          : broker
        : row.name ?? "Broker sync",
      description: broker
        ? `Synced directly from ${broker}'s API${mode ? ` — ${mode} account` : ""}`
        : "Synced directly from the broker's API"
    };
  }

  if (kind === "ea") {
    // EA rows: server name almost always carries Live/Demo. Broker is
    // sniffed from the server name at upload time, so the broker line
    // is typically populated.
    const mode = detectAccountMode(row);
    return {
      chip: { text: "MT4/MT5 EA", tone: "ea" },
      brokerLine: broker
        ? mode
          ? `${broker} · ${mode}`
          : broker
        : row.name ?? "MT4 / MT5 EA",
      description: `Live MetaTrader sync via Genesis EA${mode ? ` — ${mode} account` : ""}`
    };
  }

  // Manual imports. CSV / XLSX rarely carry a live/demo flag — only
  // MT4 / MT5 statement HTMs sometimes do. We use the same detector
  // but stay quiet when nothing is detectable rather than guessing.
  const mode = detectAccountMode(row);
  return {
    chip: { text: "Manual", tone: "manual" },
    brokerLine: broker
      ? mode
        ? `${broker} · ${mode}`
        : broker
      : row.name ?? "Manual import",
    description: "Imported from a statement / CSV / report file"
  };
}

/**
 * Tailwind utility classes for each tone. Matches the Import history
 * pill exactly so the chip looks identical across surfaces.
 */
export function accountSourceChipClass(tone: AccountSourceTone): string {
  switch (tone) {
    case "ea":
      return "border-brand-400/40 bg-brand-500/15 text-brand-200";
    case "broker":
      return "border-violet-400/40 bg-violet-500/15 text-violet-200";
    case "manual":
    default:
      return "border-line bg-bg-soft text-fg-muted";
  }
}
