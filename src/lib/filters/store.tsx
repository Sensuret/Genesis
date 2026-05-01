"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  SEED_RATES,
  convertFromUSD,
  formatMoney,
  loadRates,
  type Rates
} from "@/lib/fx";

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
  rates: Rates;
};

const FiltersContext = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setState] = useState<AppFilters>(DEFAULT_FILTERS);
  const [rates, setRates] = useState<Rates>(SEED_RATES);

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

  // Refresh FX rates once on mount so the currency converter actually moves
  // numbers (e.g. $1 → KES 129) instead of just swapping the symbol.
  useEffect(() => {
    const ctrl = new AbortController();
    loadRates(ctrl.signal).then((live) => {
      if (live) setRates({ ...SEED_RATES, ...live });
    });
    return () => ctrl.abort();
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

  const value = useMemo(
    () => ({ filters, setFilters, reset, rates }),
    [filters, setFilters, reset, rates]
  );

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
      reset: () => {},
      rates: SEED_RATES
    };
  }
  return ctx;
}

/**
 * Returns helpers bound to the current currency filter + live FX rates.
 *
 *  - `fmt(usd)` — convert a USD-base amount and format it.
 *  - `convert(usd)` — just convert (no formatting).
 *  - `currency` — active currency code.
 */
export function useMoney() {
  const { filters, rates } = useFilters();
  const fmt = useCallback(
    (usd: number | null | undefined) => {
      if (usd === null || usd === undefined || Number.isNaN(usd)) return "—";
      return formatMoney(convertFromUSD(usd, filters.currency, rates), filters.currency);
    },
    [filters.currency, rates]
  );
  const convert = useCallback(
    (usd: number) => convertFromUSD(usd, filters.currency, rates),
    [filters.currency, rates]
  );
  return { fmt, convert, currency: filters.currency, rates };
}

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "ZAR",
  "KES"
];

export const DATE_RANGES: { id: AppFilters["dateRange"]; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
  { id: "1y", label: "Last 1 year" }
];
