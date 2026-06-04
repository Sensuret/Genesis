// =====================================================================
// TradingView Strategy Tester "List of Trades" CSV parser.
//
// TradingView exports a CSV where EACH TRADE is split across TWO rows
// — Entry and Exit — bound by `Trade #`. Columns:
//
//   Trade #, Type, Date/Time, Signal, Price USD, Position size,
//   Net Profit USD, Net Profit %, Run-up USD, Run-up %,
//   Drawdown USD, Drawdown %, Cumulative profit USD, Cumulative profit %
//
// We pair "Entry long/short" with "Exit long/short" by Trade # and emit
// one canonical ParsedTrade per pair.
// =====================================================================

import type { ParsedTrade } from "./index";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  // Strip currency symbols, percent signs, commas, NBSPs.
  const s = String(v).replace(/[$€£¥%, \u00a0]/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function iso(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function dayOnly(v: unknown): string | null {
  const t = iso(v);
  return t ? t.slice(0, 10) : null;
}

function dur(open: string | null, close: string | null): number | null {
  if (!open || !close) return null;
  const a = new Date(open).getTime();
  const b = new Date(close).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 1000);
}

function sessionFromOpen(openIso: string | null): string | null {
  if (!openIso) return null;
  const d = new Date(openIso);
  const h = d.getUTCHours();
  if (h >= 0 && h < 7) return "Asia";
  if (h >= 7 && h < 12) return "London";
  if (h >= 12 && h <= 20) return "New York";
  return null;
}

function pick(rows: Record<string, unknown>[], ...terms: string[]): string | null {
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0]);
  for (const h of headers) {
    const low = h.toLowerCase();
    if (terms.every((t) => low.includes(t.toLowerCase()))) return h;
  }
  return null;
}

export function parseTradingViewRows(rows: Record<string, unknown>[]): ParsedTrade[] {
  if (rows.length === 0) return [];
  const colTradeNum = pick(rows, "trade #") || pick(rows, "trade", "no") || pick(rows, "trade", "id");
  const colType = pick(rows, "type");
  const colDateTime = pick(rows, "date", "time") || pick(rows, "date") || pick(rows, "time");
  const colPrice = pick(rows, "price");
  const colSize = pick(rows, "position", "size") || pick(rows, "qty") || pick(rows, "size");
  const colNetUsd =
    pick(rows, "net profit", "usd") ||
    pick(rows, "net profit") ||
    pick(rows, "p&l") ||
    pick(rows, "profit");

  if (!colTradeNum || !colType) return [];

  type Bucket = { entry?: Record<string, unknown>; exit?: Record<string, unknown> };
  const byNum = new Map<string, Bucket>();
  for (const r of rows) {
    const n = String(r[colTradeNum] ?? "").trim();
    if (!n) continue;
    const t = String(r[colType] ?? "").toLowerCase();
    const bucket = byNum.get(n) ?? {};
    if (/^entry/.test(t)) bucket.entry = r;
    else if (/^exit/.test(t)) bucket.exit = r;
    byNum.set(n, bucket);
  }

  const out: ParsedTrade[] = [];
  for (const { entry, exit } of byNum.values()) {
    if (!entry || !exit) continue;
    const typeStr = String(entry[colType] ?? "").toLowerCase();
    const dirSide: "long" | "short" | null =
      /long/.test(typeStr) ? "long" : /short/.test(typeStr) ? "short" : null;

    const open_time = colDateTime ? iso(entry[colDateTime]) : null;
    const close_time = colDateTime ? iso(exit[colDateTime]) : null;
    const trade: ParsedTrade = {
      pair: null, // TradingView Strategy Tester export doesn't include the symbol per-row
      trade_date: colDateTime ? dayOnly(entry[colDateTime]) : null,
      open_time,
      close_time,
      duration_seconds: dur(open_time, close_time),
      pips: null,
      session: sessionFromOpen(open_time),
      side: dirSide,
      entry: colPrice ? num(entry[colPrice]) : null,
      stop_loss: null,
      take_profit: null,
      exit_price: colPrice ? num(exit[colPrice]) : null,
      lot_size: colSize ? num(entry[colSize]) : null,
      result_r: null,
      pnl: colNetUsd ? num(exit[colNetUsd]) : null,
      commissions: null,
      spread: null,
      account_balance: null,
      setup_tag: null,
      mistake_tag: null,
      emotions: null,
      notes: null
    };
    out.push(trade);
  }
  return out;
}
