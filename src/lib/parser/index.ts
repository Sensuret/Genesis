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

export type ParsedTrade = {
  pair: string | null;
  trade_date: string | null;
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
  "account_balance"
];

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).replace(/[$,\s]/g, "").replace(/\((.*)\)/, "-$1");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    return null;
  }
  const s = String(value).trim();
  // MetaTrader writes "2026.03.04 16:57:05" — Date() chokes on the dots.
  const mt = s.match(/^(\d{4})[./-](\d{2})[./-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (mt) {
    const [, y, mo, d, hh = "00", mm = "00", ss = "00"] = mt;
    const iso = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
    if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  }
  // Excel serial number?
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number.parseFloat(s);
    if (n > 30000 && n < 60000) {
      const ms = (n - 25569) * 86_400_000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
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
 * Detect the trading session from a UTC open-time string. Hours are in UTC:
 *   - Sydney  : 22:00 – 06:00 UTC
 *   - Asian   : 00:00 – 08:00 UTC
 *   - London  : 07:00 – 16:00 UTC
 *   - New York: 12:00 – 21:00 UTC
 * Overlap windows favour the *later* opening session (e.g. London during
 * London/NY overlap, NY after 12:00).
 */
export function detectSession(value: unknown): string | null {
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
  if (hour >= 12 && hour <= 20) return "New York";
  if (hour >= 7 && hour < 12) return "London";
  if (hour >= 0 && hour < 7) return "Asia";
  return "Sydney";
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
  const norm = h.map((x) => normalize(String(x ?? "")));
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

function metaTraderRowToTrade(row: unknown[]): ParsedTrade {
  // Column layout (0-based):
  // 0=open time | 1=position | 2=symbol | 3=type | 4=volume | 5=open price |
  // 6=S/L | 7=T/P | 8=close time | 9=close price | 10=commission | 11=swap |
  // 12=profit
  const openTime = row[0];
  const out: ParsedTrade = {
    pair: row[2] != null ? String(row[2]) : null,
    trade_date: toDate(openTime),
    session: detectSession(openTime),
    side: toSide(row[3]),
    entry: toNumber(row[5]),
    stop_loss: toNumber(row[6]),
    take_profit: toNumber(row[7]),
    exit_price: toNumber(row[9]),
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
  return out;
}

export function rowToTrade(
  row: Record<string, unknown>,
  map: Partial<Record<FieldKey, string>>
): ParsedTrade {
  const get = (field: FieldKey) => {
    const col = map[field];
    return col ? row[col] : undefined;
  };

  const out: ParsedTrade = {
    pair: get("pair") ? String(get("pair")) : null,
    trade_date: toDate(get("trade_date")),
    session: get("session") ? String(get("session")) : detectSession(get("trade_date")),
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

export async function parseXlsx(
  file: File
): Promise<{ rows: Record<string, unknown>[]; headers: string[]; matrix: unknown[][] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // header:1 → 2D array preserving duplicate column names
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const rawHeaders = (matrix[0] ?? []).map((h) => String(h ?? ""));
  const dataMatrix = matrix.slice(1);
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
  return { rows, headers: rawHeaders, matrix };
}

export type ParseResult = {
  trades: ParsedTrade[];
  headers: string[];
  mapping: Partial<Record<FieldKey, string>>;
  raw: Record<string, unknown>[];
  format: "metatrader" | "generic";
};

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const { rows, headers, matrix } =
    ext === "xlsx" || ext === "xls" ? await parseXlsx(file) : await parseCsv(file);

  if (isMetaTraderHeader(headers)) {
    const trades = matrix
      .slice(1)
      .filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null))
      .map((r) => metaTraderRowToTrade(r as unknown[]));
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
    return { trades, headers, mapping, raw: rows, format: "metatrader" };
  }

  const mapping = buildColumnMap(headers);
  const trades = rows.map((r) => {
    const t = rowToTrade(r, mapping);
    if (!t.session) t.session = detectSession(t.trade_date);
    return t;
  });
  return { trades, headers, mapping, raw: rows, format: "generic" };
}
