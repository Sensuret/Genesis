// =====================================================================
// Universal broker fingerprinter.
//
// Given any combination of:
//   - filename
//   - raw text content (CSV / HTM)
//   - parsed headers
//   - optional MT5 preamble (Account / Company / Server)
//
// returns a friendly broker name + platform + format + confidence so
// the import UI can show "Detected: JustMarkets · MT5 · Spanish" pills
// before the user commits.
// =====================================================================

export type BrokerFingerprint = {
  broker: string | null;        // "JustMarkets" / "HFM" / "cTrader" / null
  platform: string | null;      // "MT4" / "MT5" / "cTrader" / "TradingView" / null
  format: "metatrader" | "hfm" | "ctrader" | "tradingview" | "generic";
  language: string | null;      // ISO-639-1 ("en", "es", "ru", ...)
  confidence: number;           // 0..1
};

/** Server / Company name patterns → friendly broker name. */
const SERVER_PATTERNS: Array<{ broker: string; rx: RegExp[] }> = [
  { broker: "JustMarkets", rx: [/^just\s*markets?/i, /^j-?markets?/i, /just\s*global\s*markets/i] },
  { broker: "HFM", rx: [/^hfm/i, /hot\s*forex/i, /^hf\s*markets?/i] },
  { broker: "XM", rx: [/^xm[\s-]?(global|trading|com|uk|au)?$/i, /^xm$/i, /^trading\s*point/i] },
  { broker: "Exness", rx: [/^exness/i, /nymstar/i] },
  { broker: "IC Markets", rx: [/^ic\s*markets?/i, /ic\s*trading/i, /^international\s*capital\s*markets/i] },
  { broker: "Pepperstone", rx: [/^pepperstone/i] },
  { broker: "FBS", rx: [/^fbs/i] },
  { broker: "FxPro", rx: [/^fx\s*pro/i] },
  { broker: "Tickmill", rx: [/^tickmill/i] },
  { broker: "FTMO", rx: [/^ftmo/i, /quantec/i] },
  { broker: "MyForexFunds", rx: [/^my\s*forex\s*funds/i, /^mff[\s-]/i] },
  { broker: "FundedNext", rx: [/^funded\s*next/i] },
  { broker: "The Funded Trader", rx: [/funded\s*trader/i] },
  { broker: "E8 Markets", rx: [/^e8\s*(markets?|funding)/i] }
];

/** Best-effort match of an MT5 server / company string to a friendly broker. */
export function brokerFromServer(serverOrCompany: string | null | undefined): string | null {
  if (!serverOrCompany) return null;
  const s = String(serverOrCompany);
  for (const { broker, rx } of SERVER_PATTERNS) {
    if (rx.some((r) => r.test(s))) return broker;
  }
  return null;
}

/** Best-effort match of a filename to a broker. Filenames like
 *  "Statement_HFM_12345.htm" or "ICMarkets_Live_2024.csv" carry the
 *  broker prefix. */
export function brokerFromFilename(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const s = filename.toLowerCase();
  for (const { broker, rx } of SERVER_PATTERNS) {
    if (rx.some((r) => r.test(s))) return broker;
  }
  // Filename keyword fallbacks (no anchored ^).
  if (/hotforex|hfmarkets|\bhfm\b/i.test(s)) return "HFM";
  if (/justmarkets/i.test(s)) return "JustMarkets";
  if (/icmarkets/i.test(s)) return "IC Markets";
  if (/pepperstone/i.test(s)) return "Pepperstone";
  if (/exness/i.test(s)) return "Exness";
  if (/\bxm\b/i.test(s)) return "XM";
  if (/ctrader/i.test(s)) return "cTrader";
  if (/tradingview|tv-?(report|export|strategy)/i.test(s)) return "TradingView";
  return null;
}

/** Detect platform from raw HTM/CSV body or filename. */
export function platformFromText(text: string | null | undefined, filename?: string): string | null {
  const t = (text ?? "").toLowerCase();
  const fn = (filename ?? "").toLowerCase();
  if (/metatrader\s*5|mt5\b|terminal\s*5/.test(t) || /mt5\b/.test(fn)) return "MT5";
  if (/metatrader\s*4|mt4\b|terminal\s*4/.test(t) || /mt4\b/.test(fn)) return "MT4";
  if (/ctrader|spotware/.test(t) || /ctrader/.test(fn)) return "cTrader";
  if (/tradingview|tv\s*strategy/.test(t)) return "TradingView";
  return null;
}

/** Header-shape signature for cTrader CSV exports. */
export function isCTraderHeader(headers: string[]): boolean {
  const norm = headers.map((h) => h.toLowerCase().trim());
  // cTrader desktop "Trade History" CSV exposes these distinctive cols:
  //   Order ID, Position ID, Direction, Volume, Entry price, Exit price,
  //   Net USD (or quote-currency), Stop loss, Take profit
  const has = (term: string) => norm.some((h) => h.includes(term));
  return (
    (has("position id") || has("order id")) &&
    has("direction") &&
    has("entry") &&
    (has("exit") || has("close")) &&
    (has("net usd") || has("net profit") || has("gross profit") || has("net p/l"))
  );
}

/** Header-shape signature for TradingView Strategy Tester exports. */
export function isTradingViewHeader(headers: string[]): boolean {
  const norm = headers.map((h) => h.toLowerCase().trim());
  const has = (term: string) => norm.some((h) => h.includes(term));
  // Strategy Tester "List of Trades" export has "Trade #" + "Type" +
  // "Date/Time" + "Signal" + "Cumulative profit".
  return has("trade #") && has("date/time") && (has("cumulative profit") || has("cumulative p/l"));
}
