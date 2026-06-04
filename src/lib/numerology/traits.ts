/**
 * Personality / life-path trait data for the three "trait" cards on the
 * Numerology page:
 *
 *  1. Chinese zodiac sign traits (Year Cycle tab) — what each animal
 *     tends to bring to relationships, work, money, and tells. Style
 *     follows the public lectures from GG33 (Robert Edward Grant /
 *     similar numerology-traditional teachers): plain-language,
 *     observational, doesn't claim to be predictive.
 *
 *  2. Life-path / number traits (Year Cycle tab) — narrative traits
 *     for 1–9 plus the master numbers 11, 22, 33. Distinct from the
 *     existing "Number frequencies & vibrations" card which focuses
 *     on vibrational keywords; this card focuses on observable
 *     personality patterns.
 *
 *  3. Western zodiac sign traits (Lunar Cycle tab) — sit beneath the
 *     "All 12 signs at a glance" grid; this version goes deeper into
 *     personality / body / relationships rather than just the trade
 *     archetype string.
 *
 * All three live here so the page component stays focused on
 * presentation and the data is easy to evolve in one place.
 */

export type ChineseSignTrait = {
  sign: string;
  emoji: string;
  /** One-liner that captures the GG33-style essence. */
  essence: string;
  loyalty: string;
  career: string;
  money: string;
  /** "How you know they don't like you" — distinctive tells. */
  tells: string;
  /** Famous-people examples are deliberately public-figure / safe. */
  notable: string;
};

export const CHINESE_SIGN_TRAITS: ChineseSignTrait[] = [
  {
    sign: "Rat",
    emoji: "🐀",
    essence:
      "Quick, resourceful, sharp survivor energy. Always two steps ahead, always has an exit.",
    loyalty:
      "Loyal to a tight inner circle but instinctively self-protective. They will leave a sinking ship before you've smelled smoke.",
    career: "Entrepreneurs, traders, dealmakers, journalists, investigators, agents.",
    money:
      "Naturally money-aware; saves and accumulates discreetly; loves leverage when it's asymmetric. Reads markets like a fox reads a coop.",
    tells:
      "If a Rat goes quiet and friendly without engaging, they've already decided. If they suddenly start asking lots of detailed questions, they're studying you, not flirting.",
    notable: "Shakespeare, Eminem, Kobe Bryant, Shakira."
  },
  {
    sign: "Ox",
    emoji: "🐂",
    essence:
      "Steady, methodical, immovable when their mind is set. The classic build-it-brick-by-brick energy.",
    loyalty:
      "Deeply loyal once you're in. Slow to trust, slower to forgive. They don't do drama — they do consequences.",
    career:
      "Operators, builders, surgeons, athletes, farmers, civil engineers, long-term portfolio managers.",
    money:
      "Long-game compounders. Hate volatility for its own sake. Property, dividend stocks, gold — anything that doesn't ask them to be clever every Monday.",
    tells:
      "When an Ox stops correcting you, they've stopped investing in you. Silence + cold professionalism = they're done.",
    notable: "Barack Obama, Walt Disney, Vincent van Gogh, Princess Diana."
  },
  {
    sign: "Tiger",
    emoji: "🐅",
    essence:
      "Bold, magnetic, born to lead and to be looked at. Doesn't ask permission to take the room.",
    loyalty:
      "Fiercely loyal to people who match their courage; restless with anyone who shrinks them. Will defend you publicly without warning.",
    career: "Founders, performers, military, prosecutors, athletes, brand-faces.",
    money:
      "Bold bets, big swings; great upside in good cycles, brutal drawdowns in tough cycles. Need a structured rule-set or they over-leverage.",
    tells:
      "A Tiger that's gone cold to you isn't subtle — they stop pulling you into rooms. If they roar (publicly criticise), they still care; silence is the real exit.",
    notable: "Lady Gaga, Leonardo DiCaprio, Tom Cruise, Stevie Wonder."
  },
  {
    sign: "Rabbit",
    emoji: "🐇",
    essence:
      "Refined, diplomatic, pleasure-loving aesthete. Reads rooms before they speak.",
    loyalty:
      "Loyal to peace more than to people; will gently disappear from a relationship that gets loud rather than fight.",
    career: "Diplomats, designers, hospitality, lawyers, lifestyle brands, family offices.",
    money:
      "Quiet, conservative, taste-driven. Builds wealth via beauty businesses, real estate, art, fashion. Rarely a trader by personality, but excellent at allocators / curators.",
    tells:
      "A Rabbit that's done with you becomes pristinely polite. Compliments without specifics, replies without details — they're already gone, just waiting for the right exit.",
    notable: "Albert Einstein, Lionel Messi, Frank Sinatra, Angelina Jolie."
  },
  {
    sign: "Dragon",
    emoji: "🐉",
    essence:
      "Charismatic, ambitious, larger-than-life. Comes in to change the energy of the room.",
    loyalty:
      "Fiercely protective of their tribe. They forgive big mistakes from people who actually love them; they cannot tolerate small disrespects from people who don't.",
    career: "CEOs, celebrities, founders, politicians, generals, top sales.",
    money:
      "High-stakes operators. Massive earners but also massive spenders. The animal best built for 8-energy financial empires when they discipline the spending.",
    tells:
      "A Dragon that's done with you stops introducing you to anyone. They keep the friendship surface-level and make sure you never get close to their next chapter.",
    notable: "John Lennon, Bruce Lee, Rihanna, Adele."
  },
  {
    sign: "Snake",
    emoji: "🐍",
    essence:
      "Wise, intuitive, patient strategist. Sees three moves ahead and rarely shows their hand.",
    loyalty:
      "Loyal but transactional. They love deeply, plan carefully, and exit cleanly when the math stops working.",
    career: "Strategists, analysts, philosophers, surgeons, intelligence work, allocators.",
    money:
      "Excellent long-term traders and allocators. Patient with positions; brutal with mistakes. Quiet wealth, rarely flexes.",
    tells:
      "Snakes don't fight when they're done — they just stop sharing. The information flow goes one-way (you to them), then it goes silent.",
    notable: "Mahatma Gandhi, Pablo Picasso, JFK, Taylor Swift."
  },
  {
    sign: "Horse",
    emoji: "🐎",
    essence:
      "Free, mobile, charismatic. Built for movement — geographically, financially, romantically.",
    loyalty:
      "Loyal in the moment, but a cage will end them. Give a Horse freedom and they'll stay forever; trap one and they'll bolt overnight.",
    career: "Travel-driven roles, sales, sports, entrepreneurship, performers, traders.",
    money:
      "Make and lose fast. Best as active traders / dealmakers; bad at static long-term holdings unless they have an Ox or Snake co-pilot.",
    tells:
      "A Horse that's done isn't dramatic — they just become busy. Plans cancelled at the last minute, slow replies, 'we should catch up' that never happens.",
    notable: "Nelson Mandela, Aretha Franklin, Paul McCartney, Kristen Stewart."
  },
  {
    sign: "Goat",
    emoji: "🐐",
    essence:
      "Gentle, artistic, deeply emotional. Aesthetic lives — beauty, music, design, food.",
    loyalty:
      "Devoted in love and family; can be stubborn about being misunderstood. Forgives slowly because they remember how things felt.",
    career: "Artists, designers, hospitality, healers, therapists, hospitality, chefs.",
    money:
      "Best with patient money, family money, creative-IP money. Avoid high-frequency trading; their nervous system can't take it.",
    tells:
      "Goats withdraw when hurt. They go quiet, develop a 'busy season,' and let the silence do the talking.",
    notable: "Steve Jobs, Mick Jagger, Julia Roberts, Bruce Willis."
  },
  {
    sign: "Monkey",
    emoji: "🐒",
    essence:
      "Inventive, witty, mischievous. Loves a clever angle and will find one in any situation.",
    loyalty:
      "Loyal to whoever keeps the game interesting. They'll forgive almost anything except boredom.",
    career: "Tech, comedy, marketing, growth hacking, hospitality, startup founders.",
    money:
      "Brilliant with arbitrage, growth bets, deal structuring. Need accountability around exit discipline — they fall in love with the cleverness of a position.",
    tells:
      "When a Monkey stops joking with you, you've lost them. Genuine laughter is the test — if it's gone, the relationship is too.",
    notable: "Leonardo da Vinci, Charles Dickens, Will Smith, Mick Jagger's birth year."
  },
  {
    sign: "Rooster",
    emoji: "🐓",
    essence:
      "Direct, fearless, perfectionist. Will tell you the truth before they tell you they love you.",
    loyalty:
      "Intensely loyal to people who can handle their honesty. They don't sugarcoat — if they're still correcting you, they still care about the outcome.",
    career: "Surgeons, lawyers, athletes, pilots, military, brand-builders, top-end consultants.",
    money:
      "Disciplined when their rules are tight. Bad year is when they bend their own rules — they sense it themselves but their pride takes the wheel.",
    tells:
      "A Rooster that's done with you stops fighting you. The criticism dries up, the standards drop, and they treat you like a polite stranger.",
    notable: "Beyoncé, Jennifer Aniston, Yoko Ono, Britney Spears."
  },
  {
    sign: "Dog",
    emoji: "🐕",
    essence:
      "Loyal to a fault, justice-driven, protective. Their default question is 'is this fair?'",
    loyalty:
      "The most loyal of all 12 signs. They pick a side and stay there for life. Wronging a Dog's friend is wronging the Dog.",
    career: "Lawyers, doctors, soldiers, social workers, teachers, anti-corruption work, family-business operators.",
    money:
      "Conservative, ethics-screened. They underperform during pure-greed markets and outperform during recovery / value cycles. Hate exploitative trades on principle.",
    tells:
      "A Dog only walks when something has crossed an ethical line they can't unsee. Once they leave, they don't come back — the door is welded shut.",
    notable: "Michael Jackson, Madonna, Mother Teresa, Justin Bieber."
  },
  {
    sign: "Pig",
    emoji: "🐖",
    essence:
      "Generous, sensual, abundance-energy. Knows how to enjoy life and how to host it.",
    loyalty:
      "Warm, forgiving, generous to a fault. Sometimes too generous — boundaries are their growth edge.",
    career: "Hospitality, food, wine, entertainment, family business, operations.",
    money:
      "Strong earners and strong spenders. Need a Snake or Ox to enforce capital discipline. When they get it right, they build legacy estates.",
    tells:
      "A Pig that's done with you doesn't get cruel — they just stop hosting you. No invitations, no gatherings, polite at a distance.",
    notable: "Hillary Clinton, Arnold Schwarzenegger, Elton John, Steven Spielberg."
  }
];

export type LifePathTrait = {
  number: number;
  title: string;
  /** Plain-language essence GG33-style. */
  essence: string;
  strengths: string;
  shadow: string;
  /** Concrete career / lane suggestions. */
  lanes: string;
  /** Money / investing pattern. */
  money: string;
  /** Famous public-figure examples. */
  notable: string;
  /** Optional special-case warning (e.g. master 11 travel taboo). */
  caveat?: string;
};

export const LIFE_PATH_TRAITS: LifePathTrait[] = [
  {
    number: 1,
    title: "The Pioneer",
    essence:
      "Built to lead — the one who walks into the empty room and starts setting tables. Independence is non-negotiable; following someone else's plan slowly suffocates them.",
    strengths:
      "Initiative, originality, courage, willingness to be first / wrong / public. Natural founders, generals, head coaches, lead surgeons.",
    shadow:
      "Ego, isolation, can't share credit, dismisses subordinates, treats people as instruments.",
    lanes:
      "Founder / CEO, head of trading desk, lead architect, head coach, command roles, solo athletes.",
    money:
      "Earn big by being first to a vertical. Own the cap table, don't dilute early. Trade with conviction; cut quickly when wrong.",
    notable: "Steve Jobs, Lady Gaga, Tom Hanks, Walt Disney, Martin Luther King Jr."
  },
  {
    number: 2,
    title: "The Diplomat",
    essence:
      "Feminine receptive energy — the one who can hold the room together. Reads the unsaid; built for partnership rather than solo command.",
    strengths:
      "Empathy, patience, intuition, ability to mediate, gift for relationships and aesthetics.",
    shadow:
      "Over-accommodation, codependence, indirect communication, conflict avoidance until resentment explodes.",
    lanes:
      "Co-founders, deal-makers, diplomats, therapists, family offices, hospitality, design, allocators.",
    money:
      "Wealth via partnerships and long-term relationships, not via solo bets. Excellent in allocator / portfolio-management roles, less so as a screen-trading scalper.",
    notable: "Madonna, Barack Obama, Kanye West, Jennifer Aniston."
  },
  {
    number: 3,
    title: "The Communicator",
    essence:
      "Words, voice, story. Born to speak in public, to entertain, to translate complex things for normal humans.",
    strengths:
      "Charisma, humour, storytelling, social ease, creative output, ability to brand and sell.",
    shadow:
      "Scattered focus, surface charm without follow-through, gossip, dramatic ups and downs.",
    lanes:
      "Performers, comedians, public speakers, hosts, marketers, content creators, sales leaders, journalists.",
    money:
      "Earn through audience and IP — courses, content, brand deals, royalties. Spend just as fast unless paired with a 4 or 8 partner.",
    notable: "Snoop Dogg, Jennifer Lopez, Hillary Clinton, John Travolta."
  },
  {
    number: 4,
    title: "The Builder",
    essence:
      "Order is sacred. Loves systems, processes, schedules, blueprints. The one who makes the lights stay on.",
    strengths:
      "Discipline, follow-through, reliability, technical mastery, long-term execution.",
    shadow:
      "Rigidity, inability to pivot, control freak, can grind themselves and their team into burnout.",
    lanes:
      "Engineers, architects, surgeons, military, ops leaders, accountants, infrastructure, manufacturing.",
    money:
      "Slow, steady, rule-based. Love real estate, dividend equities, businesses with cashflow, treasuries. Avoid speculative tokens — they hate volatility for sport.",
    notable: "Bill Gates, Oprah Winfrey, Brad Pitt, Will Smith."
  },
  {
    number: 5,
    title: "The Explorer",
    essence:
      "Movement is fuel. Travel, change, freedom, sex appeal — they wear it without trying.",
    strengths:
      "Adaptability, charisma, language acquisition, sales, promotion, lifestyle marketing.",
    shadow:
      "Restlessness, addiction risk, commitment phobia, abandons projects when novelty fades.",
    lanes:
      "Travel writers, pilots, foreign correspondents, traders who love volatility, growth-hackers, lifestyle brands, hospitality.",
    money:
      "Make it on the move. Many income streams. Bad with single-asset long holds; thrive in active trading + multi-business portfolios.",
    notable: "Angelina Jolie, Jay-Z, Mick Jagger, Tina Turner."
  },
  {
    number: 6,
    title: "The Nurturer",
    essence:
      "Family, beauty, responsibility, service. The one who turns a house into a home and a team into a tribe.",
    strengths:
      "Loyalty, aesthetic sense, caretaking, mentoring, building inclusive culture.",
    shadow:
      "Over-functioning, martyrdom, control disguised as love, resentment when sacrifice goes unseen.",
    lanes:
      "Doctors, nurses, teachers, family-business leaders, designers, hospitality, wedding industry, philanthropy.",
    money:
      "Family-office structures, dynasty wealth, real estate, hospitality, multigenerational businesses. Wealth is a means to make life beautiful for others.",
    notable: "Albert Einstein, John Lennon, Meryl Streep, Robert De Niro."
  },
  {
    number: 7,
    title: "The Seeker",
    essence:
      "Inward and analytical. The one who needs solitude the way most people need company. Born researchers, mystics, monks, code archaeologists.",
    strengths:
      "Deep intelligence, pattern recognition, mastery of niche subjects, philosophical clarity.",
    shadow:
      "Aloofness, intellectual snobbery, isolation, paralysis-by-analysis, depression in chaotic environments.",
    lanes:
      "Researchers, scientists, monks, writers, quants, analysts, watchmakers, theologians, philosophers.",
    money:
      "Builds via niche expertise — IP, books, research advisory, quant funds. Quiet wealth, rarely flexes. Hates being marketed at.",
    notable: "Princess Diana, Marilyn Monroe, Eric Clapton, Elon Musk."
  },
  {
    number: 8,
    title: "The Power Builder",
    essence:
      "Money, status, command — the visible kind. The one drawn to the head chair, the bigger title, the larger room.",
    strengths:
      "Ambition, capital allocation, leverage, scale, executive presence, business architecture.",
    shadow:
      "Greed, workaholism, dominance through fear, cycles of boom and blow-up, capital ego.",
    lanes:
      "CEOs, real-estate moguls, capital allocators, hedge-fund managers, prop-firm operators, entertainment moguls.",
    money:
      "The money sign. Designed for leverage, debt as a tool, complex capital stacks. Without discipline / a 4 partner they cycle through booms and busts.",
    notable: "Elizabeth II, Bernie Madoff, Pablo Picasso, Sandra Bullock."
  },
  {
    number: 9,
    title: "The Humanitarian",
    essence:
      "Old soul, lifetime closer. The one who's already lived 4 chapters and reads people instantly.",
    strengths:
      "Wisdom, compassion, magnetic charisma, ability to inspire collective movements, easy with grief and endings.",
    shadow:
      "Martyr complex, drama-attractor, emotional dumping ground, struggles with personal money because giving feels easier than receiving.",
    lanes:
      "Activists, NGO founders, artists, healers, teachers, late-stage executives, crypto operators (per GG33 — 9-energy is unusually compatible with the closure-and-rebirth cycle of crypto markets).",
    money:
      "Earn big from causes and IP that touch many. GG33 frames 9s as natural crypto operators — they thrive in cyclic markets where most can't tolerate the closure / rebirth pattern.",
    notable: "Mahatma Gandhi, Mother Teresa, Jim Carrey, Whitney Houston."
  },
  {
    number: 11,
    title: "The Master Intuitive",
    essence:
      "Old soul amplified. Vibrationally a 2, but at master octave — emotional, psychic, profoundly relational. People open up to 11s without knowing why.",
    strengths:
      "Empathy, intuition, spiritual leadership, ability to channel, magnetism that draws confessions.",
    shadow:
      "Anxiety, nervous-system overload, addiction risk, codependence, emotional flooding.",
    lanes:
      "Healers, counsellors, mediums, spiritual teachers, deep-research therapists, pastoral roles, hospice work.",
    money:
      "Earn through trust / relational businesses. Burn through energy first, money second. Need strict nervous-system protocols (sleep, silence, retreats) to function.",
    caveat:
      "GG33 lore: avoid travelling on an 11-day energy date (the 11th of any month, plus dates that reduce to 11 — the 29th, the 2nd of November, dates summing to 29, etc.). Treat it as advice and journal it for yourself before weighting it as a rule. Major events on 11-days carry a heavier emotional charge — schedule accordingly.",
    notable: "Michelle Obama, Mahatma Gandhi (life-path 9 / many master days), Wolfgang Amadeus Mozart."
  },
  {
    number: 22,
    title: "The Master Builder",
    essence:
      "Vibrationally a 4 at master octave — built to architect things that outlast the architect. Cathedrals, foundations, frameworks, dynasties.",
    strengths:
      "Visionary planning, executive will, capacity to translate dream → blueprint → building.",
    shadow:
      "Overwhelm by their own scale, isolation through over-responsibility, perfectionist paralysis.",
    lanes:
      "Founders of multi-generational institutions, urban planners, architects, head of state-style operators, dynasty-grade investors.",
    money:
      "Build to leave. Foundations, endowments, holding companies, multi-decade portfolios. Hate quick flips on principle.",
    notable: "Bill Clinton, the Dalai Lama (some birthdate computations), Frank Lloyd Wright."
  },
  {
    number: 33,
    title: "The Master Teacher",
    essence:
      "Vibrationally a 6 at master octave — the Christ / Bodhisattva number in numerology lore. 33s influence people without trying; their presence is the sermon.",
    strengths:
      "Compassion, charisma, ability to gather and inspire, depth of moral conviction, gift for influencing public consciousness.",
    shadow:
      "Saviour complex, burnout from carrying everyone, public scrutiny, identity loss in service.",
    lanes:
      "Religious / spiritual leaders, social-movement founders, philanthropy heads, education-system reformers, public moral voices.",
    money:
      "Through institutions and movements rather than personal accumulation. Their wealth is reputational and enduring.",
    notable:
      "John Lennon (life-path 33 by some computations), Albert Einstein (per traditional numerology), Salvador Dalí."
  }
];

export type WesternSignTrait = {
  sign: string;
  symbol: string;
  dates: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  ruler: string;
  /** Body archetype / physicality bullet — what the user asked for. */
  body: string;
  /** Personality. */
  personality: string;
  shadow: string;
  /** What they're wired for in love / friendship. */
  love: string;
  career: string;
  notable: string;
};

export const WESTERN_SIGN_TRAITS: WesternSignTrait[] = [
  {
    sign: "Aries",
    symbol: "♈",
    dates: "Mar 21 – Apr 19",
    element: "Fire",
    modality: "Cardinal",
    ruler: "Mars",
    body:
      "Athletic, head-first, often a strong forehead and direct gaze. Built for sprints and combat sports — boxing, sprinting, MMA, sword sports. Recovers fast, gets injured by impatience.",
    personality:
      "Pioneer, warrior, leader of the cardinal fire group. First to volunteer, first to leave when bored. Direct to the point of bluntness.",
    shadow: "Impulsive, hot-tempered, picks fights, can't sit still long enough to integrate learning.",
    love: "Falls fast, chases hard, loses interest in resistance-free relationships. Needs a worthy opponent.",
    career: "Founders, soldiers, surgeons, athletes, lead salespeople, frontline operators.",
    notable: "Lady Gaga, Leonardo da Vinci, Mariah Carey, Robert Downey Jr."
  },
  {
    sign: "Taurus",
    symbol: "♉",
    dates: "Apr 20 – May 20",
    element: "Earth",
    modality: "Fixed",
    ruler: "Venus",
    body:
      "Sturdy, sensual, often a strong neck and rich voice. Excels at strength sports, weightlifting, rugby, wrestling. Loves food and beauty — careful with comfort weight.",
    personality:
      "Steady, sensual, beauty-loving builder. Everything they own is high-quality and lasts. Not slow — patient.",
    shadow: "Stubborn, possessive, slow to forgive, materially overcomforted, refuses to change when change is needed.",
    love: "Loyal, physical, generous. Once they commit, they commit forever. Will not be rushed.",
    career: "Bankers, chefs, real-estate operators, luxury brand builders, sculptors, musicians, vintners.",
    notable: "Adele, George Clooney, Queen Elizabeth II, Audrey Hepburn."
  },
  {
    sign: "Gemini",
    symbol: "♊",
    dates: "May 21 – Jun 20",
    element: "Air",
    modality: "Mutable",
    ruler: "Mercury",
    body:
      "Lean, quick, expressive hands and bright eyes. Naturally good at racquet sports, dance, and movement-with-skill rather than brute strength.",
    personality:
      "Curious, witty, multi-tasking, born communicator. Two minds in one head — can hold opposite views simultaneously.",
    shadow: "Inconsistent, scatter-shot, gossip-prone, struggles to finish what they start.",
    love: "Falls for the brain. Bored by anyone who doesn't surprise them weekly. Needs verbal partners.",
    career: "Writers, journalists, comedians, marketers, podcast hosts, traders who love information.",
    notable: "Marilyn Monroe, Kanye West, Tupac Shakur, Angelina Jolie."
  },
  {
    sign: "Cancer",
    symbol: "♋",
    dates: "Jun 21 – Jul 22",
    element: "Water",
    modality: "Cardinal",
    ruler: "Moon",
    body:
      "Soft features, expressive face, often slim with a tendency to hold weight around the abdomen. Built for endurance and yoga more than impact sports.",
    personality:
      "Deeply emotional, family-oriented, intuitive. The one who remembers everyone's birthday and feeds the room.",
    shadow: "Moody, manipulative through guilt, retreats into shells, holds grudges quietly for years.",
    love: "Profoundly loyal, nurturing, protective. Will run a household like an empire.",
    career: "Doctors, nurses, hoteliers, chefs, family-office builders, real estate, education.",
    notable: "Princess Diana, Tom Cruise, Frida Kahlo, Tom Hanks."
  },
  {
    sign: "Leo",
    symbol: "♌",
    dates: "Jul 23 – Aug 22",
    element: "Fire",
    modality: "Fixed",
    ruler: "Sun",
    body:
      "Strong build, often signature hair, magnetic posture. Performance athletes, dancers, martial artists, gymnasts.",
    personality: "Generous, theatrical, creative, born performer. Lights up rooms; flat in shadows.",
    shadow: "Pride, attention-need, dominance, can sulk when not centred.",
    love: "Big love, big public gestures, big loyalty. Cannot tolerate disrespect or being made small.",
    career: "Performers, brand-faces, CEOs, directors, athletes, top sales, royalty.",
    notable: "Barack Obama, Madonna, Coco Chanel, Jennifer Lopez."
  },
  {
    sign: "Virgo",
    symbol: "♍",
    dates: "Aug 23 – Sep 22",
    element: "Earth",
    modality: "Mutable",
    ruler: "Mercury",
    body:
      "Lean, precise, often striking — Virgos genuinely have an unusually high concentration of athletic frames and aesthetic features. Perfectionist about training and diet. Excellent at any precision sport.",
    personality:
      "Analytical, perfectionist, service-driven, problem-solver. Every detail carries weight for them.",
    shadow: "Hypercritical, anxious, micromanaging, hard on themselves above all else.",
    love: "Devoted, practical, loves through acts of service. Needs a partner whose standards rise to meet theirs.",
    career: "Surgeons, editors, engineers, accountants, athletes, hospitality, watchmakers.",
    notable: "Beyoncé, Michael Jackson, Keanu Reeves, Mother Teresa."
  },
  {
    sign: "Libra",
    symbol: "♎",
    dates: "Sep 23 – Oct 22",
    element: "Air",
    modality: "Cardinal",
    ruler: "Venus",
    body:
      "Symmetrical features, balanced proportions, classically attractive. Tennis, dance, partnered sports.",
    personality:
      "Diplomatic, fairness-driven, aesthetic, partnership-oriented. The room's natural mediator.",
    shadow: "Indecision, conflict avoidance, people-pleasing, vanity.",
    love: "Romantic to the bone. Needs partnership; not built for prolonged solitude.",
    career: "Diplomats, lawyers, designers, fashion, hospitality, mediators, art dealers.",
    notable: "Will Smith, Kim Kardashian, John Lennon, Gwyneth Paltrow."
  },
  {
    sign: "Scorpio",
    symbol: "♏",
    dates: "Oct 23 – Nov 21",
    element: "Water",
    modality: "Fixed",
    ruler: "Pluto / Mars",
    body:
      "Intense gaze, magnetic features, often striking eyebrows. Built for endurance, swimming, deep-sea sports, MMA.",
    personality:
      "Penetrating, all-or-nothing, deeply private. Sees through you in 3 seconds and won't tell you what they saw.",
    shadow: "Vengeful, jealous, controlling, secretive to the point of paranoia.",
    love: "Total devotion or total cut-off. There is no middle. Sex is sacred and serious.",
    career: "Detectives, surgeons, psychologists, intelligence operatives, traders, crypto, occult / metaphysical work.",
    notable: "Pablo Picasso, Hillary Clinton, Bill Gates, Drake."
  },
  {
    sign: "Sagittarius",
    symbol: "♐",
    dates: "Nov 22 – Dec 21",
    element: "Fire",
    modality: "Mutable",
    ruler: "Jupiter",
    body:
      "Tall, long-limbed, athletic. Built for distance running, horseback, archery, expansive movement.",
    personality:
      "Optimistic, philosophical, freedom-loving, born traveller. Believes life is to be expanded, not curated.",
    shadow: "Tactless, restless, abandons commitments, preachy.",
    love: "Adventure partners. Will not tolerate cages. Best with someone who travels with them.",
    career: "Travel writers, philosophers, foreign correspondents, professors, athletes, founders of cross-border businesses.",
    notable: "Taylor Swift, Brad Pitt, Bruce Lee, Walt Disney."
  },
  {
    sign: "Capricorn",
    symbol: "♑",
    dates: "Dec 22 – Jan 19",
    element: "Earth",
    modality: "Cardinal",
    ruler: "Saturn",
    body:
      "Lean, structured, often a sharp jaw and serious expression. Endurance athletes, mountaineers, long-distance runners.",
    personality:
      "Disciplined, ambitious, long-game thinker. Ages in reverse — heavier when young, lighter as they win.",
    shadow: "Coldness, workaholism, status-anxiety, dismissive of softer signs.",
    love: "Slow-build, deeply loyal once committed, builds a kingdom for two.",
    career: "Executives, statesmen, architects, surgeons, trial lawyers, financiers.",
    notable: "Martin Luther King Jr., Elvis Presley, Michelle Obama, Denzel Washington."
  },
  {
    sign: "Aquarius",
    symbol: "♒",
    dates: "Jan 20 – Feb 18",
    element: "Air",
    modality: "Fixed",
    ruler: "Saturn / Uranus",
    body:
      "Quirky, often unusually angular features, striking in a non-classical way. Built for unconventional movement — climbing, parkour, skating.",
    personality: "Visionary, humanitarian, contrarian, builds the future. Lives a decade ahead of their peers.",
    shadow: "Emotionally detached, contrarian for sport, intellectual snobbery.",
    love: "Friendship-first; needs intellectual partnership. Will not tolerate possessiveness.",
    career: "Tech founders, scientists, futurists, social-movement architects, designers, astrologers themselves.",
    notable: "Oprah Winfrey, Bob Marley, Abraham Lincoln, Galileo Galilei."
  },
  {
    sign: "Pisces",
    symbol: "♓",
    dates: "Feb 19 – Mar 20",
    element: "Water",
    modality: "Mutable",
    ruler: "Jupiter / Neptune",
    body:
      "Soft features, large eyes, expressive hands and feet (Pisces classically rules the feet). Built for water sports — swimming, surfing, dance, yoga.",
    personality: "Empathic, dreamy, artistic, spiritually attuned. Walks between worlds.",
    shadow: "Escapism, addiction risk, lack of boundaries, victim cycles.",
    love: "Soul-mate energy, blurred boundaries, deeply romantic, needs a grounded partner to anchor them.",
    career: "Artists, musicians, healers, mystics, photographers, hospice workers, perfumers, marine biologists.",
    notable: "Albert Einstein, Rihanna, Steve Jobs, Kurt Cobain."
  }
];
