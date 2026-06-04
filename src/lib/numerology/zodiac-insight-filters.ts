import type { ChineseSign, NumerologySnapshot } from "@/lib/numerology";

type InsightLists = {
  useCities: string[];
  avoidCities: string[];
  useBrands: string[];
  avoidBrands: string[];
  useCars: string[];
  avoidCars: string[];
  useJets: string[];
  avoidJets: string[];
  usePets: string[];
  avoidPets: string[];
};

/** Patterns blocked from "use" lists when they clash with a Chinese sign. */
const USE_BLOCK: Partial<
  Record<
    ChineseSign,
    { cars?: RegExp[]; pets?: RegExp[]; brands?: RegExp[] }
  >
> = {
  Rooster: {
    cars: [/bmw/i],
    pets: [/\bcat\b/i, /ragdoll/i, /siamese/i, /russian blue/i, /norwegian forest/i],
    brands: [/\bbmw\b/i]
  },
  Rabbit: {
    pets: [/rooster/i, /pit bull/i, /cane corso/i],
    cars: [/lamborghini/i, /ferrari/i]
  },
  Rat: {
    pets: [/horse/i, /goat/i]
  },
  Horse: {
    pets: [/\brat\b/i, /mouse/i]
  },
  Ox: {
    pets: [/goat/i, /sheep/i]
  },
  Goat: {
    pets: [/ox/i, /dog/i]
  },
  Dog: {
    pets: [/dragon/i]
  },
  Dragon: {
    pets: [/dog/i]
  },
  Snake: {
    pets: [/pig/i, /boar/i]
  },
  Pig: {
    pets: [/snake/i]
  },
  Tiger: {
    pets: [/monkey/i, /ape/i]
  },
  Monkey: {
    pets: [/tiger/i]
  }
};

/** Direct avoid additions — no sugar-coating. */
const AVOID_ADD: Partial<
  Record<
    ChineseSign,
    { cars?: string[]; pets?: string[]; brands?: string[] }
  >
> = {
  Rooster: {
    cars: ["BMW (all models)", "BMW M3", "BMW M5", "BMW 7-Series", "BMW X5", "BMW X7"],
    pets: ["Cat (all breeds)", "Siamese Cat", "Ragdoll Cat", "Russian Blue Cat"],
    brands: ["BMW"]
  },
  Rabbit: {
    pets: ["Rooster", "Aggressive guard dogs (untrained)"],
    cars: ["Lamborghini (flash over stability)", "Ferrari (impulse energy)"]
  },
  Rat: { pets: ["Horse", "Goat"] },
  Horse: { pets: ["Rat", "Mouse"] },
  Ox: { pets: ["Goat", "Sheep"] },
  Goat: { pets: ["Ox", "Untrained guard dogs"] },
  Dog: { pets: ["Dragon-themed exotics"] },
  Dragon: { pets: ["Dog (clashing yang energy)"] },
  Snake: { pets: ["Pig", "Wild boar"] },
  Pig: { pets: ["Snake", "Venomous reptiles"] },
  Tiger: { pets: ["Monkey", "Ape"] },
  Monkey: { pets: ["Tiger", "Large cats"] }
};

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function filterUseList(items: string[], patterns?: RegExp[]): string[] {
  if (!patterns?.length) return items;
  return items.filter((item) => !matchesAny(item, patterns));
}

function stripVagueAvoid(items: string[]): string[] {
  return items.filter((item) => {
    const lower = item.toLowerCase();
    if (lower.includes("any sub-prime")) return false;
    if (lower.includes("too small for the energy")) return false;
    if (lower.includes("commuter range")) return false;
    if (lower.startsWith("any ")) return false;
    return true;
  });
}

/** Merge life-path insights with Chinese-sign corrections. */
export function applyChineseZodiacInsightFilters(
  base: InsightLists,
  chinese: ChineseSign
): InsightLists {
  const block = USE_BLOCK[chinese];
  const add = AVOID_ADD[chinese];

  return {
    useCities: base.useCities,
    avoidCities: stripVagueAvoid(base.avoidCities),
    useBrands: filterUseList(base.useBrands, block?.brands),
    avoidBrands: dedupe([...stripVagueAvoid(base.avoidBrands), ...(add?.brands ?? [])]),
    useCars: filterUseList(base.useCars, block?.cars),
    avoidCars: dedupe([...stripVagueAvoid(base.avoidCars), ...(add?.cars ?? [])]),
    useJets: base.useJets,
    avoidJets: stripVagueAvoid(base.avoidJets),
    usePets: filterUseList(base.usePets, block?.pets),
    avoidPets: dedupe([...stripVagueAvoid(base.avoidPets), ...(add?.pets ?? [])])
  };
}

export function filteredAdvancedInsights(
  base: InsightLists,
  snapshot: NumerologySnapshot
): InsightLists {
  return applyChineseZodiacInsightFilters(base, snapshot.chinese);
}
