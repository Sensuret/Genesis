// =====================================================================
// MetaTrader 4 / 5 column-header translations across the 8 most common
// broker localizations: English, Spanish, Portuguese, German, French,
// Italian, Russian, Chinese (Simplified).
//
// MT4/MT5 ships with localized terminal builds that translate the
// statement column headers — so an Exness Spanish user gets
// "Hora", "Símbolo", "Volumen", "Precio", "Beneficio" instead of
// "Time", "Symbol", "Volume", "Price", "Profit". The existing detector
// is English-only; this module normalises foreign headers back to
// canonical English BEFORE detection runs, so the same code paths
// handle every language.
//
// Comparison is done after `normalize()` (lowercase, collapse spaces,
// strip punctuation), so we store entries pre-normalised.
// =====================================================================

function n(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_\-/]+/g, " ").replace(/\s+/g, " ");
}

/** Inverse map: foreign-or-decorated header → canonical English term. */
const RAW_TRANSLATIONS: Record<string, string[]> = {
  // English / fallback
  time: [
    "Time", "Open Time", "Close Time", "Date", "Open Date", "Close Date",
    // Spanish
    "Hora", "Tiempo", "Fecha", "Hora Apertura", "Hora Cierre", "Fecha Apertura", "Fecha Cierre",
    // Portuguese
    "Hora Abertura", "Hora Fechamento", "Data Abertura", "Data Fechamento",
    // German
    "Zeit", "Öffnungszeit", "Schließzeit", "Eröffnungszeit", "Datum",
    // French
    "Heure", "Temps", "Heure d'ouverture", "Heure de clôture",
    // Italian
    "Ora", "Ora Apertura", "Ora Chiusura", "Data Apertura", "Data Chiusura",
    // Russian
    "Время", "Время открытия", "Время закрытия", "Дата", "Дата открытия", "Дата закрытия",
    // Chinese (Simplified)
    "时间", "开仓时间", "平仓时间", "日期"
  ],
  symbol: [
    "Symbol", "Item", "Instrument",
    "Símbolo", "Simbolo",
    "Symbole",
    "Символ", "Инструмент",
    "品种", "交易品种", "符号"
  ],
  type: [
    "Type",
    "Tipo",
    "Typ",
    "Тип",
    "类型", "操作"
  ],
  side: [
    "Direction", "Action", "Buy/Sell",
    "Dirección", "Direção",
    "Richtung",
    "Direction",
    "Direzione",
    "Направление",
    "方向"
  ],
  position: [
    "Position", "Ticket", "Order ID", "Order",
    "Posición", "Posição", "Boleto", "Posizione",
    "Позиция", "Тикет", "Ордер",
    "持仓", "票号", "订单"
  ],
  volume: [
    "Volume", "Size", "Lots", "Lot",
    "Volumen", "Tamaño",
    "Tamanho",
    "Volumen", "Größe",
    "Taille",
    "Volume", "Dimensione",
    "Объем", "Объём", "Размер",
    "交易量", "数量", "手数"
  ],
  price: [
    "Price",
    "Precio",
    "Preço",
    "Preis", "Kurs",
    "Prix",
    "Prezzo",
    "Цена",
    "价格"
  ],
  stop_loss: [
    "S / L", "S/L", "Stop Loss", "Stoploss", "Stop",
    "S / L", "S/L",
    "Стоп", "Стоп лосс"
  ],
  take_profit: [
    "T / P", "T/P", "Take Profit", "Takeprofit", "Target",
    "Тейк", "Тейк профит"
  ],
  commission: [
    "Commission", "Commissions", "Fee", "Fees",
    "Comisión", "Comisiones",
    "Comissão", "Comissões",
    "Kommission", "Provision", "Gebühr",
    "Commission", "Frais",
    "Commissione", "Commissioni",
    "Комиссия",
    "佣金", "手续费"
  ],
  swap: [
    "Swap", "Swaps", "Rollover", "Carry",
    "Swap",
    "Swap",
    "Своп",
    "库存费", "掉期"
  ],
  profit: [
    "Profit", "P/L", "P&L", "PnL", "Net P/L", "Net P&L", "Result",
    "Beneficio", "Ganancia", "Resultado",
    "Lucro", "Resultado",
    "Gewinn", "Ergebnis",
    "Profit", "Bénéfice", "Résultat",
    "Profitto", "Risultato",
    "Прибыль", "Доход", "Результат",
    "利润", "盈亏", "盈利"
  ]
};

/** normalised foreign string → canonical English term */
const HEADER_LOOKUP: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [canon, syns] of Object.entries(RAW_TRANSLATIONS)) {
    for (const s of syns) out[n(s)] = canon;
  }
  return out;
})();

/** Translate a single header to its canonical English form, or return
 *  it unchanged if no translation matches. */
export function translateHeader(h: string): string {
  if (h == null) return "";
  const norm = n(String(h));
  return HEADER_LOOKUP[norm] ?? String(h);
}

/** Translate every header in a row. Used to feed the existing
 *  English-only `isMetaTraderHeader` detector with translated input. */
export function translateHeaders(headers: string[]): string[] {
  return headers.map((h) => translateHeader(h));
}

/** Pick the most likely MetaTrader localization given an array of
 *  raw headers. Returns an ISO-639-1 code or "en". */
export function detectMtLanguage(headers: string[]): string {
  const text = headers.map((h) => n(String(h ?? ""))).join(" | ");
  // Quick character-class heuristic: if the headers contain Cyrillic /
  // Han / accented Romance characters we assume the corresponding lang.
  if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
  if (/[а-яё]/i.test(text)) return "ru";
  if (/(beneficio|símbolo|hora|tamaño|comisión)/.test(text)) return "es";
  if (/(lucro|símbolo|tamanho|comissão|abertura|fechamento)/.test(text)) return "pt";
  if (/(gewinn|öffnungs|schließ|größe|kommission)/.test(text)) return "de";
  if (/(bénéfice|résultat|clôture|ouverture)/.test(text)) return "fr";
  if (/(profitto|risultato|apertura|chiusura|commissione)/.test(text)) return "it";
  return "en";
}
