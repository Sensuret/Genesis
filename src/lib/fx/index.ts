// =====================================================================
// FX rates (USD-base) used by the currency converter in the top bar.
//
// All P&L in the database is stored in the user's account currency (USD by
// default — see settings.starting balance). When the user switches the
// "Currency" filter we want the *displayed* numbers to actually convert,
// not just swap the symbol.
//
// We hold a small set of seed rates that ship with the bundle so the app
// always renders something sensible offline, then a runtime `loadRates()`
// helper hits the open exchangerate-api.com endpoint to refresh them. If
// the network call fails we keep the seed values rather than throwing.
// =====================================================================

export type Rates = Record<string, number>;

/**
 * Fallback static rates relative to USD. These are intentionally
 * approximate — the live `loadRates()` call will overwrite them as soon
 * as it returns. They exist purely so that the very first render after a
 * cold load shows a *converted* number instead of a USD-shaped value
 * with the wrong symbol.
 */
export const SEED_RATES: Rates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.5,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  NZD: 1.66,
  ZAR: 18.5,
  KES: 129.0
};

export function convertFromUSD(amount: number, target: string, rates: Rates): number {
  if (!Number.isFinite(amount)) return amount;
  const rate = rates[target] ?? SEED_RATES[target] ?? 1;
  return amount * rate;
}

/**
 * Format an amount that is *already* in `currency`. Wraps Intl.NumberFormat
 * with sensible defaults (no fractional digits for amounts ≥ 1000, two
 * digits otherwise) so all surfaces share the same look.
 */
export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  // KES doesn't have a glyph in older locale data on some browsers, so we
  // fall back to the ISO code prefix when the formatted output starts with
  // "KES" already (Intl will use that automatically).
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2
  }).format(amount);
}

/**
 * Compact money formatter for chart axes — uses Intl `notation: "compact"`
 * so $1,200,000 becomes "$1.2M" and KES 12,900,000 becomes "KES 13M".
 * Keeps axis label widths tight so the chart's plotting region isn't
 * squeezed by long currency strings.
 */
export function formatMoneyCompact(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  if (amount === 0) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(0);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1
  }).format(amount);
}

export async function loadRates(signal?: AbortSignal): Promise<Rates | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      signal
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; rates?: Rates };
    if (json.result !== "success" || !json.rates) return null;
    return json.rates;
  } catch {
    return null;
  }
}
