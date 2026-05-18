"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { TradeRow } from "@/lib/supabase/types";
import {
  performanceByLunarPhase,
  type LunarPhasePerformance
} from "@/lib/analytics/deep-stats";
import { formatNumber } from "@/lib/utils";

export function LunarPerformance({ trades }: { trades: TradeRow[] }) {
  const phases = useMemo(() => performanceByLunarPhase(trades), [trades]);
  const best = useMemo(
    () => phases.reduce<LunarPhasePerformance | null>((b, p) => (!b || p.netPnl > b.netPnl ? p : b), null),
    [phases]
  );

  return (
    <div className="space-y-4">
      {/* 4-card grid — one per pair of phases (waxing/waning pairs) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phases.map((p) => (
          <PhaseCard key={p.phase} phase={p} isBest={best?.phase === p.phase && p.trades > 0} />
        ))}
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by lunar phase</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-fg-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Phase</th>
                  <th className="px-3 py-2 font-medium text-right">Trades</th>
                  <th className="px-3 py-2 font-medium text-right">Wins</th>
                  <th className="px-3 py-2 font-medium text-right">Losses</th>
                  <th className="px-3 py-2 font-medium text-right">Win %</th>
                  <th className="px-3 py-2 font-medium text-right">Net P&L</th>
                  <th className="px-3 py-2 font-medium text-right">Avg P&L</th>
                  <th className="px-3 py-2 font-medium text-right">PF</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr
                    key={p.phase}
                    className="border-b border-line/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-1.5 text-base">{p.glyph}</span>
                      {p.phase}
                    </td>
                    <td className="px-3 py-2 text-right">{p.trades}</td>
                    <td className="px-3 py-2 text-right text-success">{p.wins}</td>
                    <td className="px-3 py-2 text-right text-danger">{p.losses}</td>
                    <td className="px-3 py-2 text-right">
                      {p.trades > 0 ? formatNumber(p.winRate, 1) + "%" : "\u2014"}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${p.netPnl >= 0 ? "text-success" : "text-danger"}`}>
                      {p.trades > 0 ? formatNumber(p.netPnl, 2) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.trades > 0 ? formatNumber(p.avgPnl, 2) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.trades > 0 ? formatNumber(p.profitFactor, 2) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Moon timeline */}
      <Card>
        <CardHeader><CardTitle>Lunar cycle timeline</CardTitle></CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-1 py-2">
            {phases.map((p) => {
              const maxTrades = Math.max(...phases.map((x) => x.trades), 1);
              const barH = Math.max(8, (p.trades / maxTrades) * 80);
              return (
                <div key={p.phase} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-2xl">{p.glyph}</div>
                  <div
                    className={`w-full max-w-[2rem] rounded-t ${p.netPnl >= 0 ? "bg-success/60" : "bg-danger/60"}`}
                    style={{ height: `${barH}px` }}
                  />
                  <div className="text-[9px] text-fg-subtle text-center leading-tight">
                    {p.phase.split(" ").map((w, i) => <div key={i}>{w}</div>)}
                  </div>
                  <div className="text-[10px] font-medium text-fg-muted">{p.trades}</div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PhaseCard({ phase, isBest }: { phase: LunarPhasePerformance; isBest: boolean }) {
  return (
    <Card className={isBest ? "ring-1 ring-brand-400/50" : ""}>
      <CardBody className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{phase.glyph}</span>
          <div>
            <div className="text-xs font-medium text-fg">{phase.phase}</div>
            {isBest && <div className="text-[10px] text-brand-300">Best phase</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-[10px] text-fg-subtle">Trades</div>
            <div className="text-sm font-semibold">{phase.trades}</div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">Win %</div>
            <div className="text-sm font-semibold">
              {phase.trades > 0 ? formatNumber(phase.winRate, 1) + "%" : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">Net P&L</div>
            <div className={`text-sm font-semibold ${phase.netPnl >= 0 ? "text-success" : "text-danger"}`}>
              {phase.trades > 0 ? formatNumber(phase.netPnl, 2) : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">PF</div>
            <div className="text-sm font-semibold">
              {phase.trades > 0 ? formatNumber(phase.profitFactor, 2) : "\u2014"}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
