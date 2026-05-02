import {
  buildNumerologySnapshot,
  CHINESE_TRINE,
  type ChineseSign,
  type NumerologySnapshot
} from "@/lib/numerology";
import type { WesternSign } from "@/lib/numerology";
import type {
  NumerologyOtherRow,
  NumerologyProfileRow
} from "@/lib/supabase/types";

/** Stable, ordered representation of every numerology entry on the page. */
export type CombinedProfile = {
  /** Spreadsheet-style ID — "NUM1" is reserved for the user's own profile. */
  numId: string;
  source: "self" | "other";
  rowId: string;
  fullName: string;
  nicknames: string[];
  /** Empty string for self; relationship label for others. */
  relationship: string;
  dob: string;
  /** ISO timestamp the row was originally inserted. */
  createdAt: string;
  snap: NumerologySnapshot;
};

function nicknamesFromUnknown(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const v = (data as { nicknames?: unknown }).nicknames;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/**
 * Builds the combined list. The user's own profile is always assigned
 * NUM1 (per spec) and "others" follow in insertion order as NUM2, NUM3, …
 */
export function buildCombinedProfiles(
  profile: NumerologyProfileRow | null,
  others: NumerologyOtherRow[]
): CombinedProfile[] {
  const out: CombinedProfile[] = [];
  if (profile) {
    out.push({
      numId: "NUM1",
      source: "self",
      rowId: profile.id,
      fullName: profile.full_name,
      nicknames: nicknamesFromUnknown(profile.data),
      relationship: "",
      dob: profile.dob,
      createdAt: profile.created_at,
      snap: buildNumerologySnapshot(profile.full_name, profile.dob)
    });
  }
  // Sort others ascending by created_at so NUM2, NUM3, … reflect insertion order.
  const sortedOthers = [...others].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let idx = profile ? 2 : 1;
  for (const r of sortedOthers) {
    const rowNicknames = nicknamesFromUnknown(r.data);
    if (rowNicknames.length === 0 && r.nickname) rowNicknames.push(r.nickname);
    out.push({
      numId: `NUM${idx++}`,
      source: "other",
      rowId: r.id,
      fullName: r.full_name,
      nicknames: rowNicknames,
      relationship: r.relationship,
      dob: r.dob,
      createdAt: r.created_at,
      snap: buildNumerologySnapshot(r.full_name, r.dob)
    });
  }
  return out;
}

/** Filters that drive the General Num Database + Overview. */
export type NumFilters = {
  /** Free-text search across name + nicknames. */
  search?: string;
  relationships?: string[];
  lifePath?: number[];
  destiny?: number[];
  soulUrge?: number[];
  birthday?: number[];
  western?: WesternSign[];
  chinese?: ChineseSign[];
  /** Filter to people whose Chinese sign matches the user's enemy sign. */
  chineseEnemyOnly?: boolean;
  personalYear?: number[];
  /** Filter to people whose Chinese sign sits in the user's trine. */
  partnerCompatibleOnly?: boolean;
  dobFrom?: string;
  dobTo?: string;
};

export const EMPTY_FILTERS: NumFilters = {};

/**
 * Applies a NumFilters object against the combined list. The user's own
 * profile (`source === "self"`) is always kept so it stays anchored as
 * NUM1 in the table even when the filter wouldn't otherwise match.
 */
export function applyFilters(
  list: CombinedProfile[],
  filters: NumFilters,
  selfSnap: NumerologySnapshot | null
): CombinedProfile[] {
  const search = filters.search?.trim().toLowerCase();
  const enemyOf = selfSnap ? selfSnap.enemyChinese : null;
  const trine = selfSnap ? CHINESE_TRINE[selfSnap.chinese] ?? [] : [];

  return list.filter((p) => {
    if (p.source === "self") return true;

    if (search) {
      const hay = (p.fullName + " " + p.nicknames.join(" ")).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (filters.relationships?.length && !filters.relationships.includes(p.relationship)) {
      return false;
    }
    if (filters.lifePath?.length && !filters.lifePath.includes(p.snap.lifePath)) return false;
    if (filters.destiny?.length && !filters.destiny.includes(p.snap.destiny)) return false;
    if (filters.soulUrge?.length && !filters.soulUrge.includes(p.snap.soulUrge)) return false;
    if (filters.birthday?.length && !filters.birthday.includes(p.snap.birthday)) return false;
    if (filters.western?.length && !filters.western.includes(p.snap.western)) return false;
    if (filters.chinese?.length && !filters.chinese.includes(p.snap.chinese)) return false;
    if (filters.personalYear?.length && !filters.personalYear.includes(p.snap.personalYear)) {
      return false;
    }
    if (filters.chineseEnemyOnly && enemyOf && p.snap.chinese !== enemyOf) return false;
    if (filters.partnerCompatibleOnly && trine.length && !trine.includes(p.snap.chinese)) {
      return false;
    }
    if (filters.dobFrom && p.dob < filters.dobFrom) return false;
    if (filters.dobTo && p.dob > filters.dobTo) return false;
    return true;
  });
}

/** Returns true if any filter is active. Drives "X clear" chip visibility. */
export function hasActiveFilters(f: NumFilters): boolean {
  return Boolean(
    f.search ||
      f.relationships?.length ||
      f.lifePath?.length ||
      f.destiny?.length ||
      f.soulUrge?.length ||
      f.birthday?.length ||
      f.western?.length ||
      f.chinese?.length ||
      f.personalYear?.length ||
      f.chineseEnemyOnly ||
      f.partnerCompatibleOnly ||
      f.dobFrom ||
      f.dobTo
  );
}
