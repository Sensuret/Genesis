/**
 * Map a `trade_files` row onto a short source-label badge that the UI can
 * render next to the account name to make the ingestion path visually
 * obvious.
 *
 * Why this exists: a JustMarkets account that's been imported manually
 * AND attached via the EA is a SINGLE row keyed on (user_id,
 * account_number) — both ingestion paths upsert into the same row, so
 * the dropdown can't tell them apart from the row alone. Once the EA is
 * connected `sync_kind` flips to `ea`, but the user still wants to see
 * "this is the EA-driven version of the JustMarkets account, and it's
 * a Demo / Live one" right in the picker so they don't second-guess
 * which file is which.
 *
 * Live-vs-Demo distinction for EA rows is heuristic: MetaTrader doesn't
 * report ACCOUNT_TRADE_MODE through the current EA build, but every
 * broker server name follows a `<Broker>-Demo` / `<Broker>-Real` /
 * `<Broker>-Live` convention. We sniff for the demo / practice / test
 * tokens — anything else is treated as Live. When we ship a future EA
 * build that posts the trade-mode enum explicitly, this helper can be
 * upgraded to use it as the source of truth.
 */

import type { TradeFileRow } from "@/lib/supabase/types";

export type AccountSourceTone = "manual" | "live" | "demo" | "broker";

export type AccountSourceLabel = {
  /** Two-letter or short label rendered as the chip text. */
  text: string;
  /** Tone used by the chip background — keeps demo / live colour-coded
   *  consistently across the dropdown, the Settings → Accounts list,
   *  and the Connected terminals card. */
  tone: AccountSourceTone;
  /** Long-form tooltip / aria-label so screen readers announce the
   *  ingestion path in full instead of just "EA Live". */
  description: string;
};

const DEMO_PATTERNS = /(demo|practice|paper|test|sandbox|simulat)/i;

export function accountSourceLabel(row: TradeFileRow): AccountSourceLabel {
  const kind = row.sync_kind ?? "manual";

  if (kind === "broker_api") {
    return {
      text: "Broker",
      tone: "broker",
      description: "Synced directly from the broker's API"
    };
  }

  if (kind === "ea") {
    const isDemo = DEMO_PATTERNS.test(`${row.server ?? ""} ${row.name ?? ""}`);
    return isDemo
      ? {
          text: "EA Demo",
          tone: "demo",
          description: "Live MetaTrader sync via Genesis EA — Demo account"
        }
      : {
          text: "EA Live",
          tone: "live",
          description: "Live MetaTrader sync via Genesis EA — Real / Live account"
        };
  }

  return {
    text: "Manual",
    tone: "manual",
    description: "Imported from a CSV / report file"
  };
}

/**
 * Tailwind utility classes for each tone. Kept here next to the label
 * helper so the visual treatment is consistent everywhere a source
 * chip is rendered.
 */
export function accountSourceChipClass(tone: AccountSourceTone): string {
  switch (tone) {
    case "live":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30";
    case "demo":
      return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30";
    case "broker":
      return "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30";
    case "manual":
    default:
      return "bg-bg-elevated text-fg-subtle ring-1 ring-line";
  }
}
