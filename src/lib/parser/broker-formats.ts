/**
 * GƎNƎSIS · Broker file format library
 *
 * Genesis used to ship a single MT5-XLSX-only smart parser. PR YA generalises
 * that to the wider broker landscape:
 *
 *   - MetaTrader 5 ReportHistory  · XLSX  (English + 8 localised label sets)
 *   - MetaTrader 5 ReportHistory  · HTM   (any locale)
 *   - MetaTrader 4 Account/Statement · XLSX (Ticket-first column order)
 *   - MetaTrader 4 Account/Statement · HTM
 *   - Generic CSV/XLSX fall-through (existing column-guesser pipeline)
 *
 * The pipeline is unchanged — only the *detection* + *extraction* layer was
 * extended. Every format eventually flows through the same `metaTraderRowToTrade`
 * (MT5) or `mt4RowToTrade` (MT4) row mapper, and the same `extractMt5AccountInfo`
 * footer scanner. This module owns the bits that knew about exactly one
 * language ("Trade History Report") and now know about many ("Reporte de
 * Historial de Operaciones", "Histórico de Operações", etc.).
 *
 * Why colocated in `broker-formats.ts` and not inlined in `parser/index.ts`:
 *   - Keeps `parser/index.ts` focused on the canonical Trade shape + column
 *     mapping logic.
 *   - Lets each new broker fingerprint sit next to its label dictionary.
 *   - Makes the localisation table easy to extend (just add a row).
 */
import * as XLSX from "xlsx";

/* ──────────────────────────────────────────────────────────────────────
 *                       LOCALISED LABELS (MetaTrader)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * MetaTrader writes preamble labels in the *terminal's* UI language, so a
 * Spanish trader's export says "Cuenta:" instead of "Account:". The values
 * downstream (account number, broker server, currency, profit, etc.) are
 * always written in the same machine-readable form across locales — only
 * the label cells change.
 *
 * We treat every entry below as equivalent to its canonical English label
 * when sniffing the preamble. Adding a new language is a single row:
 * find the four labels in a sample export and append them.
 *
 * Stripped of trailing colons, normalised to lower-case before compare.
 */
export const MT_LABELS = {
  // MT5: "Trade History Report" / MT4: "Account History" / "Statement Report"
  report_title: [
    // English (MT5 + MT4)
    "trade history report",
    "account history",
    "account statement",
    "statement report",
    "trading statement",
    // Spanish
    "reporte de historial de operaciones",
    "informe de historial de operaciones",
    "informe de historial",
    "estado de cuenta",
    // Portuguese (BR + PT)
    "histórico de operações",
    "relatório de histórico",
    "extrato da conta",
    // French
    "rapport de l'historique des opérations",
    "rapport de l'historique",
    "historique du compte",
    // German
    "kontostandsbericht",
    "kontoauszug",
    "handelshistorie",
    // Italian
    "rapporto storico delle operazioni",
    "estratto conto",
    // Russian
    "отчёт об истории сделок",
    "отчет об истории сделок",
    "история счёта",
    "история счета",
    // Chinese (Simplified)
    "交易历史报告",
    "账户历史",
    // Japanese
    "取引履歴レポート",
    "口座履歴",
    // Arabic
    "تقرير سجل التداول",
    "كشف الحساب",
    // Polish
    "raport historii transakcji",
    "wyciąg z konta",
    // Vietnamese
    "báo cáo lịch sử giao dịch",
    // Indonesian
    "laporan riwayat perdagangan",
    "riwayat akun"
  ],
  // The "Name:" row — the trader's full name.
  name: [
    "name",
    "nombre",
    "nome",
    "nom",
    "имя",
    "姓名",
    "氏名",
    "الاسم",
    "imię",
    "tên",
    "nama"
  ],
  // The "Account:" row — login + parens metadata.
  account: [
    "account",
    "cuenta",
    "conta",
    "compte",
    "konto",
    "счёт",
    "счет",
    "账户",
    "账号",
    "口座",
    "الحساب",
    "konto",
    "tài khoản",
    "akun"
  ],
  // The "Company:" / dealing firm row.
  company: [
    "company",
    "empresa",
    "compañía",
    "compañia",
    "société",
    "société de courtage",
    "firma",
    "unternehmen",
    "компания",
    "公司",
    "会社",
    "الشركة",
    "spółka",
    "công ty",
    "perusahaan"
  ],
  // The "Date:" row — report-generated timestamp.
  date: [
    "date",
    "fecha",
    "data",
    "datum",
    "дата",
    "日期",
    "日付",
    "التاريخ",
    "ngày",
    "tanggal"
  ]
} as const;

/** Normalise a string for label comparison: lower-case, trim, drop trailing colons. */
function normLabel(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).trim().toLowerCase().replace(/[:：﹕]\s*$/, "").trim();
}

/** Returns the canonical key (`name` / `account` / `company` / `date`) for a
 *  preamble label cell, or null if the cell isn't a known MT label in any
 *  supported language. */
export function classifyMtLabel(cell: unknown): keyof typeof MT_LABELS | null {
  const s = normLabel(typeof cell === "string" ? cell : null);
  if (!s) return null;
  for (const [key, candidates] of Object.entries(MT_LABELS) as [
    keyof typeof MT_LABELS,
    readonly string[]
  ][]) {
    if (key === "report_title") continue;
    if (candidates.some((c) => c === s)) return key;
  }
  return null;
}

/** Returns true if any cell in the first ~10 rows looks like an MT report
 *  title in any supported language. */
export function hasMtReportTitle(matrix: unknown[][]): boolean {
  const limit = Math.min(10, matrix.length);
  for (let i = 0; i < limit; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (typeof cell !== "string") continue;
      const norm = cell.trim().toLowerCase();
      if (!norm) continue;
      if (
        MT_LABELS.report_title.some(
          (t) => norm === t || norm.includes(t)
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/* ──────────────────────────────────────────────────────────────────────
 *                       MT4 column-header detection
 * ──────────────────────────────────────────────────────────────────── */

/**
 * MT4's account history starts with a **Ticket** column and uses different
 * header names from MT5:
 *
 *   Ticket | Open Time | Type | Size | Item | Price | S / L | T / P |
 *   Close Time | Price | Commission | Taxes | Swap | Profit
 *
 * (MT5's equivalent header is Time | Position | Symbol | Type | Volume |
 *  Price | S / L | T / P | Time | Price | Commission | Swap | Profit.)
 *
 * Two signals required: starts with "ticket" + has duplicated "price" cells.
 * That's distinctive enough to never fire on a plain CSV.
 */
function normHeaderToken(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-/]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isMt4Header(headers: unknown[]): boolean {
  if (headers.length < 13) return false;
  const norm = headers.map(normHeaderToken);
  // First non-empty header must be "ticket" (MT4) — distinguishes from MT5
  // which always leads with "time".
  const firstNonEmpty = norm.find((h) => h.length > 0);
  if (firstNonEmpty !== "ticket") return false;
  if (!norm.includes("item")) return false;
  // Duplicated "price" (open + close).
  const firstPrice = norm.indexOf("price");
  const lastPrice = norm.lastIndexOf("price");
  if (firstPrice < 0 || lastPrice <= firstPrice) return false;
  if (!norm.includes("profit")) return false;
  return true;
}

/* ──────────────────────────────────────────────────────────────────────
 *                       HTML report parsing (MT4/MT5)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Convert a MetaTrader HTML report (Statement / ReportHistory exported as
 * `.htm` / `.html`) into a 2D matrix that mirrors the XLSX shape used by
 * the rest of the parser. MT writes one big `<table>` containing both the
 * preamble (Name / Account / Company / Date rows) and the trade rows, so
 * a row-by-row text extract is enough — no need for a full HTML AST.
 *
 * MetaTrader uses entity-encoded characters (`&nbsp;`, `&amp;`, `&lt;`,
 * `&#1234;`) so we decode those before returning. Cells containing only
 * `&nbsp;` collapse to empty strings, matching the XLSX `defval: ""`
 * behaviour upstream.
 */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " "
};

function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, body) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(code)) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return full;
        }
      }
      return full;
    }
    const ent = HTML_ENTITIES[body.toLowerCase()];
    return ent ?? full;
  });
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

/**
 * Extract a 2D `string[][]` matrix from an MT HTML report.
 *
 * Strategy:
 *   1. Match every `<tr>...</tr>` block (case-insensitive, spans newlines).
 *   2. For each row, match every `<td>` and `<th>` block.
 *   3. Decode entities and strip nested tags (MT often nests `<b>` /
 *      `<font>` inside cells).
 *
 * The resulting matrix is the same shape as `XLSX.utils.sheet_to_json`
 * with `header: 1` would produce, so the existing
 * `findMt5ReportHeaderRow` / `extractMt5Preamble` /
 * `extractMt5AccountInfo` / `metaTraderRowToTrade` /
 * `mt4RowToTrade` pipeline can consume it without modification.
 */
export function htmlReportToMatrix(html: string): string[][] {
  const matrix: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      const raw = cellMatch[1];
      const cleaned = decodeHtmlEntities(stripHtmlTags(raw));
      cells.push(cleaned);
    }
    if (cells.length > 0) {
      matrix.push(cells);
    }
  }
  return matrix;
}

/** Minimal MIME / extension probe: the file is a MetaTrader HTML report. */
export function looksLikeHtmlReport(file: { name: string; type?: string }): boolean {
  const lower = (file.name || "").toLowerCase();
  if (lower.endsWith(".htm") || lower.endsWith(".html")) return true;
  if (file.type && /^text\/html/i.test(file.type)) return true;
  return false;
}

/* ──────────────────────────────────────────────────────────────────────
 *                       MT4 row mapper
 * ──────────────────────────────────────────────────────────────────── */

/**
 * MT4 row → ordered tuple matching the row indices used by the existing
 * MT5 row mapper, so callers can reuse `metaTraderRowToTrade` without
 * branching.
 *
 * MT4 column layout (0-based):
 *   0=ticket | 1=open time | 2=type | 3=size | 4=item | 5=open price |
 *   6=S/L | 7=T/P | 8=close time | 9=close price | 10=commission |
 *   11=taxes | 12=swap | 13=profit
 *
 * MT5 row mapper expects:
 *   0=open time | 1=position | 2=symbol | 3=type | 4=volume | 5=open price |
 *   6=S/L | 7=T/P | 8=close time | 9=close price | 10=commission |
 *   11=swap | 12=profit
 *
 * So we shuffle MT4's columns into the MT5 layout and the existing
 * `metaTraderRowToTrade` does the rest. MT4's "Taxes" column (11) is
 * folded into commissions (10).
 */
export function mt4RowToMt5Layout(row: unknown[]): unknown[] {
  const ticket = row[0];
  const openTime = row[1];
  const type = row[2];
  const size = row[3];
  const item = row[4];
  const openPrice = row[5];
  const sl = row[6];
  const tp = row[7];
  const closeTime = row[8];
  const closePrice = row[9];
  const commission = row[10];
  const taxes = row[11];
  const swap = row[12];
  const profit = row[13];
  // Combine commission + taxes — both are deductions and analytics treat
  // them identically. Falls back to either one if the other is missing.
  const commissionCombined = (() => {
    const c = typeof commission === "number" ? commission : Number(commission);
    const t = typeof taxes === "number" ? taxes : Number(taxes);
    const cN = Number.isFinite(c) ? c : 0;
    const tN = Number.isFinite(t) ? t : 0;
    if (!Number.isFinite(c) && !Number.isFinite(t)) return commission ?? taxes ?? null;
    return cN + tN;
  })();
  return [
    openTime,
    ticket,
    item,
    type,
    size,
    openPrice,
    sl,
    tp,
    closeTime,
    closePrice,
    commissionCombined,
    swap,
    profit
  ];
}

/* ──────────────────────────────────────────────────────────────────────
 *                       File-type sniffer
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Detect file type from a `File` object so the dispatcher can pick the
 * right parser. We can't trust the user's filename alone (some browsers
 * strip extensions on download), so this falls back to MIME type.
 */
export type DetectedFileKind = "csv" | "xlsx" | "xls" | "html" | "unknown";

export function detectFileKind(file: File): DetectedFileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".xls")) return "xls";
  if (name.endsWith(".htm") || name.endsWith(".html")) return "html";
  if (file.type === "text/csv") return "csv";
  if (file.type === "text/html") return "html";
  if (file.type.includes("spreadsheetml")) return "xlsx";
  if (file.type === "application/vnd.ms-excel") return "xls";
  return "unknown";
}

/* ──────────────────────────────────────────────────────────────────────
 *                       Re-export for convenience
 * ──────────────────────────────────────────────────────────────────── */

// XLSX is imported here so consumers of this module don't need to import it
// directly when chaining `htmlReportToMatrix` with the existing XLSX path.
export { XLSX };
