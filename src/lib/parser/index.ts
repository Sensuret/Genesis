// =====================================================================
// GƎNƎSIS Trade Import Engine
// Auto-maps any broker CSV/XLSX to the canonical Trade shape.
//
// Special-cases:
//  - MetaTrader 4/5 ReportHistory exports: header row contains duplicated
//    "Time" and "Price" columns (open + close). Standard JSON-row reads
//    silently overwrite the first with the second. We detect the MT layout
//    and map by COLUMN INDEX instead of by name.
//  - "S / L" / "T / P" headers (with spaces & slashes) get normalised to
//    "sl" / "tp" so the synonym map matches them.
//  - Session is auto-detected from the open time (UTC-aware, with hour-of-day
//    bands for NY / London / Asian / Sydney) when the broker report doesn't
//    include a session column.
// =====================================================================

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { translateHeaders, detectMtLanguage } from "./i18n-headers";
import { readHtmFile, type HtmParseOutput } from "./htm";
import {
  brokerFromFilename,
  brokerFromServer,
  isCTraderHeader,
  isTradingViewHeader,
  platformFromText
} from "./broker";
import { parseCtraderRows } from "./ctrader";
import { parseTradingViewRows } from "./tradingview";

export type ParsedTrade = {
  pair: string | null;
  trade_date: string | null;
  /** ISO timestamp of when the trade opened. */
  open_time: string | null;
  /** ISO timestamp of when the trade closed. */
  close_time: string | null;
  /** Trade duration in seconds. */
  duration_seconds: number | null;
  /** Net pips moved (signed). */
  pips: number | null;
  session: string | null;
  side: "long" | "short" | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  lot_size: number | null;
  result_r: number | null;
  pnl: number | null;
  commissions: number | null;
  spread: number | null;
  account_balance: number | null;
  setup_tag: string | null;
  mistake_tag: string | null;
  emotions: string[] | null;
  notes: string | null;
};

export type FieldKey = keyof ParsedTrade;

const SYNONYMS: Record<FieldKey, string[]> = {
  pair: ["pair", "symbol", "ticker", "instrument", "asset", "market"],
  trade_date: [
    "open time",
    "open date",
    "opened",
    "entry time",
    "entry date",
    "trade date",
    "datetime",
    "date",
    "time"
  ],
  open_time: ["open time", "open date", "opened", "entry time", "entry date"],
  close_time: ["close time", "close date", "closed", "exit time", "exit date"],
  duration_seconds: ["duration", "trade duration", "elapsed"],
  pips: ["pips", "pip", "points"],
  session: ["session"],
  side: ["side", "direction", "type", "buy/sell", "long/short", "action"],
  entry: ["entry", "entry price", "open price", "buy price", "open"],
  stop_loss: ["sl", "s l", "stop", "stop loss", "stoploss"],
  take_profit: ["tp", "t p", "take profit", "takeprofit", "target"],
  exit_price: ["exit", "exit price", "close price", "sell price", "close time", "close"],
  lot_size: ["lot", "lots", "lot size", "size", "qty", "quantity", "contracts", "volume"],
  result_r: ["r", "r:r", "rr", "r multiple", "rmultiple", "result r"],
  pnl: ["pnl", "p/l", "p&l", "profit", "profit/loss", "net p&l", "netpnl", "net pnl", "net profit"],
  commissions: ["commission", "commissions", "fees", "fee"],
  spread: ["spread"],
  account_balance: ["balance", "account balance", "equity"],
  setup_tag: ["setup", "strategy", "playbook", "setup tag"],
  mistake_tag: ["mistake", "mistake tag", "error"],
  emotions: ["emotion", "emotions", "feeling", "mood"],
  notes: ["note", "notes", "comment", "comments", "journal"]
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_\-/]+/g, " ").replace(/\s+/g, " ");
}

/** Build a column-name → canonical-field map from a header row. */
export function buildColumnMap(headers: string[]): Partial<Record<FieldKey, string>> {
  const map: Partial<Record<FieldKey, string>> = {};
  const headerNorms = headers.map((h) => ({ raw: h, norm: normalize(String(h ?? "")) }));
  for (const [field, syns] of Object.entries(SYNONYMS) as [FieldKey, string[]][]) {
    for (const s of syns) {
      const sn = normalize(s);
      const found = headerNorms.find((h) => h.norm === sn);
      if (found) {
        map[field] = found.raw;
        break;
      }
    }
    if (map[field]) continue;
    // Fall back to substring match if no exact normalised hit.
    for (const s of syns) {
      const sn = normalize(s);
      const found = headerNorms.find((h) => h.norm.includes(sn));
      if (found) {
        map[field] = found.raw;
        break;
      }
    }
  }
  return map;
}

const NUMERIC_FIELDS: FieldKey[] = [
  "entry",
  "stop_loss",
  "take_profit",
  "exit_price",
  "lot_size",
  "result_r",
  "pnl",
  "commissions",
  "spread",
  "account_balance",
  "duration_seconds",
  "pips"
];

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).replace(/[$,\s]/g, "").replace(/\((.*)\)/, "-$1");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a broker timestamp into a full ISO `Date`. Handles:
 *   - MetaTrader's `2026.03.04 16:57:05` (dots between date parts)
 *   - Excel serial numbers (date+time fractions)
 *   - Standard ISO 8601 strings
 */
function toDateObject(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const s = String(value).trim();
  const mt = s.match(/^(\d{4})[./-](\d{2})[./-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (mt) {
    const [, y, mo, d, hh = "00", mm = "00", ss = "00"] = mt;
    const iso = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number.parseFloat(s);
    if (n > 30000 && n < 60000) {
      const ms = (n - 25569) * 86_400_000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDate(value: unknown): string | null {
  const d = toDateObject(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

function toIsoTimestamp(value: unknown): string | null {
  const d = toDateObject(value);
  return d ? d.toISOString() : null;
}

/**
 * Pip factor for a symbol. Convert price-units → pips.
 *   - JPY pairs (USDJPY, EURJPY, GBPJPY…)        → 100
 *   - Standard FX (EURUSD, GBPUSD, AUDCAD…)      → 10000
 *   - Metals (XAUUSD, XAGUSD)                    → 10
 *   - Indices (US30, NAS100, SPX500, GER40, etc.) → 10
 *   - Crypto (BTCUSD, ETHUSD…)                   → 1
 *   - Unknown / blank                            → null (don't guess)
 */
export function pipFactor(symbol: string | null | undefined): number | null {
  if (!symbol) return null;
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  if (/JPY/.test(s)) return 100;
  if (/^(BTC|ETH|XRP|SOL|LTC|ADA|DOGE|BNB|DOT|AVAX|LINK|MATIC|ATOM|TRX|XLM|XMR|UNI)/.test(s)) return 1;
  if (/^XAU|^XAG|GOLD|SILVER/.test(s)) return 10;
  if (/(US30|US100|US500|NAS|SPX|DJ30|GER|DAX|UK100|FTSE|JPN225|AUS200|HK50|NDX)/.test(s)) return 10;
  // Default to standard FX (4-decimal) when we have a 6-letter ccy pair like
  // EURUSD, AUDCAD…
  if (/^[A-Z]{6}$/.test(s)) return 10000;
  return null;
}

/** Compute pips moved on a trade. Positive = trade went toward winner. */
export function computePips(args: {
  pair: string | null | undefined;
  entry: number | null | undefined;
  exit_price: number | null | undefined;
  side: "long" | "short" | null | undefined;
}): number | null {
  const { pair, entry, exit_price, side } = args;
  if (entry == null || exit_price == null) return null;
  const factor = pipFactor(pair ?? null);
  if (factor == null) return null;
  const direction = side === "short" ? -1 : 1;
  const moved = (exit_price - entry) * factor * direction;
  return Number.isFinite(moved) ? Math.round(moved * 10) / 10 : null;
}

/** Compute trade duration (seconds) from open and close timestamps. */
export function computeDurationSeconds(open: string | null, close: string | null): number | null {
  if (!open || !close) return null;
  const o = new Date(open).getTime();
  const c = new Date(close).getTime();
  if (!Number.isFinite(o) || !Number.isFinite(c)) return null;
  const diff = Math.round((c - o) / 1000);
  return diff >= 0 ? diff : null;
}

function toSide(value: unknown): "long" | "short" | null {
  if (!value) return null;
  const s = String(value).toLowerCase();
  if (/(^|[^a-z])(buy|long|b)([^a-z]|$)/.test(` ${s} `)) return "long";
  if (/(^|[^a-z])(sell|short|s)([^a-z]|$)/.test(` ${s} `)) return "short";
  return null;
}

function toEmotions(value: unknown): string[] | null {
  if (!value) return null;
  return String(value)
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Detect the trading session from a broker open-time string. Standard FX
 * session windows (UTC), with overlap rules picking the *primary* (highest-
 * volume) session:
 *
 *   21:00 – 23:59  →  Sydney  (only Sydney is open)
 *   00:00 – 06:59  →  Asia    (Sydney+Tokyo overlap; Tokyo dominates)
 *   07:00 – 11:59  →  London  (Tokyo+London overlap; London opens drives)
 *   12:00 – 20:59  →  New York (London+NY overlap up to 16:00; NY runs solo after)
 *
 * The optional `brokerOffsetMinutes` arg subtracts that many minutes from the
 * raw timestamp before bucketing — letting us re-bucket trades whose broker
 * server timezone wasn't UTC (e.g. FTMO at GMT+2 → offset = +120).
 */
export function detectSession(
  value: unknown,
  brokerOffsetMinutes: number | null = null
): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const mt = s.match(/^(\d{4})[./-](\d{2})[./-](\d{2})(?:[ T](\d{2}))/);
  let hour: number | null = null;
  if (mt) {
    hour = Number.parseInt(mt[4], 10);
  } else {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) hour = d.getUTCHours();
  }
  if (hour === null) return null;
  if (brokerOffsetMinutes != null && Number.isFinite(brokerOffsetMinutes)) {
    // The timestamp was recorded in broker-local time; convert to UTC.
    const adjusted = hour - Math.round(brokerOffsetMinutes / 60);
    hour = ((adjusted % 24) + 24) % 24;
  }
  if (hour >= 21 && hour <= 23) return "Sydney";
  if (hour >= 0 && hour < 7) return "Asia";
  if (hour >= 7 && hour < 12) return "London";
  if (hour >= 12 && hour <= 20) return "New York";
  return null;
}

/**
 * MetaTrader 4/5 "Trade Report" exports look like:
 *   Time | Position | Symbol | Type | Volume | Price | S / L | T / P |
 *   Time | Price    | Commission | Swap | Profit
 * Note the duplicated "Time" and "Price" headers (open vs close). We detect
 * by header sequence and map by column index.
 */
function isMetaTraderHeader(h: string[]): boolean {
  if (h.length < 13) return false;
  // Accept both English and localised MetaTrader headers by normalising
  // foreign terms back to English first.
  const translated = translateHeaders(h);
  const norm = translated.map((x) => normalize(String(x ?? "")));
  const hits =
    norm.indexOf("time") >= 0 &&
    norm.lastIndexOf("time") > norm.indexOf("time") &&
    norm.indexOf("price") >= 0 &&
    norm.lastIndexOf("price") > norm.indexOf("price") &&
    norm.includes("symbol") &&
    norm.includes("volume") &&
    norm.includes("profit");
  return hits;
}

/** MT4 HTM trade-table header — matches translated headers too. */
function isMetaTraderHtmHeader(h: string[]): boolean {
  if (h.length < 8) return false;
  const translated = translateHeaders(h);
  const norm = translated.map((x) => normalize(String(x ?? "")));
  const dupTime = norm.indexOf("time") >= 0 && norm.lastIndexOf("time") > norm.indexOf("time");
  const dupPrice = norm.indexOf("price") >= 0 && norm.lastIndexOf("price") > norm.indexOf("price");
  return dupTime && dupPrice && norm.includes("profit");
}

function metaTraderRowToTrade(row: unknown[]): ParsedTrade {
  // Column layout (0-based):
  // 0=open time | 1=position | 2=symbol | 3=type | 4=volume | 5=open price |
  // 6=S/L | 7=T/P | 8=close time | 9=close price | 10=commission | 11=swap |
  // 12=profit
  const openTime = row[0];
  const closeTime = row[8];
  const open_time = toIsoTimestamp(openTime);
  const close_time = toIsoTimestamp(closeTime);
  const pair = row[2] != null ? String(row[2]) : null;
  const side = toSide(row[3]);
  const entry = toNumber(row[5]);
  const exit_price = toNumber(row[9]);
  return {
    pair,
    trade_date: toDate(openTime),
    open_time,
    close_time,
    duration_seconds: computeDurationSeconds(open_time, close_time),
    pips: computePips({ pair, entry, exit_price, side }),
    session: detectSession(openTime),
    side,
    entry,
    // MT writes 0 when no S/L or T/P was set — store null so analytics
    // don't treat "no stop" as "stop at price zero".
    stop_loss: (() => { const v = toNumber(row[6]); return v === 0 ? null : v; })(),
    take_profit: (() => { const v = toNumber(row[7]); return v === 0 ? null : v; })(),
    exit_price,
    lot_size: toNumber(row[4]),
    result_r: null,
    pnl: toNumber(row[12]),
    commissions: toNumber(row[10]),
    spread: toNumber(row[11]), // MT calls this "swap" but we store it under spread/cost
    account_balance: null,
    setup_tag: null,
    mistake_tag: null,
    emotions: null,
    notes: null
  };
}

export function rowToTrade(
  row: Record<string, unknown>,
  map: Partial<Record<FieldKey, string>>
): ParsedTrade {
  const get = (field: FieldKey) => {
    const col = map[field];
    return col ? row[col] : undefined;
  };

  const open_time = toIsoTimestamp(get("open_time") ?? get("trade_date"));
  const close_time = toIsoTimestamp(get("close_time"));
  const out: ParsedTrade = {
    pair: get("pair") ? String(get("pair")) : null,
    trade_date: toDate(get("trade_date")),
    open_time,
    close_time,
    duration_seconds: null,
    pips: null,
    session: get("session") ? String(get("session")) : detectSession(get("open_time") ?? get("trade_date")),
    side: toSide(get("side")),
    entry: null,
    stop_loss: null,
    take_profit: null,
    exit_price: null,
    lot_size: null,
    result_r: null,
    pnl: null,
    commissions: null,
    spread: null,
    account_balance: null,
    setup_tag: get("setup_tag") ? String(get("setup_tag")) : null,
    mistake_tag: get("mistake_tag") ? String(get("mistake_tag")) : null,
    emotions: toEmotions(get("emotions")),
    notes: get("notes") ? String(get("notes")) : null
  };

  for (const f of NUMERIC_FIELDS) {
    (out as Record<FieldKey, unknown>)[f] = toNumber(get(f));
  }

  // If duration / pips weren't in the source file, derive them from the
  // timestamps and price columns we just populated.
  if (out.duration_seconds == null) {
    out.duration_seconds = computeDurationSeconds(out.open_time, out.close_time);
  }
  if (out.pips == null) {
    out.pips = computePips({
      pair: out.pair,
      entry: out.entry,
      exit_price: out.exit_price,
      side: out.side
    });
  }

  return out;
}

export async function parseCsv(
  file: File
): Promise<{ rows: Record<string, unknown>[]; headers: string[]; matrix: unknown[][] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        // Build a positional matrix too, for MT-style files where two columns
        // share a name and the keyed `data` array silently dropped one.
        const matrix: unknown[][] = [
          headers,
          ...res.data.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))
        ];
        resolve({ rows: res.data, headers, matrix });
      },
      error: (err) => reject(err)
    });
  });
}

/**
 * MetaTrader 5 "Trade History Report" XLSX exports start with a 5-row
 * header strip followed by a "Positions" section title and the actual
 * column headers:
 *
 *   row 0: "Trade History Report"
 *   row 1: "Name:"     ...   "James Mutinda Masila"
 *   row 2: "Account:"  ...   "2001900944 (USD, JustMarkets-Demo, demo, Hedge)"
 *   row 3: "Company:"  ...   "Just Global Markets Ltd."
 *   row 4: "Date:"     ...   "2026.05.05 12:58"
 *   row 5: "Positions"
 *   row 6: "Time" "Position" "Symbol" "Type" "Volume" "Price" "S / L" ...
 *
 * The naive `matrix[0]` header read picks up "Trade History Report" and
 * misses the actual columns, so detection downstream fails. This helper
 * sniffs the first 25 rows for the "Trade History Report" marker, finds
 * the row that looks like a real MT trade-header row, and returns the
 * row index to use as the header. Returns -1 when the preamble isn't
 * present (regular flat XLSX exports).
 */
function findMt5ReportHeaderRow(matrix: unknown[][]): number {
  if (matrix.length < 8) return -1;
  // Cheap sniff: any of the first ~10 rows starts with "Trade History Report".
  let hasReportTitle = false;
  for (let i = 0; i < Math.min(10, matrix.length); i++) {
    const first = matrix[i]?.[0];
    if (typeof first === "string" && /trade history report/i.test(first)) {
      hasReportTitle = true;
      break;
    }
  }
  if (!hasReportTitle) return -1;
  // Find the row that is the actual MT column header (Time + duplicated
  // Time + Symbol + Volume + Profit). Scan 0..25.
  for (let i = 0; i < Math.min(25, matrix.length); i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const headers = row.map((c) => String(c ?? ""));
    if (isMetaTraderHeader(headers)) return i;
  }
  return -1;
}

export async function parseXlsx(
  file: File
): Promise<{
  rows: Record<string, unknown>[];
  headers: string[];
  matrix: unknown[][];
  preamble?: unknown[][];
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // header:1 → 2D array preserving duplicate column names
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  // MT5 ReportHistory: skip the 5-row preamble + "Positions" title and
  // start the matrix from the real column-header row, so downstream
  // detection (`isMetaTraderHeader`) and parsing both work unchanged.
  const headerRow = findMt5ReportHeaderRow(matrix);
  const slicedMatrix = headerRow > 0 ? matrix.slice(headerRow) : matrix;
  const preamble = headerRow > 0 ? matrix.slice(0, headerRow) : undefined;

  const rawHeaders = (slicedMatrix[0] ?? []).map((h) => String(h ?? ""));
  const dataMatrix = slicedMatrix.slice(1);
  // Build a uniqued headers list for the keyed parse path. Duplicates get a
  // " (2)" suffix so the keyed map doesn't lose data.
  const seen = new Map<string, number>();
  const uniqueHeaders = rawHeaders.map((h) => {
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return n === 1 ? h : `${h} (${n})`;
  });
  const rows = dataMatrix.map((row) => {
    const r: Record<string, unknown> = {};
    uniqueHeaders.forEach((h, i) => {
      r[h] = row[i];
    });
    return r;
  });
  // Return the SLICED matrix (preamble dropped). matrix[0] is now the
  // canonical column-header row — `parseFile` walks from index 1 onward
  // to gather trade rows, and the MT5 footer scanner ("Balance:" /
  // "Equity:" / "Deposits") still finds its rows because they sit
  // AFTER the data rows in the sheet, so they survive the slice.
  return { rows, headers: rawHeaders, matrix: slicedMatrix, preamble };
}

/**
 * Scan an MT5 Trade Report matrix for footer metadata. The footer lives
 * after the Deals section and looks like:
 *   Balance:        173.95
 *   Credit Facility: 0
 *   Floating P/L:    0
 *   Equity:          173.95
 *   Margin:          ...
 * Deposits / Withdrawals are detected inside the Deals section as rows
 * with type=="balance" and a Comment of "Deposit" / "Withdrawal".
 */
function extractMt5AccountInfo(matrix: unknown[][]): AccountInfo {
  let balance: number | null = null;
  let equity: number | null = null;
  let depositsTotal = 0;
  let depositsCount = 0;
  let withdrawalsTotal = 0;
  let withdrawalsCount = 0;
  let inDealsSection = false;

  for (const row of matrix) {
    if (!Array.isArray(row)) continue;
    const first = row[0];
    if (typeof first === "string") {
      const s = first.trim();
      if (s === "Deals") { inDealsSection = true; continue; }
      if (s === "Results" || s === "Working") { inDealsSection = false; continue; }
      // Footer key/value rows: label is in col 0, numeric value usually in col 3.
      if (s === "Balance:") {
        balance = toNumber(row[3]) ?? toNumber(row[2]) ?? toNumber(row[1]) ?? balance;
        continue;
      }
      if (s === "Equity:") {
        equity = toNumber(row[3]) ?? toNumber(row[2]) ?? toNumber(row[1]) ?? equity;
        continue;
      }
    }
    // Inside the Deals section: type column is col 3, comment is col 13,
    // and the deposit/withdrawal value is col 12 (Profit) or col 11 (Profit
    // depending on the column count). Both formats keep the *signed* amount
    // in the same column as Profit.
    if (inDealsSection && typeof row[3] === "string" && String(row[3]).trim().toLowerCase() === "balance") {
      const comment = String(row[13] ?? "").trim().toLowerCase();
      // Profit/value column: 11 in some templates, 12 in others. Pick the
      // first non-zero numeric of the two.
      const v11 = toNumber(row[11]);
      const v12 = toNumber(row[12]);
      const value = (v11 != null && v11 !== 0) ? v11 : (v12 ?? 0);
      if (value > 0 || comment.includes("deposit")) {
        depositsTotal += Math.abs(value);
        depositsCount += 1;
      } else if (value < 0 || comment.includes("withdraw")) {
        withdrawalsTotal += Math.abs(value);
        withdrawalsCount += 1;
      }
    }
  }

  return {
    balance,
    equity,
    deposits_total: depositsCount > 0 ? depositsTotal : null,
    withdrawals_total: withdrawalsCount > 0 ? withdrawalsTotal : null,
    deposits_count: depositsCount,
    withdrawals_count: withdrawalsCount
  };
}

export type AccountInfo = {
  /** Closing balance reported in the file footer. */
  balance: number | null;
  /** Closing equity reported in the file footer. */
  equity: number | null;
  /** Sum of every "balance / Deposit" entry in the Deals section. */
  deposits_total: number | null;
  /** Sum of every "balance / Withdrawal" (negative) entry in the Deals section. */
  withdrawals_total: number | null;
  /** Number of deposit transactions detected. */
  deposits_count: number;
  /** Number of withdrawal transactions detected. */
  withdrawals_count: number;
  /** Account login number from "Account: 1234567 (...)" preamble row. */
  account_number?: string | null;
  /** Broker name from the "Account: 1234567 (USD, JustMarkets-Demo, ...)"
   *  parenthetical, normalised to a friendly form (e.g. JustMarkets). */
  broker?: string | null;
  /** Server label as it appears in the parenthetical (e.g. "JustMarkets-Demo"). */
  broker_server?: string | null;
  /** Currency code shown in the parenthetical (USD / EUR / KES…). */
  currency?: string | null;
  /** Demo / real / contest flag from the parenthetical. */
  account_kind?: string | null;
  /** Account holder full name from the "Name:" preamble row. */
  account_holder?: string | null;
  /** Company / dealing-firm name from the "Company:" row. */
  company?: string | null;
  /** Report-generated timestamp from the "Date:" row. */
  reported_at?: string | null;
};

/**
 * Pull account-level metadata from the MT5 ReportHistory preamble:
 *   row 0: "Trade History Report"
 *   row 1: "Name:"     "<full name>"
 *   row 2: "Account:"  "<login> (<currency>, <server>, <kind>, <hedge|netting>)"
 *   row 3: "Company:"  "<broker company>"
 *   row 4: "Date:"     "<YYYY.MM.DD HH:MM>"
 * The label cell is in column 0, the value cell sits anywhere from
 * column 1 to column 4 depending on the column-merge style — we scan
 * the whole row for the first non-empty string after the label.
 */
function extractMt5Preamble(preamble: unknown[][]): Partial<AccountInfo> {
  const out: Partial<AccountInfo> = {};
  if (!preamble?.length) return out;
  function findValue(row: unknown[]): string | null {
    for (let i = 1; i < row.length; i++) {
      const c = row[i];
      if (c == null || c === "") continue;
      const s = String(c).trim();
      if (s) return s;
    }
    return null;
  }
  for (const row of preamble) {
    if (!Array.isArray(row)) continue;
    const label = String(row[0] ?? "").trim().toLowerCase().replace(/:$/, "");
    if (!label) continue;
    if (label === "name") {
      out.account_holder = findValue(row);
    } else if (label === "account") {
      const raw = findValue(row);
      if (raw) {
        const m = raw.match(/^(\S+)\s*\(([^)]+)\)\s*$/);
        if (m) {
          out.account_number = m[1];
          const parts = m[2].split(",").map((s) => s.trim()).filter(Boolean);
          // [currency, server, kind, hedge|netting] — order is stable in MT5 builds.
          if (parts[0]) out.currency = parts[0];
          if (parts[1]) {
            out.broker_server = parts[1];
            // "JustMarkets-Demo" → "JustMarkets". Strip "-Demo" / "-Real" / "-Live"
            // / "-Contest" suffixes (case-insensitive) so the broker chip is clean.
            out.broker = parts[1].replace(/-(demo|real|live|contest|server)\d*$/i, "").trim();
          }
          if (parts[2]) out.account_kind = parts[2].toLowerCase();
        } else {
          out.account_number = raw;
        }
      }
    } else if (label === "company") {
      out.company = findValue(row);
    } else if (label === "date") {
      out.reported_at = findValue(row);
    }
  }
  return out;
}

export type ParseResult = {
  trades: ParsedTrade[];
  headers: string[];
  mapping: Partial<Record<FieldKey, string>>;
  raw: Record<string, unknown>[];
  format: "metatrader" | "metatrader-htm" | "hfm" | "ctrader" | "tradingview" | "generic";
  /** Optional account-level metadata (MT5 Trade Report includes a footer
   *  with Balance / Equity / Deposit history; HFM does not). */
  accountInfo?: AccountInfo;
  /** Friendly broker name resolved from server / filename / company. */
  broker?: string | null;
  /** Source platform ("MT4" / "MT5" / "cTrader" / "TradingView"). */
  platform?: string | null;
  /** Detected MetaTrader localisation ("en", "es", "ru", ...). */
  language?: string | null;
};

/**
 * HFM / HotForex exports: each trade is represented as TWO rows sharing a
 * Position ID.
 *   - row A (opener): Open Date == Close Date, Profit == 0, Duration blank
 *   - row B (closer): Open Date < Close Date, Profit populated, Duration set
 * Row A's Action ("Buy"/"Sell") is the real trade direction; row B's Action
 * is the *closing* order (opposite side), so we must NOT use it for `side`.
 */
function isHfmHeader(headers: string[]): boolean {
  const norm = headers.map((h) => normalize(String(h ?? "")));
  return (
    norm.includes("position id") &&
    norm.includes("open date") &&
    norm.includes("close date") &&
    norm.includes("open price") &&
    norm.includes("close price") &&
    norm.includes("profit") &&
    norm.includes("action")
  );
}

/** Parse HFM-style duration strings like "1h 12m 23s" → seconds. */
function parseHfmDuration(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const s = String(value).trim();
  if (!s || s === "-") return null;
  let total = 0;
  let matched = false;
  const h = s.match(/(\d+)\s*h/i);
  if (h) { total += Number.parseInt(h[1], 10) * 3600; matched = true; }
  const m = s.match(/(\d+)\s*m(?!s)/i);
  if (m) { total += Number.parseInt(m[1], 10) * 60; matched = true; }
  const sec = s.match(/(\d+)\s*s/i);
  if (sec) { total += Number.parseInt(sec[1], 10); matched = true; }
  return matched ? total : null;
}

/**
 * HFM's myHFM web-portal export uses the same column shape for both MT4
 * and MT5 accounts (no `Platform` column, no preamble). The only signal
 * we have left after the filename / fingerprint fallbacks is the
 * Position ID length distribution: MT4 tickets are 6–9 digits, MT5
 * position IDs are typically 10+ digits. We sample up to 50 rows and
 * pick the dominant bucket.
 */
function guessPlatformFromHfmRows(rows: Record<string, unknown>[]): "MT4" | "MT5" | null {
  let mt4 = 0;
  let mt5 = 0;
  let scanned = 0;
  for (const r of rows) {
    if (scanned >= 50) break;
    const pid = String(r["Position ID"] ?? "").trim();
    if (!/^\d+$/.test(pid)) continue;
    scanned += 1;
    if (pid.length >= 10) mt5 += 1;
    else if (pid.length >= 6) mt4 += 1;
  }
  if (scanned < 5) return null;
  if (mt5 > mt4 * 2) return "MT5";
  if (mt4 > mt5 * 2) return "MT4";
  return null;
}

function parseHfmRows(rows: Record<string, unknown>[]): ParsedTrade[] {
  // Group by Position ID. Opener = row where profit == 0 and close == open
  // time. Closer = the other row for that position.
  const byId = new Map<string, { opener?: Record<string, unknown>; closer?: Record<string, unknown> }>();
  for (const r of rows) {
    const pid = String(r["Position ID"] ?? "").trim();
    if (!pid) continue;
    const bucket = byId.get(pid) ?? {};
    const profit = toNumber(r["Profit"]);
    const dur = parseHfmDuration(r["Duration"]);
    const isCloser = (dur != null && dur > 0) || (profit != null && profit !== 0);
    if (isCloser) bucket.closer = r;
    else bucket.opener = r;
    byId.set(pid, bucket);
  }

  const trades: ParsedTrade[] = [];
  for (const { opener, closer } of byId.values()) {
    // Need at least the closer row to have an actual trade.
    if (!closer) continue;
    const base = opener ?? closer;
    const openerAction = String((opener ?? closer)["Action"] ?? "").toLowerCase();
    const side: "long" | "short" | null =
      openerAction.startsWith("buy") ? "long" :
      openerAction.startsWith("sell") ? "short" : null;
    const pair = base["Symbol"] ? String(base["Symbol"]) : null;
    const entry = toNumber(base["Open Price"]);
    const exit_price = toNumber(closer["Close Price"]);
    const open_time = toIsoTimestamp(base["Open Date"]);
    const close_time = toIsoTimestamp(closer["Close Date"]);
    const durationFromString = parseHfmDuration(closer["Duration"]);
    const duration_seconds = durationFromString ?? computeDurationSeconds(open_time, close_time);
    // HFM's "Pips" column reports points, not forex-pips. Prefer our
    // computed value so indices/metals/crypto are normalised consistently
    // across broker files.
    const computedPips = computePips({ pair, entry, exit_price, side });
    const pipsFromFile = toNumber(closer["Pips"]);
    trades.push({
      pair,
      trade_date: toDate(base["Open Date"]),
      open_time,
      close_time,
      duration_seconds,
      pips: computedPips ?? pipsFromFile,
      session: detectSession(base["Open Date"]),
      side,
      entry,
      stop_loss: null,
      take_profit: null,
      exit_price,
      lot_size: toNumber(base["Lots"]),
      result_r: null,
      pnl: toNumber(closer["Profit"]),
      commissions: null,
      spread: null,
      account_balance: null,
      setup_tag: null,
      mistake_tag: null,
      emotions: null,
      notes: null
    });
  }
  return trades;
}

/** Parse an MT4 / MT5 HTM Statement trade table by mapping translated
 *  headers to the underlying matrix columns. Robust to either the MT4
 *  layout (Ticket first) or the MT5 layout (Time first). */
function parseMtHtmRows(matrix: unknown[][]): ParsedTrade[] {
  if (matrix.length < 2) return [];
  const header = matrix[0].map((h) => translateHeaders([String(h ?? "")])[0]);
  const lower = header.map((h) => normalize(String(h ?? "")));
  // Locate canonical columns. Time appears twice (open + close) — first
  // is open, second is close. Same for Price.
  const openTimeIdx = lower.indexOf("time");
  const closeTimeIdx = lower.lastIndexOf("time");
  const openPriceIdx = lower.indexOf("price");
  const closePriceIdx = lower.lastIndexOf("price");
  const symbolIdx = lower.findIndex((h) => h === "symbol");
  const typeIdx = lower.findIndex((h) => h === "type");
  const volumeIdx = lower.findIndex((h) => h === "volume");
  const slIdx = lower.findIndex((h) => h === "s l" || h === "sl" || h === "stop loss");
  const tpIdx = lower.findIndex((h) => h === "t p" || h === "tp" || h === "take profit");
  const commissionIdx = lower.findIndex((h) => h === "commission");
  const swapIdx = lower.findIndex((h) => h === "swap");
  const profitIdx = lower.findIndex((h) => h === "profit");

  const trades: ParsedTrade[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const sym = symbolIdx >= 0 ? String(row[symbolIdx] ?? "").trim() : "";
    const typ = typeIdx >= 0 ? String(row[typeIdx] ?? "").trim().toLowerCase() : "";
    // Skip ledger rows: balance / credit / deposit / withdrawal.
    if (!sym) continue;
    if (/^(balance|credit|deposit|withdraw)/.test(typ)) continue;
    const open_time = openTimeIdx >= 0 ? toIsoTimestamp(row[openTimeIdx]) : null;
    const close_time = closeTimeIdx >= 0 && closeTimeIdx !== openTimeIdx
      ? toIsoTimestamp(row[closeTimeIdx]) : null;
    const entry = openPriceIdx >= 0 ? toNumber(row[openPriceIdx]) : null;
    const exit_price = closePriceIdx >= 0 && closePriceIdx !== openPriceIdx
      ? toNumber(row[closePriceIdx]) : null;
    const sideVal = toSide(typ);
    const slV = slIdx >= 0 ? toNumber(row[slIdx]) : null;
    const tpV = tpIdx >= 0 ? toNumber(row[tpIdx]) : null;
    trades.push({
      pair: sym,
      trade_date: openTimeIdx >= 0 ? toDate(row[openTimeIdx]) : null,
      open_time,
      close_time,
      duration_seconds: computeDurationSeconds(open_time, close_time),
      pips: computePips({ pair: sym, entry, exit_price, side: sideVal }),
      session: detectSession(open_time),
      side: sideVal,
      entry,
      stop_loss: slV === 0 ? null : slV,
      take_profit: tpV === 0 ? null : tpV,
      exit_price,
      lot_size: volumeIdx >= 0 ? toNumber(row[volumeIdx]) : null,
      result_r: null,
      pnl: profitIdx >= 0 ? toNumber(row[profitIdx]) : null,
      commissions: commissionIdx >= 0 ? toNumber(row[commissionIdx]) : null,
      spread: swapIdx >= 0 ? toNumber(row[swapIdx]) : null,
      account_balance: null,
      setup_tag: null,
      mistake_tag: null,
      emotions: null,
      notes: null
    });
  }
  return trades;
}

/** Pull broker / account info out of MT4-style HTM preamble pairs and
 *  the raw HTML title (which usually carries broker name + login). */
function htmPreambleToAccountInfo(
  preamble: string[][] | undefined,
  rawText: string | undefined
): AccountInfo {
  const out: AccountInfo = {
    balance: null,
    equity: null,
    deposits_total: null,
    withdrawals_total: null,
    deposits_count: 0,
    withdrawals_count: 0
  };
  if (!preamble) return out;
  for (const pair of preamble) {
    const label = String(pair[0] ?? "").trim().toLowerCase().replace(/:$/, "").trim();
    const value = String(pair[1] ?? "").trim();
    if (!label || !value) continue;
    if (label === "account") {
      // MT4 HTM Account row may be just "1234567" or "1234567 (Demo)"
      // or "1234567 — JustMarkets-Demo".
      const m = value.match(/^(\S+)/);
      if (m) out.account_number = m[1];
      // Try to pick out a server label "JustMarkets-Demo".
      const sm = value.match(/([A-Za-z][A-Za-z0-9]*-(?:Demo|Real|Live|Contest|Server)\d*)/i);
      if (sm) {
        out.broker_server = sm[1];
        out.broker = sm[1].replace(/-(demo|real|live|contest|server)\d*$/i, "").trim();
      }
    } else if (label === "name") {
      out.account_holder = value;
    } else if (label === "currency") {
      out.currency = value;
    } else if (label === "company" || label === "broker") {
      out.company = value;
    }
  }
  // Title fallback: <title>Statement: 1234567 - JustMarkets-Demo</title>
  if (rawText && (!out.broker || !out.account_number)) {
    const tm = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = tm ? tm[1].replace(/\s+/g, " ").trim() : "";
    if (title) {
      if (!out.account_number) {
        const am = title.match(/(\d{5,})/);
        if (am) out.account_number = am[1];
      }
      if (!out.broker) {
        const sm = title.match(/([A-Za-z][A-Za-z0-9 ]*?)-(Demo|Real|Live|Contest)/i);
        if (sm) {
          out.broker = sm[1].trim();
          out.broker_server = `${sm[1].trim()}-${sm[2]}`;
        }
      }
    }
  }
  return out;
}

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  // The preamble field only exists on the XLSX/HTM path (and only when the
  // MT5 ReportHistory marker was detected). CSV imports don't have it.
  let preamble: unknown[][] | undefined;
  let htmPreamble: string[][] | undefined;
  let rows: Record<string, unknown>[];
  let headers: string[];
  let matrix: unknown[][];
  let rawText: string | undefined;

  if (ext === "htm" || ext === "html") {
    // MT4 / MT5 HTM Statement: parse via tolerant <tr>/<td> extraction.
    const parsedHtm: HtmParseOutput = await readHtmFile(file);
    rows = parsedHtm.rows;
    headers = parsedHtm.headers;
    matrix = parsedHtm.matrix;
    htmPreamble = parsedHtm.preamble;
    rawText = await file.text().catch(() => undefined);
  } else if (ext === "xlsx" || ext === "xls") {
    const parsedXlsx = await parseXlsx(file);
    rows = parsedXlsx.rows;
    headers = parsedXlsx.headers;
    matrix = parsedXlsx.matrix;
    preamble = parsedXlsx.preamble;
  } else {
    const parsedCsv = await parseCsv(file);
    rows = parsedCsv.rows;
    headers = parsedCsv.headers;
    matrix = parsedCsv.matrix;
  }

  // ---- Universal broker fingerprint -------------------------------------
  // Captured up front so every return branch can stamp it on the result.
  const fingerprint = (() => {
    const platform = platformFromText(rawText, file.name);
    const broker = brokerFromFilename(file.name);
    const language = detectMtLanguage(headers);
    return { platform, broker, language };
  })();

  // MT4 / MT5 HTM Statement path. The HTM trade table has its own column
  // order (Ticket | Open Time | Type | Size | Item | Price | S/L | T/P |
  // Close Time | Price | Commission | Taxes | Swap | Profit) so we map
  // by translated-header name rather than hardcoded MT5 indices.
  if ((ext === "htm" || ext === "html") && isMetaTraderHtmHeader(headers)) {
    const trades = parseMtHtmRows(matrix);
    const accountInfo: AccountInfo = htmPreambleToAccountInfo(htmPreamble, rawText);
    const broker =
      brokerFromServer(accountInfo.broker_server ?? accountInfo.company ?? null) ??
      fingerprint.broker ??
      accountInfo.broker ??
      null;
    const platform = fingerprint.platform ?? (rawText && /metatrader\s*5/i.test(rawText) ? "MT5" : "MT4");
    const mapping: Partial<Record<FieldKey, string>> = {
      trade_date: "Time",
      pair: "Symbol",
      side: "Type",
      lot_size: "Volume",
      entry: "Price",
      stop_loss: "S / L",
      take_profit: "T / P",
      pnl: "Profit",
      commissions: "Commission",
      spread: "Swap"
    };
    return {
      trades,
      headers,
      mapping,
      raw: rows,
      format: "metatrader-htm",
      accountInfo: { ...accountInfo, broker },
      broker,
      platform,
      language: fingerprint.language
    };
  }

  if (isMetaTraderHeader(headers)) {
    // The MT5 ReportHistory export is a single sheet with THREE stacked
    // sections — Positions, Orders, Deals — each preceded by its own
    // section title row and header row. Only the Positions section
    // represents real trades; rows from Orders / Deals would otherwise
    // duplicate every trade 3-4× (each fill / cancel becomes a "trade").
    //
    // We slice rows 1..N where N is the index of the next non-data row
    // (a section title like "Orders", a duplicate header, or a row
    // whose first cell is a non-date string). The footer (rows after
    // the last data row) is then scanned for Balance / Equity / Deposit
    // / Withdrawal metadata.
    const dataRows: unknown[][] = [];
    let i = 1;
    for (; i < matrix.length; i++) {
      const r = matrix[i];
      if (!Array.isArray(r)) break;
      const allEmpty = r.every((c) => c === "" || c == null);
      if (allEmpty) continue;
      const first = r[0];
      // Stop the moment we hit a section title or a duplicate header row.
      if (typeof first === "string") {
        const s = first.trim();
        if (s === "Orders" || s === "Deals" || s === "Working" || s === "Results" ||
            s === "Open Time" || s === "Time" || /^[A-Za-z][A-Za-z ]+:$/.test(s)) {
          break;
        }
      }
      // Stop if first cell isn't a parsable date — Positions rows always start
      // with the open timestamp.
      if (toDateObject(first) == null) break;
      dataRows.push(r as unknown[]);
    }
    // Filter out non-trade ledger rows that occasionally appear inside the
    // Positions section (or accidentally captured from an adjacent block):
    //   - Type column is "balance" / "credit" / "deposit" / "withdrawal"
    //   - Symbol cell is blank (no instrument means it's not a trade)
    //   - Both open price and close price are 0 (no fill prices to render)
    // Without this guard, rows like the broker's deposit ledger inflate the
    // Trade Log with garbage entries (Entry 0.05, Exit 0, Net P&L = balance).
    const isTradeRow = (r: unknown[]): boolean => {
      const type = String(r[3] ?? "").trim().toLowerCase();
      if (type === "balance" || type === "credit" || type === "deposit" || type === "withdrawal") {
        return false;
      }
      const sym = String(r[2] ?? "").trim();
      if (!sym) return false;
      const openPrice = toNumber(r[5]);
      const closePrice = toNumber(r[9]);
      if ((openPrice == null || openPrice === 0) && (closePrice == null || closePrice === 0)) {
        return false;
      }
      return true;
    };
    const trades = dataRows.filter(isTradeRow).map((r) => metaTraderRowToTrade(r));

    // Footer scan — look for "Balance:", "Equity:" rows (label in col 0,
    // value usually in col 3) and Deposit / Withdrawal entries inside the
    // Deals section (a "balance" type row with a "Deposit" or "Withdrawal"
    // comment). Then fold in the preamble metadata (account number,
    // broker, currency, holder) when the ReportHistory header strip was
    // detected upstream.
    const footerInfo = extractMt5AccountInfo(matrix);
    const preambleInfo = preamble ? extractMt5Preamble(preamble) : {};
    const accountInfo: AccountInfo = { ...footerInfo, ...preambleInfo };
    const broker =
      brokerFromServer(accountInfo.broker_server ?? accountInfo.company ?? null) ??
      fingerprint.broker ??
      accountInfo.broker ??
      null;

    const mapping: Partial<Record<FieldKey, string>> = {
      trade_date: "Time",
      pair: "Symbol",
      side: "Type",
      lot_size: "Volume",
      entry: "Price",
      stop_loss: "S / L",
      take_profit: "T / P",
      exit_price: "Price (close)",
      commissions: "Commission",
      spread: "Swap",
      pnl: "Profit"
    };
    return {
      trades,
      headers,
      mapping,
      raw: rows,
      format: "metatrader",
      accountInfo: { ...accountInfo, broker },
      broker,
      platform: fingerprint.platform ?? "MT5",
      language: fingerprint.language
    };
  }

  if (isHfmHeader(headers)) {
    const trades = parseHfmRows(rows);
    const mapping: Partial<Record<FieldKey, string>> = {
      trade_date: "Open Date",
      open_time: "Open Date",
      close_time: "Close Date",
      pair: "Symbol",
      side: "Action",
      lot_size: "Lots",
      entry: "Open Price",
      exit_price: "Close Price",
      pnl: "Profit",
      pips: "Pips",
      duration_seconds: "Duration"
    };
    // HFM's web-portal export uses the same column shape for MT4 and MT5
    // accounts, so we can't tell from the header alone. Use these fallbacks
    // in order:
    //   1. fingerprint.platform — set when filename or text contains
    //      "mt4"/"mt5" / "metatrader 4" / "metatrader 5".
    //   2. Position-ID length heuristic — MT4 tickets are typically
    //      6-9 digits; MT5 position IDs are 10+ digits.
    //   3. null — show no platform pill rather than a wrong one.
    const heuristic = guessPlatformFromHfmRows(rows);
    return {
      trades,
      headers,
      mapping,
      raw: rows,
      format: "hfm",
      broker: "HFM",
      platform: fingerprint.platform ?? heuristic,
      language: fingerprint.language
    };
  }

  if (isCTraderHeader(headers)) {
    const trades = parseCtraderRows(rows);
    const mapping: Partial<Record<FieldKey, string>> = {
      pair: "Symbol",
      side: "Direction",
      lot_size: "Volume",
      entry: "Entry price",
      exit_price: "Exit price",
      pnl: "Net USD",
      open_time: "Entry time",
      close_time: "Exit time",
      stop_loss: "Stop loss",
      take_profit: "Take profit",
      commissions: "Commission",
      spread: "Swap"
    };
    return {
      trades,
      headers,
      mapping,
      raw: rows,
      format: "ctrader",
      broker: fingerprint.broker ?? "cTrader",
      platform: "cTrader",
      language: fingerprint.language
    };
  }

  if (isTradingViewHeader(headers)) {
    const trades = parseTradingViewRows(rows);
    const mapping: Partial<Record<FieldKey, string>> = {
      trade_date: "Date/Time",
      open_time: "Date/Time",
      close_time: "Date/Time",
      side: "Type",
      entry: "Price",
      exit_price: "Price",
      pnl: "Net Profit",
      lot_size: "Position size"
    };
    return {
      trades,
      headers,
      mapping,
      raw: rows,
      format: "tradingview",
      broker: "TradingView",
      platform: "TradingView",
      language: fingerprint.language
    };
  }

  const mapping = buildColumnMap(headers);
  const trades = rows.map((r) => {
    const t = rowToTrade(r, mapping);
    if (!t.session) t.session = detectSession(t.open_time ?? t.trade_date);
    return t;
  });
  return {
    trades,
    headers,
    mapping,
    raw: rows,
    format: "generic",
    broker: fingerprint.broker,
    platform: fingerprint.platform,
    language: fingerprint.language
  };
}
