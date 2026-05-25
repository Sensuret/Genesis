"use client";

import { useMemo } from "react";
import { westernZodiac } from "@/lib/numerology";

// ── Zodiac segments ──────────────────────────────────────────────────

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const SIGN_TO_INDEX: Record<string, number> = {};
for (let i = 0; i < SIGN_NAMES.length; i++) {
  SIGN_TO_INDEX[SIGN_NAMES[i]] = i;
}

// ── Planet glyphs + rough longitude from sign ────────────────────────

type PlanetPlacement = { name: string; glyph: string; sign: string | null; longitude: number };

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "\u2609",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u2645",
  Neptune: "\u2646",
  Pluto: "\u2647"
};

function signToLongitude(sign: string | null, offset = 15): number {
  if (!sign) return -1;
  const idx = SIGN_TO_INDEX[sign];
  if (idx === undefined) return -1;
  return idx * 30 + offset;
}

function lookupSign(
  ingresses: Array<[number, string]>,
  year: number
): string | null {
  let result: string | null = null;
  for (const [threshold, sign] of ingresses) {
    if (year >= threshold) result = sign;
    else break;
  }
  return result;
}

// Abbreviated ingress tables — same data as src/lib/numerology/index.ts
// but kept minimal. The full tables live in the numerology engine; here
// we only need enough granularity to place the glyph in the correct
// 30-degree segment.

const JUPITER_INGRESSES: Array<[number, string]> = [
  [1900.05,"Sagittarius"],[1901,"Capricorn"],[1902.05,"Aquarius"],[1903.15,"Pisces"],
  [1904.18,"Aries"],[1905.18,"Taurus"],[1906.3,"Gemini"],[1907.4,"Cancer"],
  [1908.5,"Leo"],[1909.55,"Virgo"],[1910.55,"Libra"],[1911.7,"Scorpio"],
  [1912.85,"Sagittarius"],[1913.95,"Capricorn"],[1915.05,"Aquarius"],[1916.13,"Pisces"],
  [1917.13,"Aries"],[1918.13,"Taurus"],[1919.25,"Gemini"],[1920.4,"Cancer"],
  [1921.5,"Leo"],[1922.6,"Virgo"],[1923.65,"Libra"],[1924.65,"Scorpio"],
  [1925.85,"Sagittarius"],[1926.95,"Capricorn"],[1928.05,"Aquarius"],[1929.07,"Pisces"],
  [1930.05,"Aries"],[1931.05,"Taurus"],[1932.25,"Gemini"],[1933.35,"Cancer"],
  [1934.45,"Leo"],[1935.55,"Virgo"],[1936.6,"Libra"],[1937.85,"Scorpio"],
  [1938.93,"Sagittarius"],[1940,"Capricorn"],[1941.05,"Aquarius"],[1942.05,"Pisces"],
  [1943.05,"Aries"],[1944.05,"Taurus"],[1945.25,"Gemini"],[1946.4,"Cancer"],
  [1947.55,"Leo"],[1948.6,"Virgo"],[1949.6,"Libra"],[1950.7,"Scorpio"],
  [1951.85,"Sagittarius"],[1952.95,"Capricorn"],[1954,"Aquarius"],[1955.05,"Pisces"],
  [1956.05,"Aries"],[1957.05,"Taurus"],[1958.18,"Gemini"],[1959.3,"Cancer"],
  [1960.45,"Leo"],[1961.55,"Virgo"],[1962.6,"Libra"],[1963.65,"Scorpio"],
  [1964.85,"Sagittarius"],[1965.95,"Capricorn"],[1967.05,"Aquarius"],[1968.05,"Pisces"],
  [1969.05,"Aries"],[1970.05,"Taurus"],[1971.18,"Gemini"],[1972.35,"Cancer"],
  [1973.4,"Leo"],[1974.5,"Virgo"],[1975.55,"Libra"],[1976.7,"Scorpio"],
  [1977.85,"Sagittarius"],[1978.95,"Capricorn"],[1980.05,"Aquarius"],[1981.05,"Pisces"],
  [1982.05,"Aries"],[1983.05,"Taurus"],[1984.15,"Gemini"],[1985.25,"Cancer"],
  [1986.35,"Leo"],[1987.45,"Virgo"],[1988.55,"Libra"],[1989.6,"Scorpio"],
  [1990.75,"Sagittarius"],[1991.8,"Capricorn"],[1993,"Aquarius"],[1994.05,"Pisces"],
  [1995.05,"Aries"],[1996.05,"Taurus"],[1997.1,"Gemini"],[1998.2,"Cancer"],
  [1999.3,"Leo"],[2000.4,"Virgo"],[2001.5,"Libra"],[2002.55,"Scorpio"],
  [2003.7,"Sagittarius"],[2004.8,"Capricorn"],[2005.85,"Aquarius"],[2006,"Pisces"],
  [2007.05,"Aries"],[2008.05,"Taurus"],[2009.05,"Gemini"],[2010.15,"Cancer"],
  [2011.25,"Leo"],[2012.35,"Virgo"],[2013.4,"Libra"],[2014.45,"Scorpio"],
  [2015.6,"Sagittarius"],[2016.7,"Capricorn"],[2017.85,"Aquarius"],[2018.95,"Pisces"],
  [2019.1,"Aries"],[2020.1,"Taurus"],[2021,"Gemini"],[2022.1,"Cancer"],
  [2023.15,"Leo"],[2024.3,"Virgo"],[2025.35,"Libra"],[2026.4,"Scorpio"]
];

const SATURN_INGRESSES: Array<[number, string]> = [
  [1900,"Sagittarius"],[1903,"Aquarius"],[1906,"Pisces"],[1908.5,"Aries"],
  [1911,"Taurus"],[1913.5,"Gemini"],[1915,"Cancer"],[1917,"Leo"],
  [1919.5,"Virgo"],[1921.7,"Libra"],[1924,"Scorpio"],[1926.5,"Sagittarius"],
  [1929,"Capricorn"],[1932,"Aquarius"],[1935,"Pisces"],[1937.5,"Aries"],
  [1940,"Taurus"],[1942.5,"Gemini"],[1944.5,"Cancer"],[1946.5,"Leo"],
  [1948.8,"Virgo"],[1951,"Libra"],[1953.5,"Scorpio"],[1956,"Sagittarius"],
  [1959,"Capricorn"],[1962,"Aquarius"],[1964.5,"Pisces"],[1967,"Aries"],
  [1969,"Taurus"],[1971.5,"Gemini"],[1973.5,"Cancer"],[1975.5,"Leo"],
  [1977.5,"Virgo"],[1980,"Libra"],[1982.5,"Scorpio"],[1985,"Sagittarius"],
  [1988,"Capricorn"],[1991,"Aquarius"],[1993.5,"Pisces"],[1996,"Aries"],
  [1998.5,"Taurus"],[2000.5,"Gemini"],[2003,"Cancer"],[2005.5,"Leo"],
  [2007.5,"Virgo"],[2009.5,"Libra"],[2012.5,"Scorpio"],[2015,"Sagittarius"],
  [2017.5,"Capricorn"],[2020,"Aquarius"],[2023,"Pisces"],[2025.5,"Aries"]
];

const URANUS_INGRESSES: Array<[number, string]> = [
  [1900,"Sagittarius"],[1904.8,"Capricorn"],[1912,"Aquarius"],[1919.5,"Pisces"],
  [1927.5,"Aries"],[1934.5,"Taurus"],[1942,"Gemini"],[1949,"Cancer"],
  [1956,"Leo"],[1962,"Virgo"],[1969,"Libra"],[1975,"Scorpio"],
  [1981,"Sagittarius"],[1988,"Capricorn"],[1996,"Aquarius"],[2003.5,"Pisces"],
  [2011,"Aries"],[2019,"Taurus"],[2026,"Gemini"]
];

const NEPTUNE_INGRESSES: Array<[number, string]> = [
  [1900,"Gemini"],[1902,"Cancer"],[1915,"Leo"],[1929,"Virgo"],
  [1943,"Libra"],[1957,"Scorpio"],[1970,"Sagittarius"],[1984,"Capricorn"],
  [1998,"Aquarius"],[2012,"Pisces"],[2026,"Aries"]
];

const PLUTO_INGRESSES: Array<[number, string]> = [
  [1882,"Gemini"],[1914,"Cancer"],[1939,"Leo"],[1957,"Virgo"],
  [1972,"Libra"],[1984,"Scorpio"],[1995,"Sagittarius"],[2008,"Capricorn"],
  [2024,"Aquarius"]
];

function computePlacements(dob: string): PlanetPlacement[] {
  const d = new Date(`${dob}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return [];

  const y = d.getUTCFullYear();
  const startOfYear = Date.UTC(y, 0, 1);
  const startOfNext = Date.UTC(y + 1, 0, 1);
  const yearDecimal = y + (d.getTime() - startOfYear) / (startOfNext - startOfYear);

  const sunSign: string | null = westernZodiac(dob) ?? null;
  const sunLong = signToLongitude(sunSign, 15);

  const placements: PlanetPlacement[] = [];

  if (sunLong >= 0) {
    placements.push({ name: "Sun", glyph: PLANET_GLYPHS.Sun, sign: sunSign, longitude: sunLong });
  }

  const jupSign = lookupSign(JUPITER_INGRESSES, yearDecimal);
  if (jupSign) placements.push({ name: "Jupiter", glyph: PLANET_GLYPHS.Jupiter, sign: jupSign, longitude: signToLongitude(jupSign) });

  const satSign = lookupSign(SATURN_INGRESSES, yearDecimal);
  if (satSign) placements.push({ name: "Saturn", glyph: PLANET_GLYPHS.Saturn, sign: satSign, longitude: signToLongitude(satSign) });

  const uraSign = lookupSign(URANUS_INGRESSES, yearDecimal);
  if (uraSign) placements.push({ name: "Uranus", glyph: PLANET_GLYPHS.Uranus, sign: uraSign, longitude: signToLongitude(uraSign) });

  const nepSign = lookupSign(NEPTUNE_INGRESSES, yearDecimal);
  if (nepSign) placements.push({ name: "Neptune", glyph: PLANET_GLYPHS.Neptune, sign: nepSign, longitude: signToLongitude(nepSign) });

  const pluSign = lookupSign(PLUTO_INGRESSES, yearDecimal);
  if (pluSign) placements.push({ name: "Pluto", glyph: PLANET_GLYPHS.Pluto, sign: pluSign, longitude: signToLongitude(pluSign) });

  return placements;
}

// ── Aspect detection ─────────────────────────────────────────────────

type Aspect = { planet1: string; planet2: string; kind: string; glyph: string };

const ASPECT_DEFS = [
  { name: "Conjunction", angle: 0, orb: 10, glyph: "\u260C" },
  { name: "Sextile", angle: 60, orb: 8, glyph: "\u26B9" },
  { name: "Square", angle: 90, orb: 8, glyph: "\u25A1" },
  { name: "Trine", angle: 120, orb: 8, glyph: "\u25B3" },
  { name: "Opposition", angle: 180, orb: 10, glyph: "\u260D" },
];

function computeAspects(placements: PlanetPlacement[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFS) {
        if (Math.abs(diff - def.angle) <= def.orb) {
          aspects.push({ planet1: a.name, planet2: b.name, kind: def.name, glyph: def.glyph });
          break;
        }
      }
    }
  }
  return aspects;
}

// ── SVG helpers ──────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Component ────────────────────────────────────────────────────────

export function NatalChartWheel({
  dob,
  fullName,
  className
}: {
  dob: string;
  fullName: string;
  className?: string;
}) {
  const placements = useMemo(() => computePlacements(dob), [dob]);
  const aspects = useMemo(() => computeAspects(placements), [placements]);

  if (!placements.length) return null;

  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 235;
  const bandInnerR = 190;
  const glyphR = 172;
  const innerR = 152;
  const labelR = 213;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto w-full max-w-[500px]"
        role="img"
        aria-label={`Natal chart wheel for ${fullName}`}
      >
        {/* Outer black band */}
        <circle cx={cx} cy={cy} r={outerR} fill="#1a1a1a" />
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#555" strokeWidth={2} />

        {/* White ring between outer band and inner circle */}
        <circle cx={cx} cy={cy} r={bandInnerR} fill="#d4d4d4" />

        {/* Inner black circle */}
        <circle cx={cx} cy={cy} r={innerR} fill="#111" />

        {/* Ring borders */}
        <circle cx={cx} cy={cy} r={bandInnerR} fill="none" stroke="#888" strokeWidth={0.5} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#666" strokeWidth={0.5} />

        {/* Segment divider lines from inner circle to outer edge */}
        {SIGN_NAMES.map((_, i) => {
          const angle = (345 - i * 30 + 360) % 360;
          const iP = polarToXY(cx, cy, innerR, angle);
          const oP = polarToXY(cx, cy, outerR, angle);
          return (
            <line
              key={`div-${i}`}
              x1={iP.x} y1={iP.y}
              x2={oP.x} y2={oP.y}
              stroke="#777"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Sign names on the outer black band */}
        {SIGN_NAMES.map((name, i) => {
          const midAngle = (360 - i * 30) % 360;
          const pos = polarToXY(cx, cy, labelR, midAngle);
          const inBottom = midAngle > 90 && midAngle < 270;
          const rot = inBottom ? midAngle + 180 : midAngle;
          return (
            <text
              key={name}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={11}
              fontWeight={700}
              fontFamily="sans-serif"
              letterSpacing={1.5}
              transform={`rotate(${rot}, ${pos.x}, ${pos.y})`}
            >
              {name.toUpperCase()}
            </text>
          );
        })}

        {/* Planet glyphs on the white ring */}
        {placements.map((p) => {
          const wheelAngle = ((15 - p.longitude) % 360 + 360) % 360;
          const pos = polarToXY(cx, cy, glyphR, wheelAngle);
          return (
            <text
              key={p.name}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#111"
              fontSize={18}
              fontWeight={700}
            >
              {p.glyph}
            </text>
          );
        })}

        {/* Planetary alignments in centre */}
        {aspects.length > 0 && (
          <g>
            <text
              x={cx}
              y={cy - (aspects.length * 7)}
              textAnchor="middle"
              fill="#aaa"
              fontSize={9}
              fontWeight={600}
              letterSpacing={1}
            >
              ALIGNMENTS
            </text>
            {aspects.slice(0, 8).map((a, i) => (
              <text
                key={`${a.planet1}-${a.planet2}`}
                x={cx}
                y={cy - (aspects.length * 7) + 14 + i * 13}
                textAnchor="middle"
                fill="#ccc"
                fontSize={8}
                fontFamily="sans-serif"
              >
                {a.planet1} {a.glyph} {a.planet2}
              </text>
            ))}
          </g>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-fg-subtle">
        {placements.map((p) => (
          <span key={p.name}>
            {p.glyph} {p.name} in {p.sign}
          </span>
        ))}
      </div>
    </div>
  );
}
