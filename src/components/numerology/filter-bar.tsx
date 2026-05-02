"use client";

import { X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { MultiDropdown } from "./multi-dropdown";
import { ALL_SIGNS } from "@/lib/astrology";
import {
  type ChineseSign,
  type NumerologySnapshot,
  type WesternSign
} from "@/lib/numerology";
import { hasActiveFilters, type NumFilters } from "@/lib/numerology/filters";

const ALL_CHINESE: ChineseSign[] = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

const NUMBERS_1_9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const NUMBERS_1_31 = Array.from({ length: 31 }, (_, i) => i + 1);
const MASTER_NUMBERS = [11, 22, 33];

const DESTINY_OPTIONS = [...NUMBERS_1_9, ...MASTER_NUMBERS].map((n) => ({
  value: n,
  label: String(n)
}));

const RELATIONSHIPS = [
  "Family", "Friend", "Ex", "Potential", "Business", "Partner",
  "Politician", "Forex G", "Crypto G", "Ecom G", "Cousin", "Crush", "Niece", "Nephew"
];

type FilterBarProps = {
  filters: NumFilters;
  onChange: (next: NumFilters) => void;
  /** Used to show "Enemy / Compatible" toggles next to the user's own Chinese sign. */
  selfSnap: NumerologySnapshot | null;
};

export function FilterBar({ filters, onChange, selfSnap }: FilterBarProps) {
  function set<K extends keyof NumFilters>(k: K, v: NumFilters[K]) {
    onChange({ ...filters, [k]: v });
  }

  const active = hasActiveFilters(filters);

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-bg-soft/40 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label className="text-[11px] text-fg-subtle">Search by name / nickname</Label>
          <Input
            value={filters.search ?? ""}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Type to filter…"
          />
        </div>
        <div>
          <Label className="text-[11px] text-fg-subtle">DOB from</Label>
          <Input
            type="date"
            value={filters.dobFrom ?? ""}
            onChange={(e) => set("dobFrom", e.target.value || undefined)}
            className="w-[150px]"
          />
        </div>
        <div>
          <Label className="text-[11px] text-fg-subtle">DOB to</Label>
          <Input
            type="date"
            value={filters.dobTo ?? ""}
            onChange={(e) => set("dobTo", e.target.value || undefined)}
            className="w-[150px]"
          />
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="ml-auto inline-flex items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-xs text-fg-muted hover:border-danger hover:text-danger"
          >
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <MultiDropdown
          label="Relationship"
          emptyLabel="Any relationship"
          options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
          selected={filters.relationships ?? []}
          onChange={(v) => set("relationships", v)}
        />
        <MultiDropdown
          label="Life Path"
          emptyLabel="Any life path"
          options={DESTINY_OPTIONS}
          selected={filters.lifePath ?? []}
          onChange={(v) => set("lifePath", v)}
        />
        <MultiDropdown
          label="Destiny"
          emptyLabel="Any destiny"
          options={DESTINY_OPTIONS}
          selected={filters.destiny ?? []}
          onChange={(v) => set("destiny", v)}
        />
        <MultiDropdown
          label="Soul Urge"
          emptyLabel="Any soul urge"
          options={DESTINY_OPTIONS}
          selected={filters.soulUrge ?? []}
          onChange={(v) => set("soulUrge", v)}
        />
        <MultiDropdown
          label="Birthday #"
          emptyLabel="Any day"
          options={NUMBERS_1_31.map((n) => ({ value: n, label: String(n) }))}
          selected={filters.birthday ?? []}
          onChange={(v) => set("birthday", v)}
        />
        <MultiDropdown<WesternSign>
          label="Western Zodiac"
          emptyLabel="Any sign"
          options={ALL_SIGNS.map((s) => ({ value: s, label: s }))}
          selected={filters.western ?? []}
          onChange={(v) => set("western", v)}
        />
        <MultiDropdown<ChineseSign>
          label="Chinese Zodiac"
          emptyLabel="Any sign"
          options={ALL_CHINESE.map((s) => ({ value: s, label: s }))}
          selected={filters.chinese ?? []}
          onChange={(v) => set("chinese", v)}
        />
        <MultiDropdown
          label="Personal Year"
          emptyLabel="Any cycle"
          options={DESTINY_OPTIONS}
          selected={filters.personalYear ?? []}
          onChange={(v) => set("personalYear", v)}
        />
      </div>

      {selfSnap && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2 text-xs">
          <span className="text-fg-subtle">Quick filters:</span>
          <button
            type="button"
            onClick={() =>
              set("partnerCompatibleOnly", !filters.partnerCompatibleOnly)
            }
            className={`rounded-full border px-3 py-1 transition ${
              filters.partnerCompatibleOnly
                ? "border-success/40 bg-success/15 text-success"
                : "border-line bg-bg-soft text-fg-muted hover:border-success/30"
            }`}
            title="Filter to people whose Chinese sign sits in your trine triangle"
          >
            Partner-compatible only ({selfSnap.chinese} trine)
          </button>
          <button
            type="button"
            onClick={() => set("chineseEnemyOnly", !filters.chineseEnemyOnly)}
            className={`rounded-full border px-3 py-1 transition ${
              filters.chineseEnemyOnly
                ? "border-danger/40 bg-danger/15 text-danger"
                : "border-line bg-bg-soft text-fg-muted hover:border-danger/30"
            }`}
            title={`Filter to people whose Chinese sign is your enemy sign (${selfSnap.enemyChinese})`}
          >
            Enemy sign only ({selfSnap.enemyChinese})
          </button>
        </div>
      )}
    </div>
  );
}
