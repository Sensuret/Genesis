// =====================================================================
// cTrader CSV "Trade History" parser.
//
// cTrader (Spotware) exports a flat CSV per-trade rather than the
// stacked Positions / Orders / Deals layout MetaTrader uses. Columns
// vary slightly between regions but the canonical set is:
//
//   Order ID, Position ID, Symbol, Direction, Volume,
//   Entry time, Entry price, Exit time, Exit price,
//   Stop loss, Take profit, Commission, Swap, Net USD,
//   Gross profit, Pips
//
// Some brokers ship a localised "Net <CCY>" header (Net EUR / Net GBP);
// we accept any "Net XXX" 3-letter currency suffix.
// =====================================================================

import type { ParsedTrade } from "./index";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[, ]/g, "").replace(/\u00a0/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function iso(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  // cTrader uses "yyyy-MM-dd HH:mm:ss" or "yyyy-MM-ddTHH:mm:ss" (UTC).
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

function side(v: unknown): "long" | "short" | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s.startsWith("buy") || s === "long") return "long";
  if (s.startsWith("sell") || s === "short") return "short";
  return null;
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

/** Find the column whose header contains every keyword in `terms`
 *  (case-insensitive) — order-independent. */
function pick(rows: Record<string, unknown>[], ...terms: string[]): string | null {
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0]);
  for (const h of headers) {
    const low = h.toLowerCase();
    if (terms.every((t) => low.includes(t.toLowerCase()))) return h;
  }
  return null;
}

export function parseCtraderRows(rows: Record<string, unknown>[]): ParsedTrade[] {
  if (rows.length === 0) return [];
  const colSym = pick(rows, "symbol") || pick(rows, "instrument");
  const colDir = pick(rows, "direction") || pick(rows, "side");
  const colVol = pick(rows, "volume") || pick(rows, "size") || pick(rows, "lots");
  const colEntryTime = pick(rows, "entry", "time") || pick(rows, "open", "time");
  const colEntryPrice = pick(rows, "entry", "price") || pick(rows, "open", "price");
  const colExitTime = pick(rows, "exit", "time") || pick(rows, "close", "time");
  const colExitPrice = pick(rows, "exit", "price") || pick(rows, "close", "price");
  const colSl = pick(rows, "stop loss") || pick(rows, "sl");
  const colTp = pick(rows, "take profit") || pick(rows, "tp");
  const colCommission = pick(rows, "commission");
  const colSwap = pick(rows, "swap");
  // "Net USD" / "Net EUR" / "Net GBP" / "Net P/L" — any of these works.
  const colNet =
    pick(rows, "net usd") ||
    pick(rows, "net eur") ||
    pick(rows, "net gbp") ||
    pick(rows, "net p") ||
    pick(rows, "net profit") ||
    pick(rows, "net") ||
    pick(rows, "gross profit") ||
    pick(rows, "profit");
  const colPips = pick(rows, "pips");

  const out: ParsedTrade[] = [];
  for (const r of rows) {
    const open_time = colEntryTime ? iso(r[colEntryTime]) : null;
    const close_time = colExitTime ? iso(r[colExitTime]) : null;
    const trade: ParsedTrade = {
      pair: colSym ? String(r[colSym] ?? "") || null : null,
      trade_date: colEntryTime ? dayOnly(r[colEntryTime]) : null,
      open_time,
      close_time,
      duration_seconds: dur(open_time, close_time),
      pips: colPips ? num(r[colPips]) : null,
      session: sessionFromOpen(open_time),
      side: colDir ? side(r[colDir]) : null,
      entry: colEntryPrice ? num(r[colEntryPrice]) : null,
      stop_loss: colSl ? (() => { const v = num(r[colSl]); return v === 0 ? null : v; })() : null,
      take_profit: colTp ? (() => { const v = num(r[colTp]); return v === 0 ? null : v; })() : null,
      exit_price: colExitPrice ? num(r[colExitPrice]) : null,
      lot_size: colVol ? num(r[colVol]) : null,
      result_r: null,
      pnl: colNet ? num(r[colNet]) : null,
      commissions: colCommission ? num(r[colCommission]) : null,
      spread: colSwap ? num(r[colSwap]) : null,
      account_balance: null,
      setup_tag: null,
      mistake_tag: null,
      emotions: null,
      notes: null
    };
    // Drop rows that aren't real trades (no symbol or no fill prices).
    if (!trade.pair) continue;
    if (trade.entry == null && trade.exit_price == null) continue;
    out.push(trade);
  }
  return out;
}
