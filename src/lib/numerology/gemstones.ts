/**
 * Gemstone correspondences for the Numerology page's "Stones / Gemstones"
 * card. These are traditional Vedic / Western numerology + zodiac
 * correspondences combined with planetary rulership. The card surfaces
 * three layers per profile:
 *
 *  - Stones aligned to the user's Life Path number (root vibration)
 *  - Stones aligned to the user's Western zodiac sign (planetary ruler)
 *  - Stones aligned to the user's Chinese animal (cultural overlay)
 *
 * Output is intentionally specific — primary stone, supporting stones,
 * and what to wear / where, so the user doesn't have to guess.
 */

export type GemstoneRecommendation = {
  primary: string;
  supporting: string[];
  /** How / where to wear it. */
  wear: string;
  /** The energetic theme the stone reinforces. */
  theme: string;
};

export const LIFE_PATH_STONES: Record<number, GemstoneRecommendation> = {
  1: {
    primary: "Ruby",
    supporting: ["Red Garnet", "Sunstone", "Citrine"],
    wear: "Ring on the right ring finger or pendant over the heart, set in gold.",
    theme: "Solar leadership, courage, visibility, command."
  },
  2: {
    primary: "Pearl",
    supporting: ["Moonstone", "Selenite", "Opal"],
    wear: "Pendant near the throat or as a left-hand ring, set in silver.",
    theme: "Lunar receptivity, intuition, partnership, calm."
  },
  3: {
    primary: "Yellow Sapphire",
    supporting: ["Citrine", "Topaz", "Amber"],
    wear: "Right index finger ring set in gold, or as a pendant.",
    theme: "Jupiter expansion, voice, optimism, public charisma."
  },
  4: {
    primary: "Hessonite Garnet (Gomed)",
    supporting: ["Smoky Quartz", "Tiger's Eye", "Onyx"],
    wear: "Ring on the middle finger of the right hand, set in silver.",
    theme: "Rahu / Uranus discipline, structure, stability under chaos."
  },
  5: {
    primary: "Emerald",
    supporting: ["Peridot", "Green Tourmaline", "Aventurine"],
    wear: "Right little finger ring set in gold, or pendant against bare skin.",
    theme: "Mercury — communication, mobility, agility, learning."
  },
  6: {
    primary: "Diamond",
    supporting: ["White Sapphire", "Clear Quartz", "Rose Quartz"],
    wear: "Right ring finger or pendant, set in white gold or platinum.",
    theme: "Venus — beauty, harmony, family, aesthetic devotion."
  },
  7: {
    primary: "Cat's Eye (Chrysoberyl)",
    supporting: ["Lapis Lazuli", "Labradorite", "Amethyst"],
    wear: "Right middle finger or pendant, set in silver.",
    theme: "Ketu / Neptune — inward sight, mysticism, deep knowledge."
  },
  8: {
    primary: "Blue Sapphire",
    supporting: ["Amethyst", "Black Onyx", "Hematite"],
    wear: "Right middle finger ring set in silver or platinum (test for compatibility — Blue Sapphire is famously discerning).",
    theme: "Saturn — capital, status, command, long-game power."
  },
  9: {
    primary: "Red Coral",
    supporting: ["Carnelian", "Bloodstone", "Red Jasper"],
    wear: "Ring on the right ring finger, set in gold or copper.",
    theme: "Mars — courage, action, ending what's done, rebirth cycles."
  },
  11: {
    primary: "Moonstone",
    supporting: ["Selenite", "Pearl", "Labradorite"],
    wear: "Pendant near the heart and / or left ring finger, set in silver.",
    theme:
      "Master Intuitive — amplifies psychic sensitivity; ground with hematite or smoky quartz when overwhelmed."
  },
  22: {
    primary: "Yellow Sapphire",
    supporting: ["Citrine", "Hessonite Garnet", "Smoky Quartz"],
    wear: "Right index finger set in gold, plus a smoky quartz on the body for grounding.",
    theme: "Master Builder — Jupiter expansion + Saturn discipline at master octave."
  },
  33: {
    primary: "Emerald",
    supporting: ["Diamond", "Pink Tourmaline", "Rose Quartz"],
    wear: "Pendant over the heart, set in white gold or platinum.",
    theme: "Master Teacher — heart-led service, beauty, compassion at master octave."
  }
};

export const WESTERN_SIGN_STONES: Record<string, GemstoneRecommendation> = {
  Aries: {
    primary: "Red Jasper",
    supporting: ["Carnelian", "Bloodstone", "Red Coral"],
    wear: "Ring on the right hand, ideally during high-stakes work / training.",
    theme: "Mars fire — endurance, courage, controlled aggression."
  },
  Taurus: {
    primary: "Emerald",
    supporting: ["Rose Quartz", "Green Aventurine", "Selenite"],
    wear: "Pendant near the throat or earrings.",
    theme: "Venus on earth — sensual abundance, longevity wealth."
  },
  Gemini: {
    primary: "Citrine",
    supporting: ["Tiger's Eye", "Yellow Topaz", "Agate"],
    wear: "Bracelet on the dominant wrist or pocket pebble during writing / negotiation.",
    theme: "Mercury — clarity of voice, focus across multiple threads."
  },
  Cancer: {
    primary: "Moonstone",
    supporting: ["Pearl", "Selenite", "Opal"],
    wear: "Silver pendant near the heart, especially on full-moon days.",
    theme: "Lunar — emotional steadiness, family protection, intuition."
  },
  Leo: {
    primary: "Ruby",
    supporting: ["Sunstone", "Citrine", "Yellow Sapphire"],
    wear: "Gold ring on the right ring finger; the more visible, the better for a Leo.",
    theme: "Solar — radiance, confidence, leadership presence."
  },
  Virgo: {
    primary: "Peridot",
    supporting: ["Sapphire", "Carnelian", "Moss Agate"],
    wear: "Ring on the index finger of the working hand, or a discreet pendant.",
    theme: "Mercury — precision, healing, refined service."
  },
  Libra: {
    primary: "Opal",
    supporting: ["Lapis Lazuli", "Sapphire", "Rose Quartz"],
    wear: "Pendant or earrings; Libras suit symmetry — pair them.",
    theme: "Venus on air — beauty, balance, partnership."
  },
  Scorpio: {
    primary: "Topaz",
    supporting: ["Obsidian", "Garnet", "Smoky Quartz"],
    wear: "Worn close to skin — pendant under clothing, ring on the dominant hand.",
    theme: "Pluto / Mars — transformation, depth, protection."
  },
  Sagittarius: {
    primary: "Turquoise",
    supporting: ["Lapis Lazuli", "Yellow Sapphire", "Amethyst"],
    wear: "Pendant or bracelet — especially when travelling.",
    theme: "Jupiter — expansion, travel protection, philosophical clarity."
  },
  Capricorn: {
    primary: "Garnet",
    supporting: ["Onyx", "Black Tourmaline", "Smoky Quartz"],
    wear: "Ring or cufflinks; Capricorns suit subtle, structured pieces.",
    theme: "Saturn — discipline, longevity, strategic power."
  },
  Aquarius: {
    primary: "Amethyst",
    supporting: ["Aquamarine", "Labradorite", "Sugilite"],
    wear: "Pendant or open-band ring; unusual settings suit the sign.",
    theme: "Saturn / Uranus — vision, originality, social-movement work."
  },
  Pisces: {
    primary: "Aquamarine",
    supporting: ["Amethyst", "Moonstone", "Lapis Lazuli"],
    wear: "Pendant near the heart, especially during creative or healing work.",
    theme: "Jupiter / Neptune — empathy, art, soul-line work."
  }
};

export const CHINESE_SIGN_STONES: Record<string, GemstoneRecommendation> = {
  Rat: {
    primary: "Garnet",
    supporting: ["Smoky Quartz", "Onyx"],
    wear: "Pocket stone or discreet ring — Rats prefer hidden talismans.",
    theme: "Resourcefulness, survival instinct, cunning."
  },
  Ox: {
    primary: "Aquamarine",
    supporting: ["Tiger's Eye", "Amber"],
    wear: "Pendant or large statement ring set in silver.",
    theme: "Patience, endurance, long-game compounding."
  },
  Tiger: {
    primary: "Sapphire",
    supporting: ["Tiger's Eye", "Ruby"],
    wear: "Bold ring or cufflinks; Tigers wear gemstones with intent.",
    theme: "Courage, leadership, controlled ferocity."
  },
  Rabbit: {
    primary: "Pearl",
    supporting: ["Rose Quartz", "Moonstone"],
    wear: "Earrings or delicate pendant.",
    theme: "Diplomacy, refinement, peaceful longevity."
  },
  Dragon: {
    primary: "Amethyst",
    supporting: ["Citrine", "Sapphire"],
    wear: "Visible ring or pendant; Dragons wear stones unapologetically.",
    theme: "Power, charisma, transformative leadership."
  },
  Snake: {
    primary: "Opal",
    supporting: ["Topaz", "Black Onyx"],
    wear: "Statement ring or pendant.",
    theme: "Wisdom, strategy, hidden depth."
  },
  Horse: {
    primary: "Topaz",
    supporting: ["Turquoise", "Citrine"],
    wear: "Travel-friendly pendant or bracelet.",
    theme: "Movement, freedom, adventure protection."
  },
  Goat: {
    primary: "Emerald",
    supporting: ["Sapphire", "Rose Quartz"],
    wear: "Pendant near the heart; Goats love beauty close to skin.",
    theme: "Creativity, gentleness, emotional refinement."
  },
  Monkey: {
    primary: "Peridot",
    supporting: ["Citrine", "Tiger's Eye"],
    wear: "Wristwear — bracelets, cuffs.",
    theme: "Intelligence, agility, clever invention."
  },
  Rooster: {
    primary: "Citrine",
    supporting: ["Topaz", "Garnet"],
    wear: "Visible ring on the working hand.",
    theme: "Precision, courage, performance excellence."
  },
  Dog: {
    primary: "Diamond",
    supporting: ["Pearl", "Sapphire"],
    wear: "Wedding-band-style ring or pendant.",
    theme: "Loyalty, justice, protection of those you love."
  },
  Pig: {
    primary: "Ruby",
    supporting: ["Garnet", "Rose Quartz"],
    wear: "Pendant or large ring.",
    theme: "Generosity, abundance, hosting energy."
  }
};
