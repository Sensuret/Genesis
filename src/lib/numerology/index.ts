// =====================================================================
// GƎNƎSIS Numerology Engine
// Pure, dependency-free TypeScript. All inputs are name + DOB.
// =====================================================================

const PYTHAGOREAN: Record<string, number> = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

const MASTER_NUMBERS = new Set([11, 22, 33]);

/** Reduce a number to a single digit, preserving master numbers (11/22/33). */
export function reduceNumber(n: number): number {
  let value = Math.abs(Math.trunc(n));
  while (value > 9 && !MASTER_NUMBERS.has(value)) {
    value = String(value)
      .split("")
      .reduce((sum, ch) => sum + Number.parseInt(ch, 10), 0);
  }
  return value;
}

function sumLetters(name: string, predicate: (ch: string) => boolean): number {
  const cleaned = name.toLowerCase().replace(/[^a-z]/g, "");
  let total = 0;
  for (const ch of cleaned) {
    if (predicate(ch)) total += PYTHAGOREAN[ch] ?? 0;
  }
  return total;
}

/** Life Path = reduced sum of all DOB digits. */
export function lifePath(dob: string | Date): number {
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const digits = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
  return reduceNumber(digits.split("").reduce((s, c) => s + Number.parseInt(c, 10), 0));
}

/** Destiny / Expression = reduced sum of all letters in full name. */
export function destinyNumber(fullName: string): number {
  return reduceNumber(sumLetters(fullName, () => true));
}

/** Soul Urge = reduced sum of vowels. */
export function soulUrge(fullName: string): number {
  return reduceNumber(sumLetters(fullName, (ch) => VOWELS.has(ch)));
}

/** Personality = reduced sum of consonants. */
export function personality(fullName: string): number {
  return reduceNumber(sumLetters(fullName, (ch) => !VOWELS.has(ch)));
}

/** Birthday Number = reduced day-of-month. */
export function birthdayNumber(dob: string | Date): number {
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  return reduceNumber(d.getUTCDate());
}

/** Personal year — current calendar year cycle. */
export function personalYear(dob: string | Date, year = new Date().getUTCFullYear()): number {
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  return reduceNumber(d.getUTCMonth() + 1 + d.getUTCDate() + year);
}

/** Lucky numbers — small derived set for display. */
export function luckyNumbers(fullName: string, dob: string | Date): number[] {
  const set = new Set<number>([
    lifePath(dob),
    destinyNumber(fullName),
    soulUrge(fullName),
    birthdayNumber(dob),
    personalYear(dob)
  ]);
  return [...set].filter((n) => n > 0).slice(0, 5);
}

// ---------------------------------------------------------------------
// Western Zodiac
// ---------------------------------------------------------------------
export type WesternSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

const WESTERN_TABLE: Array<[number, number, WesternSign]> = [
  [1, 19, "Capricorn"], [2, 18, "Aquarius"], [3, 20, "Pisces"], [4, 19, "Aries"],
  [5, 20, "Taurus"], [6, 20, "Gemini"], [7, 22, "Cancer"], [8, 22, "Leo"],
  [9, 22, "Virgo"], [10, 22, "Libra"], [11, 21, "Scorpio"], [12, 21, "Sagittarius"]
];

export function westernZodiac(dob: string | Date): WesternSign {
  const d = dob instanceof Date ? dob : new Date(dob);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const [, lastDay, sign] = WESTERN_TABLE[m - 1];
  if (day <= lastDay) return sign;
  return WESTERN_TABLE[m % 12][2];
}

// Aspect element + classic enemy sign mapping (compatibility folklore).
const ENEMY: Record<WesternSign, WesternSign> = {
  Aries: "Libra",
  Taurus: "Scorpio",
  Gemini: "Sagittarius",
  Cancer: "Capricorn",
  Leo: "Aquarius",
  Virgo: "Pisces",
  Libra: "Aries",
  Scorpio: "Taurus",
  Sagittarius: "Gemini",
  Capricorn: "Cancer",
  Aquarius: "Leo",
  Pisces: "Virgo"
};

export function enemySign(sign: WesternSign): WesternSign {
  return ENEMY[sign];
}

const ELEMENT: Record<WesternSign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water"
};

export function zodiacElement(sign: WesternSign) {
  return ELEMENT[sign];
}

// ---------------------------------------------------------------------
// Chinese Zodiac
// ---------------------------------------------------------------------
const CHINESE = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
] as const;
export type ChineseSign = (typeof CHINESE)[number];

export function chineseZodiac(dob: string | Date): ChineseSign {
  const d = dob instanceof Date ? dob : new Date(dob);
  // Rough — uses Gregorian year; for true accuracy you'd consult lunar calendar.
  const idx = (d.getUTCFullYear() - 4) % 12;
  return CHINESE[(idx + 12) % 12];
}

const CHINESE_ENEMY: Record<ChineseSign, ChineseSign> = {
  Rat: "Horse",
  Ox: "Goat",
  Tiger: "Monkey",
  Rabbit: "Rooster",
  Dragon: "Dog",
  Snake: "Pig",
  Horse: "Rat",
  Goat: "Ox",
  Monkey: "Tiger",
  Rooster: "Rabbit",
  Dog: "Dragon",
  Pig: "Snake"
};

export function chineseEnemy(sign: ChineseSign): ChineseSign {
  return CHINESE_ENEMY[sign];
}

// ---------------------------------------------------------------------
// Compatibility scoring
// ---------------------------------------------------------------------
export type NumerologySnapshot = {
  fullName: string;
  dob: string;
  lifePath: number;
  destiny: number;
  soulUrge: number;
  personality: number;
  birthday: number;
  personalYear: number;
  lucky: number[];
  western: WesternSign;
  westernElement: ReturnType<typeof zodiacElement>;
  enemyWestern: WesternSign;
  chinese: ChineseSign;
  enemyChinese: ChineseSign;
  currentCycle: { name: string; range: string };
};

export function buildNumerologySnapshot(fullName: string, dob: string): NumerologySnapshot {
  const western = westernZodiac(dob);
  const chinese = chineseZodiac(dob);
  const py = personalYear(dob);
  return {
    fullName,
    dob,
    lifePath: lifePath(dob),
    destiny: destinyNumber(fullName),
    soulUrge: soulUrge(fullName),
    personality: personality(fullName),
    birthday: birthdayNumber(dob),
    personalYear: py,
    lucky: luckyNumbers(fullName, dob),
    western,
    westernElement: zodiacElement(western),
    enemyWestern: enemySign(western),
    chinese,
    enemyChinese: chineseEnemy(chinese),
    currentCycle: { name: cycleNameFromPersonalYear(py), range: cycleRangeForYear() }
  };
}

function cycleNameFromPersonalYear(py: number): string {
  return (
    {
      1: "Genesis — new beginnings",
      2: "Partnerships — patience",
      3: "Expansion — creativity",
      4: "Foundation — discipline",
      5: "Change — freedom",
      6: "Responsibility — service",
      7: "Reflection — mastery",
      8: "Power — abundance",
      9: "Closure — release",
      11: "Illumination",
      22: "Master Builder",
      33: "Master Teacher"
    }[py] ?? "—"
  );
}

function cycleRangeForYear(year = new Date().getUTCFullYear()): string {
  return `Jan – Dec ${year}`;
}

/** Compatibility 0–100. */
export function compatibility(a: NumerologySnapshot, b: NumerologySnapshot) {
  const lp = scoreNumbers(a.lifePath, b.lifePath);
  const dn = scoreNumbers(a.destiny, b.destiny);
  const su = scoreNumbers(a.soulUrge, b.soulUrge);
  const we = scoreElements(a.westernElement, b.westernElement);
  const ch = a.chinese === b.enemyChinese ? 30 : a.chinese === b.chinese ? 70 : 60;
  const enemy = a.western === b.enemyWestern || b.western === a.enemyWestern ? -15 : 0;
  const overall = clamp(Math.round(lp * 0.3 + dn * 0.2 + su * 0.2 + we * 0.15 + ch * 0.15 + enemy));
  return {
    overall,
    breakdown: { lifePath: lp, destiny: dn, soulUrge: su, western: we, chinese: ch },
    notes: enemy < 0 ? ["Classic zodiac opposition — extra friction expected."] : []
  };
}

function scoreNumbers(x: number, y: number): number {
  if (x === 0 || y === 0) return 50;
  if (x === y) return 95;
  const harmony: Record<number, number[]> = {
    1: [1, 5, 7], 2: [2, 4, 8], 3: [3, 6, 9], 4: [2, 4, 8],
    5: [1, 5, 7], 6: [3, 6, 9], 7: [1, 5, 7], 8: [2, 4, 8], 9: [3, 6, 9]
  };
  if (harmony[reduceNumber(x)]?.includes(reduceNumber(y))) return 80;
  return 55;
}

function scoreElements(a: string, b: string): number {
  if (a === b) return 90;
  const compat: Record<string, string[]> = {
    Fire: ["Air"], Air: ["Fire"], Water: ["Earth"], Earth: ["Water"]
  };
  return compat[a]?.includes(b) ? 78 : 45;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------
// Advanced Insights — cities / brands / cars per life path
// ---------------------------------------------------------------------
const INSIGHTS: Record<
  number,
  { useCities: string[]; avoidCities: string[]; useBrands: string[]; avoidBrands: string[]; useCars: string[]; avoidCars: string[] }
> = {
  1: {
    useCities: ["Dubai", "New York", "Singapore"],
    avoidCities: ["Mumbai", "Cairo"],
    useBrands: ["Apple", "Tesla", "Nike"],
    avoidBrands: ["Generic", "Counterfeit luxury"],
    useCars: ["BMW M-Series", "Tesla Model S"],
    avoidCars: ["Bargain leases under stress"]
  },
  2: {
    useCities: ["Paris", "Vienna", "Kyoto"],
    avoidCities: ["Las Vegas", "Bangkok"],
    useBrands: ["Patek Philippe", "Bose"],
    avoidBrands: ["High-pressure MLM brands"],
    useCars: ["Lexus", "Mercedes E-Class"],
    avoidCars: ["Two-seaters as primary"]
  },
  3: {
    useCities: ["Los Angeles", "Rio", "Lagos"],
    avoidCities: ["Pyongyang"],
    useBrands: ["YouTube creators", "Adobe"],
    avoidBrands: ["Closed-platform tools"],
    useCars: ["Mustang", "Range Rover Sport"],
    avoidCars: ["Beige sedans"]
  },
  4: {
    useCities: ["Frankfurt", "Tokyo", "Zurich"],
    avoidCities: ["Vegas", "Ibiza"],
    useBrands: ["IBM", "Toyota", "IKEA"],
    avoidBrands: ["Hype tokens", "Pyramid schemes"],
    useCars: ["Toyota Land Cruiser", "Audi A6"],
    avoidCars: ["Project cars without budget"]
  },
  5: {
    useCities: ["Bali", "Lisbon", "Cape Town"],
    avoidCities: ["Suburban dead zones"],
    useBrands: ["Airbnb", "GoPro"],
    avoidBrands: ["Long lock-in subscriptions"],
    useCars: ["Jeep Wrangler", "Ford Bronco"],
    avoidCars: ["High-payment minivans"]
  },
  6: {
    useCities: ["Florence", "Marrakech"],
    avoidCities: ["Detroit"],
    useBrands: ["Nordstrom", "Chanel"],
    avoidBrands: ["Cheap fast fashion"],
    useCars: ["Volvo XC90", "Genesis G80"],
    avoidCars: ["Sports cars during family chapter"]
  },
  7: {
    useCities: ["Reykjavik", "Boulder", "Edinburgh"],
    avoidCities: ["Crowded mega-cities long-term"],
    useBrands: ["Apple", "Bose", "Patagonia"],
    avoidBrands: ["Loud branded swag"],
    useCars: ["Subaru Outback", "Tesla Model Y"],
    avoidCars: ["Flashy sports cars"]
  },
  8: {
    useCities: ["London", "Hong Kong", "Dubai"],
    avoidCities: ["Frugal-only towns long-term"],
    useBrands: ["Rolex", "Bloomberg"],
    avoidBrands: ["Bargain-bin firms"],
    useCars: ["Bentley", "Mercedes S-Class"],
    avoidCars: ["Penalty-leasing"]
  },
  9: {
    useCities: ["Geneva", "Cape Town", "Mumbai"],
    avoidCities: ["War zones"],
    useBrands: ["TOMS", "Patagonia"],
    avoidBrands: ["Exploitative supply chains"],
    useCars: ["Volvo XC60", "Lexus RX"],
    avoidCars: ["Flashy gas-guzzlers"]
  },
  11: {
    useCities: ["Sedona", "Tulum", "Bali"],
    avoidCities: ["Heavily skeptical hubs"],
    useBrands: ["Apple", "Headspace"],
    avoidBrands: ["Combative cultures"],
    useCars: ["Tesla Model 3", "Lexus ES"],
    avoidCars: ["Aggressive trucks"]
  },
  22: {
    useCities: ["Singapore", "Dubai", "Berlin"],
    avoidCities: ["Procrastination towns"],
    useBrands: ["Caterpillar", "Siemens"],
    avoidBrands: ["Trend-chasing fads"],
    useCars: ["Range Rover", "Tesla Model X"],
    avoidCars: ["Status without utility"]
  },
  33: {
    useCities: ["Kyoto", "Florence", "Vatican City"],
    avoidCities: ["Cynical scenes"],
    useBrands: ["Penguin Books", "Hermès"],
    avoidBrands: ["Quick-flip drop brands"],
    useCars: ["Lexus LS", "Mercedes E-Class"],
    avoidCars: ["Boy-racer kits"]
  }
};

export function advancedInsights(snapshot: NumerologySnapshot) {
  return INSIGHTS[snapshot.lifePath] ?? INSIGHTS[1];
}
