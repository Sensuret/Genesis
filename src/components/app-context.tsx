"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * App-wide UI state — sidebar collapsed, selected currency, selected file IDs,
 * date range. Persists to localStorage so reloads keep the user's view.
 */
export type AppState = {
  collapsed: boolean;
  currency: string;
  selectedFileIds: string[]; // empty = "All"
  dateRange: { from?: string; to?: string }; // ISO yyyy-mm-dd, empty = all-time
};

type Ctx = AppState & {
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  setCurrency: (c: string) => void;
  setSelectedFileIds: (ids: string[]) => void;
  setDateRange: (r: { from?: string; to?: string }) => void;
};

const KEY = "genesis.app.v1";

const defaultState: AppState = {
  collapsed: false,
  currency: "USD",
  selectedFileIds: [],
  dateRange: {}
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...defaultState, ...parsed });
      }
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state, hydrated]);

  const toggleCollapsed = useCallback(() => setState((s) => ({ ...s, collapsed: !s.collapsed })), []);
  const setCollapsed = useCallback((v: boolean) => setState((s) => ({ ...s, collapsed: v })), []);
  const setCurrency = useCallback((c: string) => setState((s) => ({ ...s, currency: c })), []);
  const setSelectedFileIds = useCallback(
    (ids: string[]) => setState((s) => ({ ...s, selectedFileIds: ids })),
    []
  );
  const setDateRange = useCallback(
    (r: { from?: string; to?: string }) => setState((s) => ({ ...s, dateRange: r })),
    []
  );

  const value = useMemo<Ctx>(
    () => ({ ...state, toggleCollapsed, setCollapsed, setCurrency, setSelectedFileIds, setDateRange }),
    [state, toggleCollapsed, setCollapsed, setCurrency, setSelectedFileIds, setDateRange]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within <AppProvider>");
  return ctx;
}

/** FX table — rough static rates to USD. Sufficient for display formatting; not for accounting. */
const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.26,
  JPY: 0.0066,
  AUD: 0.66,
  CAD: 0.74,
  CHF: 1.13,
  CNY: 0.14,
  INR: 0.012,
  KES: 0.0078,
  AED: 0.27,
  ZAR: 0.054
};

export const CURRENCIES = Object.keys(FX_TO_USD);

export function convertFromUSD(amountUsd: number, target: string): number {
  if (target === "USD") return amountUsd;
  const rate = FX_TO_USD[target];
  if (!rate) return amountUsd;
  return amountUsd / rate;
}

export function fxRateToUSD(currency: string): number {
  return FX_TO_USD[currency] ?? 1;
}
