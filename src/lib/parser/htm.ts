// =====================================================================
// MT4 / MT5 HTM Statement parser.
//
// MT4 cannot natively export to XLSX — its native "Save as Detailed
// Report" produces an HTML file. MT5 also commonly exports HTM. This
// module reads those reports and produces:
//   - `headers`: the canonical column-header row (translated to English)
//   - `matrix`:  a 2-D array of every body cell, with the header row at
//                index 0 (matches the shape `parseFile` already expects
//                for XLSX/CSV inputs)
//   - `rows`:    keyed Record<header, value> form
//   - `preamble`: the "Account / Name / Currency / Leverage" rows
//                 that sit above the trades table
//
// We don't depend on a heavy HTML parser: MT statements are fixed-shape
// and we only need <table>, <tr>, <td>, <th>. A tolerant regex scan is
// enough and works in both browser and Node test environments.
// =====================================================================

import { translateHeader } from "./i18n-headers";

export type HtmParseOutput = {
  rows: Record<string, unknown>[];
  headers: string[];      // Canonical English headers (post-translation).
  rawHeaders: string[];   // Original (possibly localised) headers.
  matrix: unknown[][];    // matrix[0] === headers.
  preamble: string[][];   // Each row is a [label, value] pair.
};

/** Decode the most common HTML entities the MT report engine emits. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(Number.parseInt(n, 16)));
}

/** Strip all HTML tags from a cell, collapse whitespace. */
function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Pull every <tr> ... </tr> block out of an HTML body. */
function extractRows(html: string): string[] {
  const out: string[] = [];
  const rx = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) != null) out.push(m[1]);
  return out;
}

/** Pull every <td>/<th> cell out of a <tr> row body. */
function extractCells(rowHtml: string): string[] {
  const out: string[] = [];
  const rx = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(rowHtml)) != null) out.push(stripHtml(m[1]));
  return out;
}

/** True when a row's cells look like the MT trade-table column header
 *  (translated). MT statements always include a duplicated Time + Price
 *  pair plus Symbol/Volume/Profit. */
function looksLikeTradeHeaderRow(cells: string[]): boolean {
  if (cells.length < 8) return false;
  const translated = cells.map((c) => translateHeader(c).toLowerCase());
  const occurs = (term: string) => translated.filter((t) => t === term).length;
  return (
    occurs("time") >= 2 &&
    occurs("price") >= 2 &&
    translated.includes("symbol") &&
    translated.includes("volume") &&
    translated.includes("profit")
  );
}

/** Heuristic: is this row a key-value preamble pair (e.g. "Account:" / "1234")? */
function looksLikePreamblePair(cells: string[]): boolean {
  if (cells.length < 2) return false;
  const first = cells[0].trim();
  return /:$/.test(first) && first.length < 32;
}

export function parseHtm(text: string): HtmParseOutput {
  const cleaned = text.replace(/<\/?(html|head|body|title|meta|script|style)[^>]*>/gi, "");
  const rows = extractRows(cleaned);

  const preamble: string[][] = [];
  let headerCells: string[] | null = null;
  let headerIndex = -1;

  // Find the header row first. Walk every <tr>, classify it.
  for (let i = 0; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (looksLikeTradeHeaderRow(cells)) {
      headerCells = cells;
      headerIndex = i;
      break;
    }
    if (looksLikePreamblePair(cells)) {
      preamble.push(cells);
    }
  }

  if (!headerCells || headerIndex < 0) {
    // No MT trade table found.
    return { rows: [], headers: [], rawHeaders: [], matrix: [], preamble };
  }

  // Translate the header row to canonical English so downstream MT
  // detectors light up.
  const rawHeaders = headerCells;
  const headers = headerCells.map((h) => translateHeader(h));

  // Body rows: every <tr> after the header row whose cells are the
  // same length as the header. Stop at the first short / divider row
  // (MT reports use a 1-cell <tr> as a section divider).
  const dataMatrix: string[][] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (cells.length === 0) continue;
    // Section divider: a single-cell row used as a section title
    // ("Closed Transactions:", "Working orders:", "Summary"…).
    if (cells.length === 1) break;
    // Some MT4 statements append a "Closed P/L" totals row whose first
    // cell is non-numeric and only some columns are populated. Stop
    // when the count drops by more than 2 columns from the header.
    if (cells.length < headerCells.length - 2) break;
    // Pad or trim to header length.
    const aligned: string[] = [];
    for (let c = 0; c < headerCells.length; c++) aligned.push(cells[c] ?? "");
    dataMatrix.push(aligned);
  }

  // Build keyed rows. Headers are unique-ified ("Time" / "Time (2)") so
  // the keyed form doesn't lose duplicated columns.
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((h) => {
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return n === 1 ? h : `${h} (${n})`;
  });
  const keyedRows: Record<string, unknown>[] = dataMatrix.map((row) => {
    const r: Record<string, unknown> = {};
    uniqueHeaders.forEach((h, i) => { r[h] = row[i]; });
    return r;
  });

  const matrix: unknown[][] = [headers, ...dataMatrix];
  return { rows: keyedRows, headers, rawHeaders, matrix, preamble };
}

/** Read an HTM/HTML file as text and run `parseHtm`. */
export async function readHtmFile(file: File): Promise<HtmParseOutput> {
  const text = await file.text();
  return parseHtm(text);
}
