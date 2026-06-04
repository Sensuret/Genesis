"use client";

import { useMemo } from "react";
import { moonPhase, moonTradeNote, mercuryStatus } from "@/lib/astrology";

/**
 * Tiny one-line lunar pill — meant to live next to a page title so the
 * dashboard doesn't waste a whole row on the moon widget. Renders as:
 *
 *   🌒  Waxing Crescent · 38%  ·  "Build positions slowly…"  · ☿ Direct
 */
export function MoonInline({ date }: { date?: Date } = {}) {
  const target = useMemo(() => date ?? new Date(), [date]);
  const { phase, illumination, emoji } = moonPhase(target);
  const note = moonTradeNote(phase);
  const mercury = useMemo(() => mercuryStatus(target), [target]);
  const mercuryColour = mercury.status === "Retrograde" ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-bg-soft/60 px-3 py-1 text-xs">
      <span className="text-base leading-none" aria-hidden>{emoji}</span>
      <span className="font-medium text-fg">{phase}</span>
      <span className="text-fg-subtle">·</span>
      <span className="text-fg-muted">{(illumination * 100).toFixed(0)}%</span>
      <span className="hidden text-fg-subtle sm:inline">·</span>
      <span className="hidden truncate text-fg-muted sm:inline">{note}</span>
      <span className="hidden text-fg-subtle md:inline">·</span>
      <span className={`hidden whitespace-nowrap font-medium md:inline ${mercuryColour}`}>
        ☿ {mercury.status}
      </span>
    </div>
  );
}
