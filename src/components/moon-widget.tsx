"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { lunarForecast, moonPhase, moonTradeNote } from "@/lib/astrology";

export function MoonWidget() {
  const { phase, illumination, emoji } = moonPhase();
  const forecast = useMemo(() => lunarForecast(7), []);
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-fg-muted">Current Moon Cycle</div>
          <div className="mt-1 text-xl font-semibold">{phase}</div>
          <div className="mt-1 text-xs text-fg-subtle">{(illumination * 100).toFixed(0)}% illumination</div>
        </div>
        <div className="text-5xl">{emoji}</div>
      </div>
      <div className="mb-3 rounded-xl border border-line bg-bg-soft/60 p-3 text-xs text-fg-muted">
        {moonTradeNote(phase)}
      </div>
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
