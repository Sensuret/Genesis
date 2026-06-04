import type { PhaseRules } from "@/lib/propfirm";

export type PhaseTemplate = "1" | "2" | "3";

export type StoredPropPreset = {
  template: PhaseTemplate;
  phases: PhaseRules[];
  accountSize: number;
  logoDataUrl?: string;
  lastResult?: {
    passedAll: boolean;
    failedAt?: string;
    tradingDays: number;
    updatedAt: string;
  };
};

const STORAGE_KEY = "genesis-prop-firm-presets";

export function loadPropPresets(): Record<string, StoredPropPreset> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredPropPreset>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function savePropPreset(id: string, config: StoredPropPreset) {
  if (typeof window === "undefined") return;
  const all = loadPropPresets();
  all[id] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getPropPreset(id: string): StoredPropPreset | null {
  return loadPropPresets()[id] ?? null;
}
