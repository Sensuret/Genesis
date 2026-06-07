/** Spoken currency amounts — banking-style (“one million, six hundred… dollars and sixty cents”). */

const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
] as const;

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"] as const;

function under100(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

function under1000(n: number): string {
  if (n < 100) return under100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return r ? `${ONES[h]} hundred ${under100(r)}` : `${ONES[h]} hundred`;
}

function intToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `negative ${intToWords(-n)}`;

  const billion = Math.floor(n / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (billion) parts.push(`${under1000(billion)} billion`);
  if (million) parts.push(`${under1000(million)} million`);
  if (thousand) parts.push(`${under1000(thousand)} thousand`);
  if (rest) parts.push(under1000(rest));

  return parts.join(", ");
}

const CURRENCY_UNITS: Record<string, string> = {
  USD: "US dollars",
  CAD: "Canadian dollars",
  AUD: "Australian dollars",
  EUR: "euros",
  GBP: "British pounds",
  JPY: "Japanese yen",
  KES: "Kenyan shillings",
  ZAR: "South African rand",
  CHF: "Swiss francs",
  NZD: "New Zealand dollars",
  SGD: "Singapore dollars",
  HKD: "Hong Kong dollars",
  INR: "Indian rupees",
  MXN: "Mexican pesos",
  BRL: "Brazilian reais",
  CNY: "Chinese yuan"
};

function currencyUnit(code: string): string {
  const key = code.toUpperCase();
  return CURRENCY_UNITS[key] ?? `${key} units`;
}

/** Matches viral bank-balance announcements (“checking account available balance…”). */
export function balanceAnnouncementText(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const code = currency.toUpperCase();
  const unit = currencyUnit(code);
  const usesCents = code !== "JPY" && code !== "KES";

  let text = "Your checking account available balance is ";
  if (amount < 0) text += "negative ";
  text += intToWords(whole);
  text += ` ${unit}`;
  if (usesCents && cents > 0) text += ` and ${under100(cents)} cents`;
  return text;
}

/** Prefer a clear US/UK female voice similar to automated phone banking. */
export function pickBankingVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const ranked = [
    (v: SpeechSynthesisVoice) => /google.*english.*female/i.test(v.name),
    (v: SpeechSynthesisVoice) => /microsoft.*zira/i.test(v.name),
    (v: SpeechSynthesisVoice) => /samantha/i.test(v.name),
    (v: SpeechSynthesisVoice) => /victoria/i.test(v.name),
    (v: SpeechSynthesisVoice) => /karen/i.test(v.name),
    (v: SpeechSynthesisVoice) => /female/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang === "en-US"
  ];
  for (const test of ranked) {
    const hit = en.find(test);
    if (hit) return hit;
  }
  return en[0] ?? voices[0] ?? null;
}
