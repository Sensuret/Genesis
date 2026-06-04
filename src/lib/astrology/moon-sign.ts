import { westernZodiac, type WesternSign } from "@/lib/numerology";

const SIGNS: WesternSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

/** Reference new moon (2000-01-06 18:14 UTC) — same epoch as moon phase engine. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH = 29.530588853;

/**
 * Approximate moon sign from date + local birth time.
 * Accurate to roughly one sign for civil / journal use.
 */
export function approximateMoonSign(dob: string, timeOfBirth: string): WesternSign | null {
  if (!dob || !timeOfBirth) return null;
  const [hh, mm] = timeOfBirth.split(":").map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const local = new Date(`${dob}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
  if (Number.isNaN(local.getTime())) return null;

  const days = (local.getTime() - REFERENCE_NEW_MOON_MS) / 86_400_000;
  const cycle = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  // Moon moves ~13.2° per day → full zodiac in ~27.3 days from new moon at 0° Aries proxy.
  const moonLongitude = (cycle / SYNODIC_MONTH) * 360;
  const idx = Math.floor(moonLongitude / 30) % 12;
  return SIGNS[idx];
}

/** Rough rising sign estimate — needs birth place for real accuracy; uses time-only heuristic. */
export function approximateAscendantHint(
  dob: string,
  timeOfBirth: string,
  sunSign: WesternSign
): string | null {
  if (!timeOfBirth) return null;
  const [hh] = timeOfBirth.split(":").map(Number);
  if (!Number.isFinite(hh)) return null;
  const sunIdx = SIGNS.indexOf(sunSign);
  if (sunIdx < 0) return null;
  // Each ~2 hours shifts ascendant ~1 sign (very rough, no latitude).
  const ascIdx = (sunIdx + Math.floor(hh / 2)) % 12;
  return `${SIGNS[ascIdx]} (approx — add birthplace for exact rising)`;
}
