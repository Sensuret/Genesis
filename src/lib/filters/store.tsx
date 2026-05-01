"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppFilters = {
  currency: string;
  dateRange: "all" | "7d" | "30d" | "90d" | "ytd" | "1y";
  accountIds: string[]; // empty array = all
  playbookId: string | null; // null = all
};

const DEFAULT_FILTERS: AppFilters = {
  currency: "USD",
  dateRange: "all",
  accountIds: [],
  playbookId: null
};

const STORAGE_KEY = "gs.filters.v1";

type Ctx = {
  filters: AppFilters;
  setFilters: (next: Partial<AppFilters>) => void;
  reset: () => void;
};

const FiltersContext = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setState] = useState<AppFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppFilters>;
        setState({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  const setFilters = useCallback((next: Partial<AppFilters>) => {
    setState((prev) => {
      const merged = { ...prev, ...next };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
      return merged;
    });
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  const value = useMemo(() => ({ filters, setFilters, reset }), [filters, setFilters, reset]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): Ctx {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    // The TopBar lives outside individual page trees; if a page is rendered in
    // isolation (e.g. a test) we still want a no-op fallback rather than a hard
    // throw, so callers can read defaults.
    return {
      filters: DEFAULT_FILTERS,
      setFilters: () => {},
      reset: () => {}
    };
  }
  return ctx;
}

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "ZAR"];

export const DATE_RANGES: { id: AppFilters["dateRange"]; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
  { id: "1y", label: "Last 1 year" }
];
