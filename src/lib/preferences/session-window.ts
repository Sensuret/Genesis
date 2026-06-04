"use client";

import { useEffect, useState } from "react";

/**
 * Two supported session-window styles:
 *
 *  - "forex" (default): When each region's interbank FX desks are open
 *    and forex prices are most liquid. This is what `detectSession()` in
 *    parser/index.ts buckets trades by, so it's the canonical view.
 *
 *  - "nyse":  When the major *stock exchanges* in each region are open.
 *    Useful for users who trade indices / equities and care about the
 *    cash-equity session rather than the broader FX liquidity window.
 */
export type SessionWindowStyle = "forex" | "nyse";

export type SessionWindow = { start: number; end: number };
export type SessionWindowSet = Record<string, SessionWindow>;

export const FOREX_WINDOWS_UTC: SessionWindowSet = {
  Sydney: { start: 21, end: 24 },
  Asia: { start: 0, end: 7 },
  London: { start: 7, end: 12 },
  "New York": { start: 12, end: 21 }
};

// NYSE-style hours (cash equity sessions in each region, summer DST):
//   - NYSE:    09:30–16:00 ET  → 13:30–20:00 UTC
//   - LSE:     08:00–16:30 UK  → 07:00–15:30 UTC (no DST shift here for simplicity)
//   - Tokyo:   09:00–15:00 JST → 00:00–06:00 UTC
//   - ASX:     10:00–16:00 AEST → 00:00–06:00 UTC (overlaps Tokyo by design)
export const NYSE_WINDOWS_UTC: SessionWindowSet = {
  Sydney: { start: 0, end: 6 },
  Asia: { start: 0, end: 6 },
  London: { start: 7, end: 15.5 },
  "New York": { start: 13.5, end: 20 }
};

export function getSessionWindows(style: SessionWindowStyle): SessionWindowSet {
  return style === "nyse" ? NYSE_WINDOWS_UTC : FOREX_WINDOWS_UTC;
}

const STORAGE_KEY = "genesis.sessionWindowStyle";

export function readSessionWindowStyle(): SessionWindowStyle {
  if (typeof window === "undefined") return "forex";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "nyse" ? "nyse" : "forex";
}

export function writeSessionWindowStyle(style: SessionWindowStyle): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, style);
  // Notify other tabs / components of the change so the Streaks page can
  // reflect the new style immediately when the user toggles it in Settings.
  window.dispatchEvent(new Event("genesis-session-style-change"));
}

/** React hook that exposes the current style and re-renders when it changes. */
export function useSessionWindowStyle(): [SessionWindowStyle, (s: SessionWindowStyle) => void] {
  const [style, setStyle] = useState<SessionWindowStyle>("forex");

  useEffect(() => {
    setStyle(readSessionWindowStyle());
    function onChange() {
      setStyle(readSessionWindowStyle());
    }
    window.addEventListener("genesis-session-style-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("genesis-session-style-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function update(next: SessionWindowStyle) {
    writeSessionWindowStyle(next);
    setStyle(next);
  }

  return [style, update];
}
