"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { lunarForecast, moonPhase, moonTradeNote } from "@/lib/astrology";

type Props = {
  /** Date the moon phase should be computed for. Defaults to today. */
  date?: Date;
  /** When true, hide the trading-specific note (used in General Knowledge). */
  hideTradeNote?: boolean;
};

export function MoonWidget({ date, hideTradeNote }: Props = {}) {
  const target = useMemo(() => date ?? new Date(), [date]);
  const { phase, illumination, emoji } = moonPhase(target);
  const forecast = useMemo(() => lunarForecast(7, target), [target]);
  const isToday = !date || sameDay(date, new Date());

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-fg-muted">
            {isToday ? "Current Moon Cycle" : "Moon Cycle"}
          </div>
          <div className="mt-1 text-xl font-semibold">{phase}</div>
          <div className="mt-1 text-xs text-fg-subtle">
            {(illumination * 100).toFixed(0)}% illumination
            {!isToday && (
              <>
                {" · "}
                {target.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </>
            )}
          </div>
        </div>
        <div className="text-5xl">{emoji}</div>
      </div>
      {!hideTradeNote && (
        <div className="mb-3 rounded-xl border border-line bg-bg-soft/60 p-3 text-xs text-fg-muted">
          {moonTradeNote(phase)}
        </div>
      )}
      <div className="flex justify-between">
        {forecast.map((f) => (
          <div key={f.date} className="text-center">
            <div className="text-base">{f.emoji}</div>
            <div className="mt-1 text-[10px] text-fg-subtle">
              {new Date(f.date).toLocaleDateString("en-US", { weekday: "short" })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
