"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionWindowStyle } from "@/lib/preferences/session-window";

/**
 * Trade settings subsection. Houses preferences that affect how trades
 * are displayed and grouped. Currently:
 *
 *   - Session-window style (Forex hours vs NYSE hours) — controls the
 *     bracket times shown on the Streaks page and any session-grouped
 *     analytics. Stored per-device in localStorage so it switches
 *     instantly without a server round-trip.
 *
 * More toggles (lot-size display, time-of-day grouping, asset-class
 * defaults, etc.) land here as the app grows.
 */
export function TradeSettingsSection() {
  const [style, setStyle] = useSessionWindowStyle();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session windows</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-fg-muted">
            Controls the time ranges shown in the Streaks page session brackets
            (NEWYORK / LONDON / ASIA / SYDNEY). Forex hours reflect when interbank
            FX desks are open and prices move; NYSE hours reflect the underlying
            stock exchanges. <span className="text-fg-subtle">(Default: Forex.)</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                style === "forex"
                  ? "border-brand-400 bg-brand-500/10 text-fg"
                  : "border-line bg-bg-soft text-fg-muted hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name="session-style"
                checked={style === "forex"}
                onChange={() => setStyle("forex")}
                className="mr-2"
              />
              <span className="font-medium">Forex hours</span>
              <span className="ml-2 text-fg-subtle">
                NY 12:00–21:00 UTC · London 07:00–12:00 · Asia 00:00–07:00 · Sydney 21:00–24:00
              </span>
            </label>
            <label
              className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                style === "nyse"
                  ? "border-brand-400 bg-brand-500/10 text-fg"
                  : "border-line bg-bg-soft text-fg-muted hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name="session-style"
                checked={style === "nyse"}
                onChange={() => setStyle("nyse")}
                className="mr-2"
              />
              <span className="font-medium">NYSE hours</span>
              <span className="ml-2 text-fg-subtle">
                NYSE 13:30–20:00 UTC · LSE 07:00–15:30 · Tokyo/ASX 00:00–06:00
              </span>
            </label>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
