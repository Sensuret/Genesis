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
// Advanced Insights — cities / brands / cars / jets per life path
// ---------------------------------------------------------------------
//
// Selection logic: cities are chosen so that their (modern) founding /
// charter year reduces to a number that is in the *harmony group* of
// the life path under Pythagorean reduction (1/5/7, 2/4/8, 3/6/9 are
// the classic compatibility triads, with master numbers 11/22/33
// inheriting their root vibrations 2/4/6). Brands / cars / jets are
// chosen on a related principle: numerology of the founding year +
// vibrational alignment with the dominant theme of the life path
// (e.g. 1-paths anchor on pioneering / status, 7-paths on craft and
// solitude, 8-paths on capital and command, 33-paths on stewardship
// and beauty). Items in the avoid lists are intentionally specific —
// real cities / brands / models that consistently misfire against the
// vibration — so the user never has to guess what a vague "etc"
// covered.
//
// Exhaustive enumeration is by design: the "Advanced Insights" tab is
// where the user expects every option, not a curated highlight reel.
const INSIGHTS: Record<
  number,
  {
    useCities: string[];
    avoidCities: string[];
    useBrands: string[];
    avoidBrands: string[];
    useCars: string[];
    avoidCars: string[];
    useJets: string[];
    avoidJets: string[];
  }
> = {
  1: {
    useCities: [
      "Dubai", "New York", "Singapore", "Tokyo", "Shanghai", "Riyadh",
      "Doha", "Abu Dhabi", "Hong Kong", "Seoul", "Astana / Astana-Nur-Sultan",
      "Brasilia", "Canberra", "Washington D.C.", "Las Vegas (visit, not base)"
    ],
    avoidCities: [
      "Mumbai", "Cairo", "Athens", "Rome", "Lima", "Kolkata", "Karachi",
      "Tehran", "Baghdad", "Damascus"
    ],
    useBrands: [
      "Apple", "Tesla", "Nike", "Microsoft", "SpaceX", "Rolex", "Mercedes-Benz",
      "Goldman Sachs", "Bloomberg", "Patek Philippe", "Audemars Piguet", "BMW",
      "Boeing", "Airbus"
    ],
    avoidBrands: [
      "Yeezy / Adidas hype drops", "Shein", "Temu", "Wish", "AliExpress generics",
      "Fashion Nova", "Pretty Little Thing", "Daniel Wellington", "MVMT",
      "Counterfeit luxury (DHGate replicas)"
    ],
    useCars: [
      "BMW M5", "BMW M3", "Tesla Model S Plaid", "Mercedes-AMG GT", "Porsche 911 Turbo S",
      "Lamborghini Urus", "Range Rover Autobiography", "Ferrari Roma", "Aston Martin DB12",
      "Cadillac Escalade ESV"
    ],
    avoidCars: [
      "Nissan Versa", "Mitsubishi Mirage", "Chevrolet Spark", "Fiat Panda",
      "Dacia Sandero", "any sub-prime lease deal", "Hyundai Accent base",
      "Suzuki Alto"
    ],
    useJets: [
      "Gulfstream G700", "Gulfstream G650ER", "Bombardier Global 7500",
      "Dassault Falcon 8X", "Boeing BBJ 737 MAX", "Airbus ACJ319neo"
    ],
    avoidJets: [
      "Cessna Citation Mustang (too small for the energy)",
      "Eclipse 500 / 550", "Honda HA-420 HondaJet (commuter range)",
      "Embraer Phenom 100"
    ]
  },
  2: {
    useCities: [
      "Paris", "Vienna", "Kyoto", "Geneva", "Brussels", "Florence",
      "Stockholm", "Copenhagen", "Amsterdam", "Bruges", "Salzburg", "Lucerne",
      "Quebec City", "Buenos Aires"
    ],
    avoidCities: [
      "Las Vegas", "Bangkok (red-light areas)", "Macau", "Manila",
      "Tijuana", "Atlantic City", "Pattaya", "Dubai's nightlife strips"
    ],
    useBrands: [
      "Patek Philippe", "Bose", "Tiffany & Co.", "Hermès", "Cartier",
      "Sony", "Lexus", "Lindt", "Godiva", "Estée Lauder", "Lancôme",
      "Yves Saint Laurent", "Dior", "Chanel"
    ],
    avoidBrands: [
      "Herbalife", "Amway", "doTERRA", "Young Living", "Forever Living",
      "Mary Kay", "Avon", "any high-pressure MLM", "Affliction clothing",
      "Ed Hardy"
    ],
    useCars: [
      "Lexus LS500", "Mercedes E-Class", "Mercedes S-Class", "BMW 7-Series",
      "Audi A8", "Genesis G90", "Volvo S90", "Bentley Flying Spur",
      "Rolls-Royce Ghost"
    ],
    avoidCars: [
      "Mazda MX-5 Miata as primary", "Smart fortwo", "Fiat 500",
      "MG MGF", "Caterham 7", "Lotus Elise as daily driver"
    ],
    useJets: [
      "Dassault Falcon 7X", "Dassault Falcon 6X", "Gulfstream G500",
      "Bombardier Global 6500", "Embraer Praetor 600"
    ],
    avoidJets: [
      "Eclipse 500", "Cirrus Vision Jet (too solo for the relational 2)",
      "Cessna Citation M2"
    ]
  },
  3: {
    useCities: [
      "Los Angeles", "Rio de Janeiro", "Lagos", "Mumbai", "Mexico City",
      "São Paulo", "Barcelona", "Madrid", "Miami", "Austin", "Nashville",
      "New Orleans", "Marrakech", "Johannesburg", "Accra"
    ],
    avoidCities: [
      "Pyongyang", "Ashgabat", "Minsk", "Tashkent", "Riyadh (creative cap)",
      "Singapore (creative cap)"
    ],
    useBrands: [
      "Adobe", "Apple", "YouTube", "Netflix", "Spotify", "Canva", "Squarespace",
      "Shopify", "Pixar", "Disney", "Warner Music", "Universal Music",
      "Marvel Studios", "Sony Music"
    ],
    avoidBrands: [
      "Oracle internal tooling", "SAP", "Lotus Notes", "BlackBerry",
      "Bloomberg Terminal as primary creative tool", "Wolfram Mathematica (for non-quants)"
    ],
    useCars: [
      "Ford Mustang GT", "Range Rover Sport", "Porsche 911 Cabriolet",
      "Mercedes-AMG SL", "Aston Martin Vantage", "Maserati GranTurismo",
      "Chevrolet Corvette Stingray", "Audi RS5 Cabriolet"
    ],
    avoidCars: [
      "Toyota Camry beige", "Honda Accord LX", "Hyundai Sonata SE",
      "Nissan Sentra S", "Buick LaCrosse", "any rental-fleet beige sedan"
    ],
    useJets: [
      "Bombardier Challenger 350", "Embraer Phenom 300E", "Cessna Citation Latitude",
      "HondaJet Elite II", "Pilatus PC-24"
    ],
    avoidJets: [
      "Boeing BBJ (overkill for creative use)", "Airbus ACJ319 (overkill)",
      "old turboprop King Air on long legs"
    ]
  },
  4: {
    useCities: [
      "Frankfurt", "Tokyo", "Zurich", "Munich", "Stuttgart", "Osaka",
      "Helsinki", "Singapore", "Seoul", "Vienna", "Geneva", "Beijing",
      "Toronto", "Ottawa"
    ],
    avoidCities: [
      "Las Vegas", "Ibiza", "Mykonos", "Phuket party districts",
      "Tulum party scene", "Cancun spring-break strip"
    ],
    useBrands: [
      "IBM", "Toyota", "Honda", "IKEA", "Bosch", "Siemens", "Mitsubishi",
      "Caterpillar", "John Deere", "Hitachi", "Panasonic", "Honeywell",
      "3M", "Raytheon", "Lockheed Martin"
    ],
    avoidBrands: [
      "Bored Ape Yacht Club", "any meme-coin (PEPE / Shiba / Floki)",
      "rug-pulled NFT projects", "Forever 21", "Joe Fresh", "Primark",
      "BitConnect-style yield platforms", "FTX-style derivative platforms"
    ],
    useCars: [
      "Toyota Land Cruiser 300", "Lexus LX600", "Audi A6 Allroad",
      "Volvo XC90", "Mercedes G-Class G550", "BMW X5", "Range Rover SVAutobiography",
      "GMC Yukon Denali"
    ],
    avoidCars: [
      "any 1990s project car", "salvage-title rebuild", "Alfa Romeo 4C as daily",
      "Smart Roadster", "early Range Rover L322 (reliability sinkhole)",
      "Tesla Roadster (legacy) high-mileage"
    ],
    useJets: [
      "Gulfstream G500", "Dassault Falcon 8X", "Bombardier Global 5500",
      "Embraer Praetor 500", "Cessna Citation Longitude"
    ],
    avoidJets: [
      "Eclipse 500 (out-of-production support gap)",
      "Cirrus Vision Jet (single-engine for a 4 is too risk-on)",
      "old Hawker 700 on long legs"
    ]
  },
  5: {
    useCities: [
      "Bali", "Lisbon", "Cape Town", "Mexico City", "Tulum", "Marrakech",
      "Bangkok", "Ho Chi Minh City", "Medellín", "Tbilisi", "Istanbul",
      "Buenos Aires", "Rio de Janeiro", "Tel Aviv", "Berlin"
    ],
    avoidCities: [
      "Pyongyang", "Riyadh long-term", "Tehran long-term", "Doha long-term",
      "any HOA suburb in middle America"
    ],
    useBrands: [
      "Airbnb", "GoPro", "Yeti", "Patagonia", "REI", "Garmin", "DJI",
      "Apple", "Wise", "Revolut", "Skyscanner", "Booking.com", "Tesla",
      "Land Rover"
    ],
    avoidBrands: [
      "Comcast / Xfinity contracts", "AT&T 24-month locks", "Verizon Fios bundles",
      "Sprint legacy plans", "Bally Total Fitness 3-year gyms",
      "ClubCorp lifetime memberships"
    ],
    useCars: [
      "Jeep Wrangler Rubicon", "Ford Bronco Wildtrak", "Toyota 4Runner TRD Pro",
      "Land Rover Defender 110", "Porsche 911 Dakar", "Lexus GX", "Subaru Outback Wilderness",
      "Mercedes G-Class"
    ],
    avoidCars: [
      "Chrysler Pacifica", "Honda Odyssey", "Toyota Sienna",
      "Kia Carnival", "Dodge Grand Caravan", "any 8-year minivan loan"
    ],
    useJets: [
      "Pilatus PC-24", "Embraer Phenom 300E", "Cessna Citation CJ4 Gen2",
      "HondaJet Elite II", "Bombardier Challenger 350"
    ],
    avoidJets: [
      "Boeing BBJ (over-committed for nomad lifestyle)",
      "Airbus ACJ319 (over-committed)", "fractional Eclipse shares"
    ]
  },
  6: {
    useCities: [
      "Florence", "Marrakech", "Kyoto", "Vienna", "Salzburg", "Bath",
      "Edinburgh", "Charleston", "Savannah", "Cartagena", "Antigua Guatemala",
      "Aix-en-Provence", "Provence villages", "Tuscany hill towns"
    ],
    avoidCities: [
      "Detroit (rust-belt patch areas)", "Gary IN", "Camden NJ",
      "Stockton CA", "any war-torn city"
    ],
    useBrands: [
      "Nordstrom", "Chanel", "Hermès", "Williams Sonoma", "Pottery Barn",
      "Restoration Hardware", "Diptyque", "Aesop", "Le Labo", "Bose",
      "Sonos", "Tiffany & Co.", "John Lewis", "Selfridges"
    ],
    avoidBrands: [
      "Shein", "Temu", "Wish", "Boohoo", "Pretty Little Thing",
      "Forever 21", "fast-fashion drop-ship sites", "Romwe"
    ],
    useCars: [
      "Volvo XC90 Recharge", "Genesis G80", "Genesis G90",
      "Mercedes E-Class All-Terrain", "Lexus RX 450h+", "Audi Q7",
      "Range Rover Velar"
    ],
    avoidCars: [
      "Dodge Charger Hellcat (during family chapter)", "Nissan GT-R as family car",
      "Subaru WRX STI as family car", "Mitsubishi Lancer Evo X (family stage)"
    ],
    useJets: [
      "Dassault Falcon 6X", "Gulfstream G280", "Embraer Praetor 600",
      "Bombardier Challenger 3500"
    ],
    avoidJets: [
      "Eclipse 500", "Cirrus Vision Jet (too solo for family 6)",
      "old Citation II"
    ]
  },
  7: {
    useCities: [
      "Reykjavik", "Boulder", "Edinburgh", "Kyoto", "Bhutan / Thimphu",
      "Wellington", "Hobart", "Bergen", "Tromsø", "Banff",
      "Queenstown", "Salzburg", "Lhasa", "Ubud", "Sedona"
    ],
    avoidCities: [
      "Mumbai long-term", "Lagos long-term", "Manila long-term",
      "Cairo long-term", "Karachi long-term", "any 20M+ megacity for full-time base"
    ],
    useBrands: [
      "Apple", "Bose", "Patagonia", "Arc'teryx", "Filson", "Leatherman",
      "Kindle / Amazon", "Rolex Explorer line", "Omega Speedmaster",
      "Bang & Olufsen", "Leica", "Hasselblad", "Moleskine"
    ],
    avoidBrands: [
      "Supreme box-logo drops", "Off-White hype", "Yeezy hype",
      "Gucci logo-print", "loud logo Louis Vuitton monogram",
      "loud Versace baroque print"
    ],
    useCars: [
      "Subaru Outback Wilderness", "Tesla Model Y Long Range",
      "Lexus RX450h+", "Volvo XC60 Recharge", "Toyota Land Cruiser",
      "Range Rover Defender 90"
    ],
    avoidCars: [
      "Lamborghini Huracán", "Ferrari 488 / F8", "McLaren 720S",
      "Bentley Continental GT (too loud)", "Rolls-Royce Wraith",
      "Audi R8"
    ],
    useJets: [
      "Pilatus PC-24", "Daher TBM 960 (turboprop)",
      "Embraer Phenom 300E", "HondaJet Elite II"
    ],
    avoidJets: [
      "Boeing BBJ", "Airbus ACJ", "Gulfstream G700 (too loud for 7's energy)",
      "any flag-painted private jet"
    ]
  },
  8: {
    useCities: [
      "London", "Hong Kong", "Dubai", "New York", "Singapore",
      "Zurich", "Geneva", "Frankfurt", "Tokyo", "Shanghai",
      "Riyadh", "Abu Dhabi", "Doha", "Monaco", "Luxembourg City"
    ],
    avoidCities: [
      "any town with no luxury banking footprint",
      "remote rural posts > 6 months/year",
      "Rust-belt towns post-industrial decline (Gary, Flint, etc.)"
    ],
    useBrands: [
      "Rolex", "Patek Philippe", "Audemars Piguet", "Vacheron Constantin",
      "Bloomberg Terminal", "Goldman Sachs", "JPMorgan Private Bank",
      "Coutts & Co.", "Brunello Cucinelli", "Kiton", "Brioni",
      "Bentley", "Rolls-Royce", "Ferrari"
    ],
    avoidBrands: [
      "Costco Kirkland Signature watches", "Movado Bold", "Fossil watches",
      "Walmart financial services", "PayPal as primary banking",
      "Cash App for high-value flows"
    ],
    useCars: [
      "Bentley Flying Spur Mulliner", "Mercedes-Maybach S680",
      "Rolls-Royce Ghost Extended", "Rolls-Royce Cullinan",
      "BMW M760e xDrive", "Audi A8L Long-wheelbase", "Genesis G90 LWB"
    ],
    avoidCars: [
      "any sub-prime lease", "Buy-Here-Pay-Here lot vehicles",
      "salvage-title rebuilds", "75-month negative-equity loans",
      "vehicles where the warranty is the value prop"
    ],
    useJets: [
      "Gulfstream G700", "Gulfstream G650ER", "Bombardier Global 7500",
      "Boeing BBJ MAX 7", "Airbus ACJ TwoTwenty", "Embraer Lineage 1000E"
    ],
    avoidJets: [
      "Cessna Citation Mustang (too small)", "Honda HA-420 (commuter)",
      "Eclipse 500", "Phenom 100 EV"
    ]
  },
  9: {
    useCities: [
      "Geneva", "Cape Town", "Mumbai", "New Delhi", "Kathmandu",
      "Jerusalem", "Athens", "Cairo (cultural)", "Istanbul",
      "Marrakech", "Vatican City", "Varanasi", "Kyoto", "Buenos Aires"
    ],
    avoidCities: [
      "Active war zones (Donetsk, Khartoum, Gaza, etc.)",
      "Ashgabat", "Pyongyang", "Asmara", "Mogadishu",
      "any city under active sanctions"
    ],
    useBrands: [
      "TOMS", "Patagonia", "Bombas", "Allbirds", "Warby Parker",
      "Charity: Water partnerships", "Médecins Sans Frontières partners",
      "Tony's Chocolonely", "Lush", "Eileen Fisher",
      "Stella McCartney", "Veja"
    ],
    avoidBrands: [
      "Nestlé infant-formula lines", "Shein", "Boohoo / Pretty Little Thing",
      "any brand on a current human-rights blocklist",
      "fast-food chains with documented exploitation cases"
    ],
    useCars: [
      "Volvo XC60 Recharge", "Lexus RX 450h+", "Tesla Model Y",
      "Toyota Prius Prime", "Honda CR-V Hybrid", "Polestar 3",
      "Genesis Electrified GV70"
    ],
    avoidCars: [
      "Hummer H1", "Hummer H2", "Cadillac Escalade ESV (V8)",
      "Dodge Ram TRX", "Bentley Mulsanne Speed", "any rolling-coal diesel build"
    ],
    useJets: [
      "Pilatus PC-24 (efficient mid-size)", "Embraer Phenom 300E (SAF-ready)",
      "HondaJet Elite II", "Cessna Citation CJ4 Gen2"
    ],
    avoidJets: [
      "Boeing BBJ (carbon profile)", "Airbus ACJ (carbon profile)",
      "Gulfstream G700 (carbon profile vs 9's mission)"
    ]
  },
  11: {
    useCities: [
      "Sedona", "Tulum", "Bali / Ubud", "Glastonbury", "Mount Shasta",
      "Reykjavik", "Kyoto", "Lhasa", "Varanasi", "Rishikesh",
      "Cusco / Sacred Valley", "Big Sur", "Oaxaca", "Auroville"
    ],
    avoidCities: [
      "Las Vegas Strip", "Atlantic City", "Macau",
      "high-cynicism financial-only cities for full-time base",
      "Wall Street's immediate radius long-term"
    ],
    useBrands: [
      "Apple", "Headspace", "Calm", "Insight Timer", "Lululemon",
      "Manduka", "Alo Yoga", "Kindle", "Moleskine", "Filson",
      "Patagonia", "Aesop"
    ],
    avoidBrands: [
      "Red Bull (overstimulant for 11s)", "Monster Energy",
      "loud combative sports brands", "any 24-hour cable-news brand as identity",
      "high-pressure sales cult brands"
    ],
    useCars: [
      "Tesla Model 3 Long Range", "Lexus ES 300h", "Volvo S60 Recharge",
      "Polestar 2", "Genesis G70", "Toyota Camry XSE Hybrid"
    ],
    avoidCars: [
      "Dodge Ram TRX", "Ford F-150 Raptor R", "GMC Hummer EV (too aggressive)",
      "Dodge Charger SRT Hellcat Redeye", "Cadillac Escalade-V"
    ],
    useJets: [
      "Pilatus PC-24", "HondaJet Elite II", "Embraer Phenom 300E",
      "Cirrus Vision Jet G2+ (with co-pilot)"
    ],
    avoidJets: [
      "Boeing BBJ", "Airbus ACJ319",
      "any tail-painted high-attention private jet — 11s do better invisible"
    ],
  },
  22: {
    useCities: [
      "Singapore", "Dubai", "Berlin", "Tokyo", "Seoul", "Shenzhen",
      "Shanghai", "Helsinki", "Stockholm", "Tel Aviv", "Boston",
      "Austin", "Toronto", "Vienna"
    ],
    avoidCities: [
      "Vegas-style boom towns long-term",
      "high-corruption-index capitals (Caracas, Pyongyang, etc.)",
      "ghost-city megaprojects with no real population"
    ],
    useBrands: [
      "Caterpillar", "Siemens", "Mitsubishi Heavy Industries", "ABB",
      "Honeywell", "Emerson Electric", "John Deere", "Bosch",
      "Schneider Electric", "Boeing", "Airbus", "BAE Systems",
      "Northrop Grumman", "Bechtel", "Fluor"
    ],
    avoidBrands: [
      "Theranos-style fraud-prone startups",
      "WeWork-style growth-without-fundamentals plays",
      "rug-pull NFT projects", "BitConnect", "FTX-pattern exchanges",
      "drop-ship trend brands"
    ],
    useCars: [
      "Range Rover SVAutobiography", "Tesla Model X Plaid",
      "Mercedes G63 AMG", "Audi RS Q8", "BMW X7 M60i",
      "Cadillac Escalade-V", "Rivian R1S Tri-Motor"
    ],
    avoidCars: [
      "any brand new untested EV without service network",
      "first-year production exotic cars (high failure rate)",
      "Smart fortwo as primary"
    ],
    useJets: [
      "Gulfstream G700", "Gulfstream G650ER", "Bombardier Global 7500",
      "Boeing BBJ MAX 7", "Dassault Falcon 8X"
    ],
    avoidJets: [
      "Cessna Citation Mustang", "Honda HA-420 HondaJet (commuter range)",
      "Eclipse 500"
    ]
  },
  33: {
    useCities: [
      "Kyoto", "Florence", "Vatican City", "Jerusalem", "Varanasi",
      "Mecca / Medina (faith-context)", "Lhasa", "Mount Athos",
      "Assisi", "Lourdes", "Geneva", "Vienna", "Salzburg"
    ],
    avoidCities: [
      "Las Vegas Strip", "Atlantic City", "Reno",
      "high-influencer party hubs (full-time)",
      "scenes where cynicism is the default register"
    ],
    useBrands: [
      "Penguin Books", "Hermès", "Loro Piana", "Brunello Cucinelli",
      "Steinway & Sons", "Bösendorfer", "Bang & Olufsen",
      "Baccarat", "Lalique", "Christofle", "Mont Blanc", "Tiffany & Co.",
      "Patek Philippe"
    ],
    avoidBrands: [
      "Supreme drops", "Off-White hype", "Yeezy hype",
      "OnlyFans-style attention-economy stacks",
      "MLM cosmetics", "BoredApe-tier flip-driven NFT projects"
    ],
    useCars: [
      "Lexus LS500h", "Mercedes E-Class All-Terrain",
      "Range Rover Autobiography (calm spec)", "Genesis G90 LWB",
      "Bentley Bentayga EWB"
    ],
    avoidCars: [
      "Boy-racer kit cars", "loud aftermarket exhaust builds",
      "Lamborghini Aventador SVJ", "McLaren 750S", "Dodge Charger Demon 170"
    ],
    useJets: [
      "Dassault Falcon 8X (quiet cabin)",
      "Gulfstream G500 (refined spec)",
      "Bombardier Global 6500"
    ],
    avoidJets: [
      "vinyl-wrap loud-livery jets",
      "Boeing BBJ with maximalist interior fit-out"
    ]
  }
};

export function advancedInsights(snapshot: NumerologySnapshot) {
  return INSIGHTS[snapshot.lifePath] ?? INSIGHTS[1];
}

// ---------------------------------------------------------------------
// Chinese Year Cycle
// ---------------------------------------------------------------------
const CHINESE_EMOJI: Record<ChineseSign, string> = {
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

/** Chinese zodiac for a calendar year (Gregorian-approx; same logic as the per-DOB function). */
export function chineseZodiacForYear(year: number = new Date().getUTCFullYear()): ChineseSign {
  const idx = (year - 4) % 12;
  return CHINESE[(idx + 12) % 12];
}

export function chineseEmoji(sign: ChineseSign): string {
  return CHINESE_EMOJI[sign];
}

export const CHINESE_TRINE: Record<ChineseSign, ChineseSign[]> = {
  Rat: ["Dragon", "Monkey"],
  Ox: ["Snake", "Rooster"],
  Tiger: ["Horse", "Dog"],
  Rabbit: ["Goat", "Pig"],
  Dragon: ["Rat", "Monkey"],
  Snake: ["Ox", "Rooster"],
  Horse: ["Tiger", "Dog"],
  Goat: ["Rabbit", "Pig"],
  Monkey: ["Rat", "Dragon"],
  Rooster: ["Ox", "Snake"],
  Dog: ["Tiger", "Horse"],
  Pig: ["Rabbit", "Goat"]
};

export type YearCycleOutlook = "great" | "good" | "average" | "tough" | "challenging";

/**
 * Pulls the per-sign outlook for a given year of the Chinese cycle.
 * Loosely derived from compatibility-trine logic plus enemy axis.
 */
export function yearOutlookFor(personalSign: ChineseSign, yearSign: ChineseSign): YearCycleOutlook {
  if (CHINESE_ENEMY[personalSign] === yearSign) return "challenging";
  if (personalSign === yearSign) return "good";
  if (CHINESE_TRINE[personalSign]?.includes(yearSign)) return "great";
  if (CHINESE_TRINE[CHINESE_ENEMY[personalSign]]?.includes(yearSign)) return "tough";
  return "average";
}

/**
 * Human-readable reason for the outlook — explains the trine / enemy /
 * indirect-clash logic so the rating doesn't look arbitrary. Used on the
 * Year Cycle page next to each sign's outlook chip.
 */
export function yearOutlookReason(personalSign: ChineseSign, yearSign: ChineseSign): string {
  if (CHINESE_ENEMY[personalSign] === yearSign) {
    return `${yearSign} sits opposite ${personalSign} on the 12-year wheel — direct clash year. Expect resistance, big lessons, slower compounding.`;
  }
  if (personalSign === yearSign) {
    return `Your own year (Ben Ming Nian). Energy mirrors you — the spotlight is on, but so are your own shadows. Run leaner, stay disciplined.`;
  }
  if (CHINESE_TRINE[personalSign]?.includes(yearSign)) {
    return `${yearSign} sits in your trine triangle (${[personalSign, ...CHINESE_TRINE[personalSign]].join(" – ")}). Energies cooperate — alliances, momentum and lucky breaks all amplified.`;
  }
  if (CHINESE_TRINE[CHINESE_ENEMY[personalSign]]?.includes(yearSign)) {
    const enemy = CHINESE_ENEMY[personalSign];
    return `${yearSign} is in the trine of your opposing sign (${enemy}). The year's energy backs your opposition rather than you — friendlier than a direct clash, but expect indirect headwinds.`;
  }
  return `Neutral relationship between ${personalSign} and ${yearSign}. Average year — you make it whatever you put in.`;
}

// ---------------------------------------------------------------------
// Personal Year (1–9) cycle — numerology, distinct from the 12-year
// Chinese animal cycle. Each calendar year you sit on a different
// number from 1 to 9, then the cycle repeats.
// ---------------------------------------------------------------------
export type PersonalYearTheme = {
  number: number;
  title: string;
  vibration: string;
  focus: string;
  trade: string;
  caution: string;
};

const PERSONAL_YEAR_THEMES: Record<number, PersonalYearTheme> = {
  1: {
    number: 1,
    title: "New Beginnings",
    vibration: "New beginnings, action, independence, planting seeds — Genesis of the next 9-year arc.",
    focus: "Start things, take initiative, don't be afraid to begin again.",
    trade: "Open new accounts, try new strategies, pioneer setups — but small size while you learn.",
    caution: "Impatience. Don't burn capital trying to force the year to peak too early."
  },
  2: {
    number: 2,
    title: "Patience & Partnership",
    vibration: "Patience, partnerships, emotions, slow growth — quiet progress over the spotlight.",
    focus: "Strengthen alliances, find a mentor, refine — don't push for the spotlight.",
    trade: "Pair-trades, mentorship rooms, joint ventures. Volume modest, edge sharp.",
    caution: "Sensitivity overload — protect your nervous system from market noise."
  },
  3: {
    number: 3,
    title: "Expansion & Expression",
    vibration: "Communication, creativity, visibility, expression — your voice carries this year.",
    focus: "Share your edge — content, journaling, voice notes, recap videos.",
    trade: "Multiple themes okay; let curiosity drive research, then narrow.",
    caution: "Distraction. Cap shots-per-day so creativity doesn't become over-trading."
  },
  4: {
    number: 4,
    title: "Foundation & Discipline",
    vibration: "Structure, discipline, foundations, hard work — boring becomes beautiful.",
    focus: "Systems, rules, backtests, journaling, infrastructure.",
    trade: "Best year for rule-based execution — automate or write checklists.",
    caution: "Rigidity — don't refuse to adapt to a new regime when data says so."
  },
  5: {
    number: 5,
    title: "Change & Freedom",
    vibration: "Change, freedom, movement, unpredictability — adaptability is the edge.",
    focus: "Expand horizons, change environments, explore new asset classes.",
    trade: "News-driven and momentum trades fit; size up around catalysts.",
    caution: "Restlessness. Anchor with a daily ritual or you'll over-trade."
  },
  6: {
    number: 6,
    title: "Responsibility & Service",
    vibration: "Home, family, love, responsibility — your circle gets prioritised.",
    focus: "Give back — teach, mentor, support, and tighten home/work life.",
    trade: "Stable, low-volatility plays; treat capital as something you steward.",
    caution: "Over-helping. Protect your own capital before saving someone else's."
  },
  7: {
    number: 7,
    title: "Reflection & Mastery",
    vibration: "Reflection, study, inner work, solitude — depth over breadth.",
    focus: "Research, reading, retreat — let inner work compound.",
    trade: "Quant, pattern research, backtests. A great year to specialise.",
    caution: "Paralysis-by-analysis. Set a 'good enough' shipping bar so trades still ship."
  },
  8: {
    number: 8,
    title: "Power & Abundance",
    vibration: "Money, power, career results, authority — the harvest year.",
    focus: "Push for breakthroughs in income and reputation. Money flows now.",
    trade: "Scale prop firm passes, take bigger A+ setups, build the funnel.",
    caution: "Greed. Define your stop-out and walk-away rule before you start."
  },
  9: {
    number: 9,
    title: "Closure & Release",
    vibration: "Endings, release, completion, forgiveness — close chapters and forgive.",
    focus: "Finish chapters. Prune accounts, retire bad habits, redistribute gains.",
    trade: "Cut losing strategies, harvest gains, journal what worked over the 9 years.",
    caution: "Holding losers for the story. Cut sharper — the year wants endings."
  },
  11: {
    number: 11,
    title: "Illumination (master)",
    vibration: "11/2 — heightened emotions, intuition, relationship tests; trust early signals.",
    focus: "Macro patterns, themes that span months. Inspire and lead.",
    trade: "Trend-following, theme bets, narrative-driven plays.",
    caution: "Nervous-system overload. Ground daily — breathwork before market open."
  },
  22: {
    number: 22,
    title: "Master Builder",
    vibration: "22/4 — heavy responsibility, building something big, pressure to achieve.",
    focus: "Funds, multi-account scaling, infrastructure, hiring.",
    trade: "Build systems for size; institutional discipline.",
    caution: "Scope creep. Partition the year into 90-day milestones."
  },
  33: {
    number: 33,
    title: "Master Teacher",
    vibration: "33/6 — deep care for others, service, family / community focus.",
    focus: "Teach the system; your portfolio benefits from articulation.",
    trade: "Educational content alongside trading; mentorship at scale.",
    caution: "Burnout from helping others. Protect deep-work blocks."
  }
};

/** Look up a Personal Year theme by reduced number (1–9 plus master 11/22/33). */
export function personalYearTheme(py: number): PersonalYearTheme {
  return PERSONAL_YEAR_THEMES[py] ?? PERSONAL_YEAR_THEMES[1];
}

/** All 9 themes (no masters) — used to render the full 1–9 cycle wheel. */
export const PERSONAL_YEAR_CYCLE: PersonalYearTheme[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
  (n) => PERSONAL_YEAR_THEMES[n]
);

const CHINESE_PERSONALITY: Record<ChineseSign, string> = {
  Rat: "Resourceful, fast learner, social opportunist; thrives in info-rich markets.",
  Ox: "Patient, methodical, dependable; loves a system, hates impulsive size.",
  Tiger: "Bold, charismatic, competitive; runs fast — guard against revenge trades.",
  Rabbit: "Diplomatic, intuitive, cautious; reads room flow before sizing in.",
  Dragon: "Magnetic, ambitious, lucky; needs scale and a real edge to focus.",
  Snake: "Wise, calculating, private; deep research types who size on conviction.",
  Horse: "Energetic, free-spirited, swing-trader energy; trim positions early.",
  Goat: "Empathic, artistic, gentle; struggles with discipline under fire.",
  Monkey: "Inventive, witty, agile; great at adapting strategies on the fly.",
  Rooster: "Detail-obsessed, punctual, candid; loves checklists and journals.",
  Dog: "Loyal, principled, defensive; protects capital first, returns second.",
  Pig: "Generous, indulgent, lucky; risk of over-sharing tips and over-sizing."
};

export function chinesePersonalityNote(sign: ChineseSign): string {
  return CHINESE_PERSONALITY[sign];
}

// ---------------------------------------------------------------------
// Number frequencies / vibrations 1–9 (+ master 11/22/33)
// ---------------------------------------------------------------------
export type NumberVibration = {
  number: number;
  title: string;
  vibration: string;
  use: string;
  caution: string;
};

export const NUMBER_VIBRATIONS: NumberVibration[] = [
  {
    number: 1,
    title: "The Pioneer",
    vibration: "Initiative, leadership, originality.",
    use: "Front-load the day with the riskiest decision; you have natural authority.",
    caution: "Lone-wolf trap — verify with one outside opinion before sizing up."
  },
  {
    number: 2,
    title: "The Diplomat",
    vibration: "Partnership, sensitivity, balance.",
    use: "Pair-trades and group strategy reviews amplify your edge.",
    caution: "Avoid emotional revenge fills; you absorb others' moods."
  },
  {
    number: 3,
    title: "The Communicator",
    vibration: "Expression, joy, social charm.",
    use: "Journaling and recap videos compound your insights.",
    caution: "Distraction-prone; turn off chats during execution windows."
  },
  {
    number: 4,
    title: "The Builder",
    vibration: "Discipline, structure, patience.",
    use: "Backtests and rule-based systems play to your strengths.",
    caution: "Rigidity — schedule time to update rules to new regimes."
  },
  {
    number: 5,
    title: "The Adventurer",
    vibration: "Change, freedom, sensory intelligence.",
    use: "News-driven and momentum strategies feel native.",
    caution: "Over-trading; cap shots-per-day to enforce filtering."
  },
  {
    number: 6,
    title: "The Caretaker",
    vibration: "Responsibility, harmony, service.",
    use: "Mentor-led trading rooms; teaching cements your edge.",
    caution: "Over-helping — protect capital before saving someone else's."
  },
  {
    number: 7,
    title: "The Mystic",
    vibration: "Analysis, depth, intuition.",
    use: "Quant work, pattern research, solitude before entries.",
    caution: "Paralysis-by-analysis; set a 'good enough' shipping bar."
  },
  {
    number: 8,
    title: "The Executive",
    vibration: "Power, abundance, manifestation.",
    use: "Scaling, prop firms, business builds — your octave is wealth-flow.",
    caution: "Greed cycle — define a stop-out and walk away rule."
  },
  {
    number: 9,
    title: "The Sage",
    vibration: "Completion, compassion, release.",
    use: "Closing chapters: prune accounts, retire bad habits, redistribute gains.",
    caution: "Holding losers too long for the story; cut sharper."
  },
  {
    number: 11,
    title: "The Visionary (master)",
    vibration: "Illumination, inspiration, intuition x10.",
    use: "Macro pattern reading, themes that span months — trust early signals.",
    caution: "Nervous system overload; ground with breathwork before market open."
  },
  {
    number: 22,
    title: "The Master Builder",
    vibration: "Large-scale construction; turning vision into structure.",
    use: "Funds, multi-account scaling, infrastructure plays.",
    caution: "Scope creep — partition into 90-day milestones."
  },
  {
    number: 33,
    title: "The Master Teacher",
    vibration: "Service through wisdom — trade as a curriculum.",
    use: "Teach the system; your portfolio benefits from articulation.",
    caution: "Burning out helping others; protect deep-work blocks."
  }
];

// ---------------------------------------------------------------------
// Female cycle helper (lunar approximation)
// ---------------------------------------------------------------------
/**
 * Approximate cycle phase from a "last period start" date and average
 * cycle length. Genesis uses this purely as a self-reflection cue —
 * not medical advice. Phases align with the typical 28-day model.
 */
export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";
export type CycleReading = {
  phase: CyclePhase;
  dayInCycle: number;
  cycleLength: number;
  trade: string;
  energy: string;
};

export function femaleCycleReading(
  lastPeriodIso: string,
  cycleLength = 28,
  now: Date = new Date()
): CycleReading | null {
  const start = new Date(lastPeriodIso);
  if (Number.isNaN(start.getTime())) return null;
  const cl = Math.max(20, Math.min(40, cycleLength));
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const day = ((diffDays % cl) + cl) % cl + 1; // 1..cl
  let phase: CyclePhase = "follicular";
  if (day <= 5) phase = "menstrual";
  else if (day <= 13) phase = "follicular";
  else if (day <= 16) phase = "ovulation";
  else phase = "luteal";

  const tradeNotes: Record<CyclePhase, string> = {
    menstrual: "Lower size, prefer review days, journal heavily — your edge is reflective.",
    follicular: "Risk-on phase; explore new setups and re-test backtests with curiosity.",
    ovulation: "Peak presence and pattern recognition; great window for high-conviction A+ setups.",
    luteal: "Slow execution down; tighten stops, avoid revenge trades, end day earlier."
  };
  const energyNotes: Record<CyclePhase, string> = {
    menstrual: "Inward, restorative.",
    follicular: "Outward, building, social.",
    ovulation: "Magnetic, radiant, connective.",
    luteal: "Critical, refining, more inward day-by-day."
  };

  return {
    phase,
    dayInCycle: day,
    cycleLength: cl,
    trade: tradeNotes[phase],
    energy: energyNotes[phase]
  };
}

// ---------------------------------------------------------------------
// Laws of the Universe + Maritime Laws (general-purpose, not trading-
// specific). Used in Numerology → Laws tab as a reference reading.
// ---------------------------------------------------------------------
export type LawEntry = {
  name: string;
  oneLiner: string;
  meaning: string;
  use: string;
};

export const UNIVERSAL_LAWS: LawEntry[] = [
  {
    name: "Law of Divine Oneness",
    oneLiner: "Everything is connected.",
    meaning:
      "Every thought, word, action and reaction is woven into the same fabric. Your inner state ripples outward — others, markets, environment all respond.",
    use: "Before any big decision, check the inner state first. A clean inner = clean outer outcomes."
  },
  {
    name: "Law of Vibration",
    oneLiner: "Everything moves and vibrates.",
    meaning:
      "All matter and thought has a frequency. You attract people, opportunities and outcomes that match your dominant vibration.",
    use: "Track your daily 'state' the way you track P&L. Raise it deliberately (movement, music, gratitude, sleep)."
  },
  {
    name: "Law of Correspondence",
    oneLiner: "As above, so below. As within, so without.",
    meaning:
      "The patterns in your inner world mirror the patterns in your outer world. If chaos is showing up outside, look inside.",
    use: "When the day spirals (revenge trades, conflict at home), pause and audit the internal pattern instead of fighting the external."
  },
  {
    name: "Law of Attraction",
    oneLiner: "Like attracts like.",
    meaning:
      "Energy of a similar frequency clusters. What you focus on, you amplify. Worry attracts more reasons to worry; gratitude attracts more reasons to be grateful.",
    use: "Curate your inputs ruthlessly — feeds, conversations, accounts you follow. They set your default frequency."
  },
  {
    name: "Law of Inspired Action",
    oneLiner: "Vision without action is hallucination.",
    meaning:
      "Manifestation requires aligned movement. The Universe meets you halfway, but only after you take the first concrete step.",
    use: "Translate every goal into the smallest next physical action you can take today. Ship the smallest unit."
  },
  {
    name: "Law of Perpetual Transmutation of Energy",
    oneLiner: "Energy moves into form and back again.",
    meaning:
      "Higher vibrations dissolve and transform lower ones. You can convert fear into focus, anger into action, grief into wisdom.",
    use: "Never suppress an emotion — channel it into productive movement (training, journaling, building, walking)."
  },
  {
    name: "Law of Cause and Effect",
    oneLiner: "Every cause has an effect; every effect has a cause.",
    meaning:
      "Karma in plain English. The seeds you plant — habits, thoughts, words, behaviour — determine the harvest. Nothing is random.",
    use: "Audit causes weekly: which inputs produced which outputs? Plant differently if you want different fruit."
  },
  {
    name: "Law of Compensation",
    oneLiner: "You are paid in proportion to the value you bring.",
    meaning:
      "Reward follows contribution. Money, opportunities, friendships — all compensation for the value you've already given.",
    use: "Stop asking 'how do I earn more?' and start asking 'how do I serve more deeply?' The money is downstream."
  },
  {
    name: "Law of Relativity",
    oneLiner: "Nothing is good or bad until compared.",
    meaning:
      "Every situation is neutral until your mind assigns meaning. Your problem looks different next to someone else's; your win does too.",
    use: "When stuck, zoom out. Compare your hardest day to someone else's hardest year. Perspective resets the nervous system."
  },
  {
    name: "Law of Polarity",
    oneLiner: "Everything has an opposite.",
    meaning:
      "Hot ↔ cold, love ↔ fear, win ↔ loss. The two ends are the same scale. You can dial up the opposite instead of fighting the current state.",
    use: "Stuck in fear? Don't fight it — turn the dial toward courage. Same axis, different end."
  },
  {
    name: "Law of Rhythm",
    oneLiner: "Everything moves in cycles.",
    meaning:
      "Markets, moods, seasons, relationships — nothing is linear. Highs are followed by lows; lows are followed by highs.",
    use: "Trade smaller in your low cycles. Press in the high ones. Stop expecting linear progress."
  },
  {
    name: "Law of Gender",
    oneLiner: "Masculine and feminine energies exist in everything.",
    meaning:
      "Action / receptivity, strategy / intuition, structure / flow. Both are required to create — neither alone is enough.",
    use: "Match the energy to the task — strategy work needs masculine; insight work needs feminine. Balance both daily."
  }
];

export const MARITIME_LAWS: LawEntry[] = [
  {
    name: "Law of Vibration",
    oneLiner: "Everything in the universe is energy in motion at a unique frequency.",
    meaning:
      "Nothing rests. Every thought, emotion, person, object and outcome is vibrating at some rate. The body — being roughly 60% water — is exquisitely sensitive to these vibrations: water reorganises around sound, intention and emotion. Match a frequency long enough and it becomes your reality.",
    use: "Audit your daily inputs (music, conversations, scrolls, foods). Cut what vibrates low; deliberately tune in to what vibrates at the level you want to live at."
  },
  {
    name: "Law of Resonance",
    oneLiner: "Like attracts like — frequencies that match amplify each other.",
    meaning:
      "Two systems vibrating at the same frequency reinforce each other; two opposing frequencies cancel out. The body's water acts as a tuning fork: it picks up the dominant frequency in a room and starts to copy it. Spend time in low rooms, you become low; spend time in high rooms, you become high.",
    use: "Choose your environments and circles surgically. Resonance is not optional — you will sync to the dominant signal whether you like it or not."
  },
  {
    name: "Mirror Principle",
    oneLiner: "What you witness with intent, you imprint into your own water.",
    meaning:
      "The internal water of the body mirrors what it observes — Masaru Emoto-style. Sustained exposure to images, words and emotions changes the cellular structure of what holds you together. Your body is literally a copy of the things you keep watching.",
    use: "Curate your gaze. Before sleep, replace doom-scroll with images of the life you want. The body will rehearse what you keep showing it."
  },
  {
    name: "Frequency Matching",
    oneLiner: "You don't get what you ask for — you get what you match.",
    meaning:
      "Manifestation is not a wish; it is a vibrational match. The universe responds to the frequency you are emitting, not the words you are saying. Asking for abundance from a fear frequency will return more fear, because that is the frequency the body actually broadcasts.",
    use: "Before you ask, embody. Get into the *feeling* of already having the thing — gratitude, peace, satisfaction. Stay there. The match brings the form."
  },
  {
    name: "Law of Coherence",
    oneLiner: "Aligned thought, feeling and action create unstoppable signal.",
    meaning:
      "Coherence is when mind, heart and body all vibrate in the same direction — no leaks, no contradictions. Incoherence (think one thing, feel another, do a third) produces noise that the universe cannot route. The body's water aligns and broadcasts cleanly only when all three agree.",
    use: "Before any major action: check your thought, feeling and behaviour are pointing the same way. If one disagrees, fix that first — don't push through with mixed signal."
  },
  {
    name: "Law of Intention",
    oneLiner: "Direction precedes manifestation — water remembers the instruction.",
    meaning:
      "Intention is the seed-frequency you plant before any work begins. Even basic experiments show water structures itself differently around love-words vs hate-words. The body's water carries that imprint into every cell, shaping the actions that follow.",
    use: "Begin every meaningful act — meals, training, work blocks, conversations — with a one-line intention spoken or written. The cells will organise around it."
  },
  {
    name: "Law of Sound & Word",
    oneLiner: "Spoken and sung frequencies physically reshape the water in you.",
    meaning:
      "Sound is vibration made audible. Mantras, prayer, music in 432 / 528 Hz, even your own voice — these bathe the body's water in a chosen pattern. Negative speech does the opposite: it crystallises tension, anger and fatigue into the same water that carries your nutrients.",
    use: "Listen to and speak words aligned with the version of you that's coming. Treat your speech as a cellular tuning instrument, not idle chatter."
  },
  {
    name: "Law of Emotion (Heart Frequency)",
    oneLiner: "The heart's electromagnetic field is the strongest signal you broadcast.",
    meaning:
      "The heart generates a measurable field that extends several feet beyond the body. Emotions like gratitude, love and reverence raise that field's coherence; fear, resentment and envy collapse it. The water in every cell tunes to this field first, before anything mental.",
    use: "Practice 60–90 seconds of heart-centred gratitude when entering any important room (a trade, a meeting, a date). You bring the room with you."
  },
  {
    name: "Law of Allowing",
    oneLiner: "Resistance lowers your frequency; allowing raises it.",
    meaning:
      "Forcing, gripping, complaining and worrying are all forms of resistance — they introduce friction in the water and drop the broadcast frequency. Allowing is the opposite: you trust, you soften, you let the wave move through you. Calm water carries a clean signal.",
    use: "When you catch yourself white-knuckling, exhale, drop the shoulders, and say 'I allow this'. Then act from the calmer water that follows."
  },
  {
    name: "Law of Hydration & Embodiment",
    oneLiner: "A dehydrated body cannot hold a high frequency.",
    meaning:
      "Manifestation is a physical event happening through a physical body. If the body's water is depleted, it can't structure itself around your intention. Sleep, water, sun, breath and movement are not lifestyle — they are the literal medium your frequency travels through.",
    use: "Treat hydration, sleep and breath like prayer. Each glass and each deep breath restores the medium your goals have to travel through."
  },
  {
    name: "Law of Repetition",
    oneLiner: "A frequency held long enough becomes your default state.",
    meaning:
      "One peak emotion is a spike. The same emotion repeated daily is a *frequency*, and the water in the body crystallises around it. This is why affirmations, rituals and consistent practice work — repetition is what teaches the body to hold the new vibration on its own.",
    use: "Pick one frequency (calm confidence, grateful abundance, sharp focus) and rehearse it at the same time every day for 30 days. Your default will change."
  },
  {
    name: "Law of Transmutation",
    oneLiner: "Lower energies can be lifted, not destroyed.",
    meaning:
      "Anger, fear, jealousy and grief are not enemies — they are dense forms of energy. Through breath, movement, art, sound and intention, dense water can be raised into clarity, focus and creative drive. Energy never leaves; it only changes frequency.",
    use: "When a heavy emotion hits, don't suppress it. Move it (run, write, sing, breathe). Watch it come out the other side as power."
  }
];
