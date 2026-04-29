// =====================================================================
// GƎNƎSIS Trade Import Engine
// Auto-maps any broker CSV/XLSX to the canonical Trade shape.
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
  trade_date: ["date", "trade date", "open date", "open time", "opened", "entry time", "datetime", "time"],
  session: ["session"],
  side: ["side", "direction", "type", "buy/sell", "long/short", "action"],
  entry: ["entry", "open price", "entry price", "buy price", "open"],
  stop_loss: ["sl", "stop", "stop loss", "stoploss"],
  take_profit: ["tp", "take profit", "takeprofit", "target"],
  exit_price: ["exit", "exit price", "close price", "sell price", "close"],
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
  return s.toLowerCase().trim().replace(/[\s_\-/]+/g, " ");
}

/** Build a column-name → canonical-field map from a header row. */
export function buildColumnMap(headers: string[]): Partial<Record<FieldKey, string>> {
  const map: Partial<Record<FieldKey, string>> = {};
  const headerNorms = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  for (const [field, syns] of Object.entries(SYNONYMS) as [FieldKey, string[]][]) {
    for (const s of syns) {
      const found = headerNorms.find((h) => h.norm === s || h.norm.includes(s));
      if (found) {
        map[field] = found.raw;
        break;
      }
    }
  }
  return map;
}

const NUMERIC_FIELDS: FieldKey[] = [
  "entry", "stop_loss", "take_profit", "exit_price", "lot_size",
  "result_r", "pnl", "commissions", "spread", "account_balance"
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
  // Excel serial number?
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number.parseFloat(s);
    if (n > 30000 && n < 60000) {
      // 1900 epoch -> ms (XLSX has well-known shift)
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
    session: get("session") ? String(get("session")) : null,
    side: toSide(get("side")),
    entry: null, stop_loss: null, take_profit: null, exit_price: null,
    lot_size: null, result_r: null, pnl: null, commissions: null,
    spread: null, account_balance: null,
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

export async function parseCsv(file: File): Promise<{ rows: Record<string, unknown>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => resolve({ rows: res.data, headers: res.meta.fields ?? [] }),
      error: (err) => reject(err)
    });
  });
}

export async function parseXlsx(file: File): Promise<{ rows: Record<string, unknown>[]; headers: string[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

export async function parseFile(file: File): Promise<{ trades: ParsedTrade[]; headers: string[]; mapping: Partial<Record<FieldKey, string>>; raw: Record<string, unknown>[] }> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const { rows, headers } =
    ext === "xlsx" || ext === "xls" ? await parseXlsx(file) : await parseCsv(file);
  const mapping = buildColumnMap(headers);
  const trades = rows.map((r) => rowToTrade(r, mapping));
  return { trades, headers, mapping, raw: rows };
}
