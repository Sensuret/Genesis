/**
 * Chinese zodiac year mapping. The 12-year cycle anchored at 1900 = Rat,
 * so `(year - 1900) mod 12` indexes into the canonical order.
 *
 *   2024 → Dragon · 2025 → Snake · 2026 → Horse · 2027 → Goat · …
 *
 * (We use the *Gregorian* year, not Lunar New Year, for simplicity. Most
 * mass-market "Year of the X" media uses the Gregorian boundary too.)
 */
export const CHINESE_ZODIAC = [
  "Rat",
  "Ox",
  "Tiger",
  "Rabbit",
  "Dragon",
  "Snake",
  "Horse",
  "Goat",
  "Monkey",
  "Rooster",
  "Dog",
  "Pig"
] as const;

export type ChineseZodiac = (typeof CHINESE_ZODIAC)[number];

const ZODIAC_EMOJI: Record<ChineseZodiac, string> = {
  Rat: "🐀",
  Ox: "🐂",
  Tiger: "🐅",
  Rabbit: "🐇",
  Dragon: "🐉",
  Snake: "🐍",
  Horse: "🐎",
  Goat: "🐐",
  Monkey: "🐒",
  Rooster: "🐓",
  Dog: "🐕",
  Pig: "🐖"
};

export function chineseZodiacOf(year: number): ChineseZodiac {
  // JS modulo of negative numbers is signed — guard with a positive offset.
  const idx = (((year - 1900) % 12) + 12) % 12;
  return CHINESE_ZODIAC[idx];
}

export function chineseZodiacEmoji(year: number): string {
  return ZODIAC_EMOJI[chineseZodiacOf(year)];
}
