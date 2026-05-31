"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import type { GsScoreInputs } from "@/lib/analytics";

export function GsScoreRadar({ parts, score }: { parts: GsScoreInputs; score: number }) {
  const data = [
    { metric: "Win %", value: clamp(parts.winPct / 70 * 100) },
    { metric: "Profit factor", value: clamp((parts.profitFactor - 1) / 2 * 100) },
    { metric: "Avg win/loss", value: clamp(parts.avgWinLoss / 2.5 * 100) },
    { metric: "Recovery", value: clamp(parts.recoveryFactor / 5 * 100) },
    { metric: "Drawdown", value: clamp(100 - parts.maxDrawdown / 1000) },
    { metric: "Consistency", value: clamp(parts.consistency) }
  ];

  return (
    <div className="relative h-64">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="rgba(127,127,150,0.25)" />
          <PolarAngleAxis dataKey="metric" stroke="rgb(130 130 150)" fontSize={11} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Radar name="GS" dataKey="value" stroke="rgb(168 102 255)" fill="rgb(138 58 255)" fillOpacity={0.45} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 -bottom-1 text-center">
        <div className="text-2xl font-semibold tracking-tight text-brand-300">{score}</div>
      </div>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}
