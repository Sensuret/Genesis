"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import type { GsScoreInputs } from "@/lib/analytics";

export function GsScoreRadar({
  parts,
  score,
  radarHeight = "h-56"
}: {
  parts: GsScoreInputs;
  score: number;
  /** Tailwind height class for the radar; pass smaller values when stacked. */
  radarHeight?: string;
}) {
  const data = [
    { metric: "Win %", value: clamp(parts.winPct / 70 * 100) },
    { metric: "Profit factor", value: clamp((parts.profitFactor - 1) / 2 * 100) },
    { metric: "Avg win/loss", value: clamp(parts.avgWinLoss / 2.5 * 100) },
    { metric: "Recovery", value: clamp(parts.recoveryFactor / 5 * 100) },
    { metric: "Drawdown", value: clamp(100 - parts.maxDrawdown / 1000) },
    { metric: "Consistency", value: clamp(parts.consistency) }
  ];

  return (
    <div className="space-y-3">
      <div className={radarHeight}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid stroke="rgba(127,127,150,0.25)" />
            <PolarAngleAxis dataKey="metric" stroke="rgb(130 130 150)" fontSize={11} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar name="GS" dataKey="value" stroke="rgb(168 102 255)" fill="rgb(138 58 255)" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Horizontal Zella-style score gauge: red → yellow → green spectrum
          with a thumb marker showing where the current score falls. */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-fg-muted">Your GS Score</span>
          <span className="text-2xl font-semibold tracking-tight text-brand-300">{score}</span>
        </div>
        <div className="relative flex-1">
          <div
            className="h-2 w-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(239 68 68) 0%, rgb(234 179 8) 50%, rgb(34 197 94) 100%)"
            }}
          />
          <div
            className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-fg shadow-card"
            style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
            aria-hidden
          />
          <div className="mt-1 flex justify-between text-[10px] text-fg-subtle">
            <span>0</span>
            <span>20</span>
            <span>40</span>
            <span>60</span>
            <span>80</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}
