"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import type { GsScoreInputs } from "@/lib/analytics";

/**
 * Triangular GS Score radar — 3 axes only (Win %, Profit Factor, Avg
 * Win/Loss). Used on the GS Insights page.
 *
 * Same scaling as the full hexagonal `GsScoreRadar`, but trims the
 * recovery / drawdown / consistency dimensions so the chart reads as a
 * clean triangle.
 */
export function GsScoreTriangle({
  parts,
  score,
  radarHeight = "h-56"
}: {
  parts: GsScoreInputs;
  score: number;
  radarHeight?: string;
}) {
  const data = [
    { metric: "Win %", value: clamp(parts.winPct / 70 * 100) },
    { metric: "Profit factor", value: clamp((parts.profitFactor - 1) / 2 * 100) },
    { metric: "Avg win/loss", value: clamp((parts.avgWinLoss - 1) / 2 * 100) }
  ];

  return (
    <div className="space-y-3">
      <div className={radarHeight}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid stroke="rgba(168, 102, 255, 0.22)" />
            <PolarAngleAxis dataKey="metric" stroke="rgb(168 102 255)" fontSize={11} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar
              name="GS"
              dataKey="value"
              stroke="rgb(168 102 255)"
              fill="rgb(138 58 255)"
              fillOpacity={0.45}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-2 text-center">
        <span className="text-sm font-medium text-fg-muted">Your GS Score</span>
        <span className="text-2xl font-semibold tracking-tight text-brand-300">{score}</span>
      </div>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}
