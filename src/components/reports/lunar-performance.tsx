"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { TradeRow } from "@/lib/supabase/types";
import {
  performanceByLunarPhase,
  type LunarPhasePerformance
} from "@/lib/analytics/deep-stats";
import { formatNumber } from "@/lib/utils";

type CcyFmt = (n: number | null | undefined) => string;

export function LunarPerformance({ trades, fmt: ccyFmt }: { trades: TradeRow[]; fmt: CcyFmt }) {
  const phases = useMemo(() => performanceByLunarPhase(trades), [trades]);
  const best = useMemo(
    () => phases.reduce<LunarPhasePerformance | null>((b, p) => (!b || p.netPnl > b.netPnl ? p : b), null),
    [phases]
  );
  const worst = useMemo(
    () => phases.reduce<LunarPhasePerformance | null>((w, p) => (!w || p.netPnl < w.netPnl ? p : w), null),
    [phases]
  );

  const chartData = useMemo(
    () => phases.map((p) => ({
      phase: p.phase,
      glyph: p.glyph,
      netPnl: p.netPnl,
      wins: p.wins,
      losses: p.losses,
      winRate: p.winRate,
      avgPnl: p.avgPnl
    })),
    [phases]
  );

  return (
    <div className="space-y-4">
      {/* Best / Worst cycle highlight cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {best && best.trades > 0 && (
          <CycleHighlight label="Best Lunar Cycle" phase={best} tone="success" ccyFmt={ccyFmt} />
        )}
        {worst && worst.trades > 0 && (
          <CycleHighlight label="Worst Lunar Cycle" phase={worst} tone="danger" ccyFmt={ccyFmt} />
        )}
      </div>

      {/* 4-card grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phases.map((p) => (
          <PhaseCard
            key={p.phase}
            phase={p}
            isBest={best?.phase === p.phase && p.trades > 0}
            isWorst={worst?.phase === p.phase && p.trades > 0}
            ccyFmt={ccyFmt}
          />
        ))}
      </div>

      {/* PnL by lunar phase bar chart */}
      <Card>
        <CardHeader><CardTitle>P&L by lunar phase</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="glyph" tick={{ fontSize: 16 }} />
              <YAxis tick={{ fontSize: 10 }} width={60} />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number) => ccyFmt(value)}
                labelFormatter={(_, payload) => {
                  const entry = payload?.[0]?.payload as { phase?: string } | undefined;
                  return entry?.phase ?? "";
                }}
              />
              <Bar dataKey="netPnl" name="Net P&L" fill="#0d9488" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <rect key={i} fill={entry.netPnl >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Win/Loss count by phase */}
      <Card>
        <CardHeader><CardTitle>Wins vs losses by phase</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="glyph" tick={{ fontSize: 16 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ fontSize: 11 }}
                labelFormatter={(_, payload) => {
                  const entry = payload?.[0]?.payload as { phase?: string } | undefined;
                  return entry?.phase ?? "";
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

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
                    className="border-b border-line/50 last:border-0 hover:bg-bg-soft/50"
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
                      {p.trades > 0 ? ccyFmt(p.netPnl) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.trades > 0 ? ccyFmt(p.avgPnl) : "\u2014"}
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

function CycleHighlight({ label, phase, tone, ccyFmt }: {
  label: string;
  phase: LunarPhasePerformance;
  tone: "success" | "danger";
  ccyFmt: CcyFmt;
}) {
  const ringCls = tone === "success" ? "ring-1 ring-success/40" : "ring-1 ring-danger/40";
  const labelCls = tone === "success" ? "text-success" : "text-danger";
  return (
    <Card className={ringCls}>
      <CardBody className="flex items-center gap-4 p-4">
        <span className="text-4xl">{phase.glyph}</span>
        <div className="flex-1 space-y-1">
          <div className={`text-xs font-semibold uppercase tracking-wide ${labelCls}`}>{label}</div>
          <div className="text-base font-bold text-fg">{phase.phase}</div>
          <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
            <span>{phase.trades} trades</span>
            <span>{formatNumber(phase.winRate, 1)}% win rate</span>
            <span className={phase.netPnl >= 0 ? "text-success" : "text-danger"}>
              {ccyFmt(phase.netPnl)}
            </span>
            <span>PF {formatNumber(phase.profitFactor, 2)}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PhaseCard({ phase, isBest, isWorst, ccyFmt }: {
  phase: LunarPhasePerformance;
  isBest: boolean;
  isWorst: boolean;
  ccyFmt: CcyFmt;
}) {
  const ring = isBest ? "ring-1 ring-success/50" : isWorst ? "ring-1 ring-danger/50" : "";
  return (
    <Card className={ring}>
      <CardBody className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{phase.glyph}</span>
          <div>
            <div className="text-xs font-medium text-fg">{phase.phase}</div>
            {isBest && <div className="text-[10px] text-success">Best phase</div>}
            {isWorst && <div className="text-[10px] text-danger">Worst phase</div>}
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
              {phase.trades > 0 ? ccyFmt(phase.netPnl) : "\u2014"}
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
