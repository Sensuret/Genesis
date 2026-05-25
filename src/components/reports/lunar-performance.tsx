"use client";

import { useMemo, useState } from "react";
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
  performanceByZodiacSeason,
  performanceDuringRetrograde,
  performanceByPlanetaryTransit,
  retrogradeHeatmap,
  bestCosmicWindows,
  generateCosmicInsights,
  type LunarPhasePerformance,
  type ZodiacSeasonPerformance,
  type RetroHeatmapCell,
  type TransitPerformance,
  type CosmicWindow,
  type CosmicInsight
} from "@/lib/analytics/deep-stats";
import { formatNumber } from "@/lib/utils";

type CcyFmt = (n: number | null | undefined) => string;

type SubTab = "Overview" | "Cosmic Deep Stats";

export function LunarPerformance({ trades, fmt: ccyFmt }: { trades: TradeRow[]; fmt: CcyFmt }) {
  const [subTab, setSubTab] = useState<SubTab>("Overview");

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

  const zodiacPerf = useMemo(() => performanceByZodiacSeason(trades), [trades]);
  const retroPerf = useMemo(() => performanceDuringRetrograde(trades), [trades]);
  const transitPerf = useMemo(() => performanceByPlanetaryTransit(trades), [trades]);
  const heatmapData = useMemo(() => retrogradeHeatmap(trades), [trades]);
  const cosmicWindows = useMemo(() => bestCosmicWindows(trades), [trades]);
  const insights = useMemo(() => generateCosmicInsights(trades), [trades]);

  return (
    <div className="space-y-4">
      {/* Sub-tab strip */}
      <div className="flex gap-2">
        {(["Overview", "Cosmic Deep Stats"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              subTab === t
                ? "border-brand-400 bg-brand-500/15 text-brand-200"
                : "border-line bg-bg-soft text-fg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === "Overview" && (<>
      {/* Best / Worst cycle highlight cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {best && best.trades > 0 && (
          <CycleHighlight label="Best Lunar Cycle" phase={best} tone="success" ccyFmt={ccyFmt} />
        )}
        {worst && worst.trades > 0 && (
          <CycleHighlight label="Worst Lunar Cycle" phase={worst} tone="danger" ccyFmt={ccyFmt} />
        )}
      </div>

      {/* Summary table — above charts */}
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

      {/* Wins vs losses by phase */}
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
      </>)}

      {subTab === "Cosmic Deep Stats" && (
        <CosmicDeepStatsTab
          zodiacPerf={zodiacPerf}
          retroPerf={retroPerf}
          transitPerf={transitPerf}
          heatmap={heatmapData}
          cosmicWindows={cosmicWindows}
          insights={insights}
          ccyFmt={ccyFmt}
        />
      )}
    </div>
  );
}

// -- Cosmic Deep Stats sub-tab -------------------------------------------

function CosmicDeepStatsTab({ zodiacPerf, retroPerf, transitPerf, heatmap, cosmicWindows, insights, ccyFmt }: {
  zodiacPerf: ZodiacSeasonPerformance[];
  retroPerf: ReturnType<typeof performanceDuringRetrograde>;
  transitPerf: TransitPerformance[];
  heatmap: RetroHeatmapCell[];
  cosmicWindows: CosmicWindow[];
  insights: CosmicInsight[];
  ccyFmt: CcyFmt;
}) {
  const zodiacChart = zodiacPerf.map((z) => ({
    sign: z.sign,
    glyph: z.glyph,
    netPnl: z.netPnl,
    winRate: z.winRate,
    trades: z.trades
  }));

  const transitChart = transitPerf.map((t) => ({
    transit: t.transit,
    glyph: t.glyph,
    winRate: t.winRate,
    trades: t.trades,
    netPnl: t.netPnl
  }));

  return (
    <div className="space-y-4">
      {/* Cosmic Insight Statements */}
      {insights.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cosmic insights</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    ins.tone === "positive"
                      ? "border-success/30 bg-success/5"
                      : ins.tone === "negative"
                        ? "border-danger/30 bg-danger/5"
                        : "border-line bg-bg-soft"
                  }`}
                >
                  <span className="text-xl leading-none">{ins.icon}</span>
                  <span className={`text-sm ${
                    ins.tone === "positive" ? "text-success" : ins.tone === "negative" ? "text-danger" : "text-fg"
                  }`}>
                    {ins.text}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Mercury Retrograde Performance */}
      <Card>
        <CardHeader><CardTitle>Performance during retrogrades</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            <RetroCard
              label="Mercury Retrograde"
              icon={"\u263F"}
              perf={retroPerf.retrograde}
              ccyFmt={ccyFmt}
              ring="ring-1 ring-danger/30"
            />
            <RetroCard
              label="Mercury Direct"
              icon={"\u263F"}
              perf={retroPerf.direct}
              ccyFmt={ccyFmt}
              ring="ring-1 ring-success/30"
            />
          </div>
          {(retroPerf.retrograde.trades > 0 && retroPerf.direct.trades > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-bg-soft p-3 text-center">
                <div className="text-[10px] text-fg-subtle">Win rate delta</div>
                <div className={`text-lg font-bold ${retroPerf.winRateDelta >= 0 ? "text-success" : "text-danger"}`}>
                  {retroPerf.winRateDelta >= 0 ? "+" : ""}{formatNumber(retroPerf.winRateDelta, 1)}%
                </div>
              </div>
              <div className="rounded-lg border border-line bg-bg-soft p-3 text-center">
                <div className="text-[10px] text-fg-subtle">Avg P&L delta</div>
                <div className={`text-lg font-bold ${retroPerf.pnlDelta >= 0 ? "text-success" : "text-danger"}`}>
                  {retroPerf.pnlDelta >= 0 ? "+" : ""}{ccyFmt(retroPerf.pnlDelta)}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Zodiac Season Performance */}
      <Card>
        <CardHeader><CardTitle>Performance by zodiac season</CardTitle></CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-fg-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Season</th>
                  <th className="px-3 py-2 font-medium text-right">Trades</th>
                  <th className="px-3 py-2 font-medium text-right">Win %</th>
                  <th className="px-3 py-2 font-medium text-right">Net P&L</th>
                  <th className="px-3 py-2 font-medium text-right">Avg P&L</th>
                  <th className="px-3 py-2 font-medium text-right">PF</th>
                </tr>
              </thead>
              <tbody>
                {zodiacPerf.map((z) => (
                  <tr key={z.sign} className="border-b border-line/50 last:border-0 hover:bg-bg-soft/50">
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-1.5 text-base">{z.glyph}</span>
                      {z.sign}
                    </td>
                    <td className="px-3 py-2 text-right">{z.trades}</td>
                    <td className="px-3 py-2 text-right">
                      {z.trades > 0 ? formatNumber(z.winRate, 1) + "%" : "\u2014"}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${z.netPnl >= 0 ? "text-success" : "text-danger"}`}>
                      {z.trades > 0 ? ccyFmt(z.netPnl) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {z.trades > 0 ? ccyFmt(z.avgPnl) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {z.trades > 0 ? formatNumber(z.profitFactor, 2) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* P&L by Zodiac Season bar chart */}
      <Card>
        <CardHeader><CardTitle>P&L by zodiac season</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={zodiacChart} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="glyph" tick={{ fontSize: 16 }} />
              <YAxis tick={{ fontSize: 10 }} width={60} />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number) => ccyFmt(value)}
                labelFormatter={(_, payload) => {
                  const entry = payload?.[0]?.payload as { sign?: string } | undefined;
                  return entry?.sign ?? "";
                }}
              />
              <Bar dataKey="netPnl" name="Net P&L" fill="#0d9488" radius={[3, 3, 0, 0]}>
                {zodiacChart.map((entry, i) => (
                  <rect key={i} fill={entry.netPnl >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Win Rate by Planetary Transit */}
      <Card>
        <CardHeader><CardTitle>Win rate by planetary transit</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={transitChart} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="glyph" tick={{ fontSize: 16 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number) => `${formatNumber(value, 1)}%`}
                labelFormatter={(_, payload) => {
                  const entry = payload?.[0]?.payload as { transit?: string } | undefined;
                  return entry?.transit ?? "";
                }}
              />
              <Bar dataKey="winRate" name="Win Rate %" fill="#0d9488" radius={[3, 3, 0, 0]}>
                {transitChart.map((entry, i) => (
                  <rect key={i} fill={entry.winRate >= 50 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Retrograde Performance Heatmap */}
      {heatmap.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Retrograde performance heatmap</CardTitle></CardHeader>
          <CardBody>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(heatmap.length, 12)}, 1fr)` }}>
              {heatmap.map((cell, i) => {
                const maxAbs = Math.max(...heatmap.map((c) => Math.abs(c.netPnl)), 1);
                const intensity = Math.min(Math.abs(cell.netPnl) / maxAbs, 1);
                const bg = cell.netPnl >= 0
                  ? `rgba(34, 197, 94, ${0.1 + intensity * 0.5})`
                  : `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-2 text-center text-[10px] ${
                      cell.isRetrograde ? "border-amber-500/50" : "border-line"
                    }`}
                    style={{ backgroundColor: bg }}
                    title={`${cell.month} ${cell.year}: ${cell.trades} trades, ${cell.netPnl >= 0 ? "+" : ""}${cell.netPnl.toFixed(2)}, ${cell.winRate.toFixed(0)}% WR${cell.isRetrograde ? " (Retrograde)" : ""}`}
                  >
                    <div className="font-medium text-fg">{cell.month}</div>
                    <div className="text-fg-subtle">{cell.year}</div>
                    <div className={`font-mono font-semibold ${cell.netPnl >= 0 ? "text-success" : "text-danger"}`}>
                      {cell.trades > 0 ? ccyFmt(cell.netPnl) : "\u2014"}
                    </div>
                    {cell.isRetrograde && (
                      <div className="mt-0.5 text-[8px] text-amber-400">{"\u263F"} Rx</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-fg-subtle">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded border border-amber-500/50 bg-amber-500/20" />
                Retrograde active
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded bg-success/30" />
                Profitable
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded bg-danger/30" />
                Loss
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Best Cosmic Trading Windows */}
      {cosmicWindows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Best cosmic trading windows</CardTitle></CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2 font-medium">Window</th>
                    <th className="px-3 py-2 font-medium text-right">Trades</th>
                    <th className="px-3 py-2 font-medium text-right">Win %</th>
                    <th className="px-3 py-2 font-medium text-right">Avg P&L</th>
                    <th className="px-3 py-2 font-medium text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {cosmicWindows.slice(0, 10).map((w, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-bg-soft/50">
                      <td className="px-3 py-2 font-medium">
                        <span className="mr-1.5 text-base">{w.glyph}</span>
                        {w.label}
                      </td>
                      <td className="px-3 py-2 text-right">{w.trades}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(w.winRate, 1)}%
                      </td>
                      <td className={`px-3 py-2 text-right ${w.avgPnl >= 0 ? "text-success" : "text-danger"}`}>
                        {ccyFmt(w.avgPnl)}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${w.netPnl >= 0 ? "text-success" : "text-danger"}`}>
                        {ccyFmt(w.netPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Planetary Alignment Impact table */}
      <Card>
        <CardHeader><CardTitle>Planetary alignment impact</CardTitle></CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-fg-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Transit</th>
                  <th className="px-3 py-2 font-medium text-right">Trades</th>
                  <th className="px-3 py-2 font-medium text-right">Wins</th>
                  <th className="px-3 py-2 font-medium text-right">Losses</th>
                  <th className="px-3 py-2 font-medium text-right">Win %</th>
                  <th className="px-3 py-2 font-medium text-right">Net P&L</th>
                  <th className="px-3 py-2 font-medium text-right">Avg P&L</th>
                </tr>
              </thead>
              <tbody>
                {transitPerf.map((t) => (
                  <tr key={t.transit} className="border-b border-line/50 last:border-0 hover:bg-bg-soft/50">
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-1.5 text-base">{t.glyph}</span>
                      {t.transit}
                    </td>
                    <td className="px-3 py-2 text-right">{t.trades}</td>
                    <td className="px-3 py-2 text-right text-success">{t.wins}</td>
                    <td className="px-3 py-2 text-right text-danger">{t.losses}</td>
                    <td className="px-3 py-2 text-right">
                      {t.trades > 0 ? formatNumber(t.winRate, 1) + "%" : "\u2014"}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${t.netPnl >= 0 ? "text-success" : "text-danger"}`}>
                      {t.trades > 0 ? ccyFmt(t.netPnl) : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {t.trades > 0 ? ccyFmt(t.avgPnl) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// -- Shared sub-components ------------------------------------------------

function RetroCard({ label, icon, perf, ccyFmt, ring }: {
  label: string;
  icon: string;
  perf: { trades: number; wins: number; losses: number; netPnl: number; winRate: number; avgPnl: number; profitFactor: number };
  ccyFmt: CcyFmt;
  ring: string;
}) {
  return (
    <Card className={ring}>
      <CardBody className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div className="text-sm font-semibold text-fg">{label}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-[10px] text-fg-subtle">Trades</div>
            <div className="text-sm font-semibold">{perf.trades}</div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">Win %</div>
            <div className="text-sm font-semibold">
              {perf.trades > 0 ? formatNumber(perf.winRate, 1) + "%" : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">Net P&L</div>
            <div className={`text-sm font-semibold ${perf.netPnl >= 0 ? "text-success" : "text-danger"}`}>
              {perf.trades > 0 ? ccyFmt(perf.netPnl) : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-fg-subtle">PF</div>
            <div className="text-sm font-semibold">
              {perf.trades > 0 ? formatNumber(perf.profitFactor, 2) : "\u2014"}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
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
