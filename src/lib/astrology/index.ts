// =====================================================================
// GƎNƎSIS Astrology Engine — sun sign deep dive + lunar mechanics.
// Uses analytic moon-phase approximation (Conway / Meeus simplified).
// Accurate to ±0.5 days for civil purposes — perfect for trade journals.
// =====================================================================

import { westernZodiac, type WesternSign } from "@/lib/numerology";

export type Element = "Fire" | "Earth" | "Air" | "Water";
export type Modality = "Cardinal" | "Fixed" | "Mutable";

const ATTRIBUTES: Record<WesternSign, { element: Element; modality: Modality; ruler: string; symbol: string }> = {
  Aries: { element: "Fire", modality: "Cardinal", ruler: "Mars", symbol: "♈" },
  Taurus: { element: "Earth", modality: "Fixed", ruler: "Venus", symbol: "♉" },
  Gemini: { element: "Air", modality: "Mutable", ruler: "Mercury", symbol: "♊" },
  Cancer: { element: "Water", modality: "Cardinal", ruler: "Moon", symbol: "♋" },
  Leo: { element: "Fire", modality: "Fixed", ruler: "Sun", symbol: "♌" },
  Virgo: { element: "Earth", modality: "Mutable", ruler: "Mercury", symbol: "♍" },
  Libra: { element: "Air", modality: "Cardinal", ruler: "Venus", symbol: "♎" },
  Scorpio: { element: "Water", modality: "Fixed", ruler: "Pluto", symbol: "♏" },
  Sagittarius: { element: "Fire", modality: "Mutable", ruler: "Jupiter", symbol: "♐" },
  Capricorn: { element: "Earth", modality: "Cardinal", ruler: "Saturn", symbol: "♑" },
  Aquarius: { element: "Air", modality: "Fixed", ruler: "Uranus", symbol: "♒" },
  Pisces: { element: "Water", modality: "Mutable", ruler: "Neptune", symbol: "♓" }
};

const TRADE_ARCHETYPE: Record<WesternSign, string> = {
  Aries: "Breakout aggressor — best on first-pulse momentum, dangerous in chop.",
  Taurus: "Position holder — patient with edge, reluctant to cut losers.",
  Gemini: "News scalper — thrives on volatility, prone to over-trading.",
  Cancer: "Mean-reversion trader — feels the tape, vulnerable when emotional.",
  Leo: "Conviction trader — large size on A+ setups, ego risk after losses.",
  Virgo: "System builder — backtested, can over-optimize and miss execution.",
  Libra: "Balance trader — good R:R discipline, hesitates on entries.",
  Scorpio: "Predator — high accuracy, must fight revenge-trade impulse.",
  Sagittarius: "Macro thinker — strong thesis trader, weak on stop discipline.",
  Capricorn: "Risk officer — slow but compounding, can be too defensive.",
  Aquarius: "Quant / contrarian — finds edge others miss, prone to outliers.",
  Pisces: "Intuition trader — reads sentiment, vulnerable to FOMO chasing."
};

export type SignProfile = {
  sign: WesternSign;
  element: Element;
  modality: Modality;
  ruler: string;
  symbol: string;
  tradeArchetype: string;
};

export function getSignProfile(dob: string | Date): SignProfile {
  const sign = westernZodiac(dob);
  return { sign, ...ATTRIBUTES[sign], tradeArchetype: TRADE_ARCHETYPE[sign] };
}

// ---------------------------------------------------------------------
// Moon phase
// ---------------------------------------------------------------------
export type MoonPhase =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

const SYNODIC_MONTH = 29.530588853; // days
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0); // 2000-01-06 18:14 UTC

function daysSinceReference(date: Date): number {
  return (date.getTime() - REFERENCE_NEW_MOON) / 86_400_000;
}

/** Returns 0..1 — fraction through the synodic cycle. */
export function moonAge(date: Date = new Date()): number {
  const days = daysSinceReference(date);
  const cycle = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  return cycle / SYNODIC_MONTH;
}

export function moonPhase(date: Date = new Date()): { phase: MoonPhase; age: number; illumination: number; emoji: string } {
  const age = moonAge(date);
  const illumination = (1 - Math.cos(age * 2 * Math.PI)) / 2;

  let phase: MoonPhase;
  let emoji: string;
  if (age < 0.03 || age > 0.97) { phase = "New Moon"; emoji = "🌑"; }
  else if (age < 0.22) { phase = "Waxing Crescent"; emoji = "🌒"; }
  else if (age < 0.28) { phase = "First Quarter"; emoji = "🌓"; }
  else if (age < 0.47) { phase = "Waxing Gibbous"; emoji = "🌔"; }
  else if (age < 0.53) { phase = "Full Moon"; emoji = "🌕"; }
  else if (age < 0.72) { phase = "Waning Gibbous"; emoji = "🌖"; }
  else if (age < 0.78) { phase = "Last Quarter"; emoji = "🌗"; }
  else { phase = "Waning Crescent"; emoji = "🌘"; }

  return { phase, age, illumination, emoji };
}

/** Forecast next 30 days of phases — useful for the lunar widget. */
export function lunarForecast(days = 30, start: Date = new Date()) {
  const out: Array<{ date: string; phase: MoonPhase; illumination: number; emoji: string }> = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const { phase, illumination, emoji } = moonPhase(d);
    out.push({ date: d.toISOString().slice(0, 10), phase, illumination, emoji });
  }
  return out;
}

/** Suggest a "trade posture" for the current moon phase. Folklore-style hints. */
export function moonTradeNote(phase: MoonPhase): string {
  switch (phase) {
    case "New Moon": return "Plant seeds — research, paper trade, set weekly intentions.";
    case "Waxing Crescent": return "Build positions slowly; favor your A+ setups.";
    case "First Quarter": return "Push through resistance — execute planned trades.";
    case "Waxing Gibbous": return "Refine, scale into winners, avoid new theses.";
    case "Full Moon": return "Volatility spike likely — trim size, lock in gains.";
    case "Waning Gibbous": return "Audit your journal; close losing positions.";
    case "Last Quarter": return "Release attachment — cut underperformers.";
    case "Waning Crescent": return "Rest, review, plan the next cycle.";
  }
}

export const ALL_SIGNS: WesternSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];
