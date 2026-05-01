"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import { useFilters, useMoney } from "@/lib/filters/store";
import {
  applyAllFilters,
  computeGsScoreParts,
  gsScore,
  netPnl,
  winRate,
  profitFactor,
  maxDrawdown,
  recoveryFactor,
  performanceBy,
  totalPnl,
  realisedRR
} from "@/lib/analytics";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { formatPercent, formatNumber } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

type Insight = { tone: "good" | "warn" | "bad"; title: string; detail: string };

function buildInsights(trades: TradeRow[], fmt: (n: number | null | undefined) => string): Insight[] {
  const out: Insight[] = [];
  if (!trades.length) return out;

  const win = winRate(trades);
  const pf = profitFactor(trades);
  const dd = maxDrawdown(trades);
  const rf = recoveryFactor(trades);

  if (win >= 60) out.push({ tone: "good", title: `Strong win rate (${win.toFixed(1)}%)`, detail: "Keep doing what you're doing — your edge is showing." });
  else if (win < 40) out.push({ tone: "bad", title: `Low win rate (${win.toFixed(1)}%)`, detail: "Either your entries are weak, or your RR target is too high. Tighten one." });

  if (pf >= 2) out.push({ tone: "good", title: `Excellent profit factor (${pf.toFixed(2)})`, detail: "Your winners pay for losers more than 2x." });
  else if (pf < 1.2 && pf > 0) out.push({ tone: "warn", title: `Thin profit factor (${pf.toFixed(2)})`, detail: "You're barely net-positive. One bad streak wipes the edge." });

  if (rf >= 3) out.push({ tone: "good", title: "Healthy recovery factor", detail: "Your equity bounces back fast from drawdowns." });
  if (dd > 0 && Math.abs(dd) > totalPnl(trades) * 0.5) {
    out.push({ tone: "warn", title: "Drawdowns are large vs gains", detail: "Reduce risk per trade or increase RR — the equity volatility is high." });
  }

  // Session signal
  const sessions = performanceBy(trades, "session");
  if (sessions.length >= 2) {
    const best = sessions[0];
    const worst = sessions[sessions.length - 1];
    if (best && worst && best.pnl > 0 && worst.pnl < 0) {
      out.push({
        tone: "warn",
        title: `${worst.key} is dragging you down`,
        detail: `${best.key} is your best session (${fmt(best.pnl)}). Consider sitting out ${worst.key}.`
      });
    }
  }

  // Mistake signal
  const mistakes = performanceBy(trades, "mistake_tag").filter((m) => m.key !== "—" && m.pnl < 0);
  if (mistakes.length) {
    const worst = mistakes.sort((a, b) => a.pnl - b.pnl)[0];
    out.push({
      tone: "bad",
      title: `Top mistake: "${worst.key}"`,
      detail: `${worst.trades} trades, ${fmt(worst.pnl)} lost. Build a checklist rule against this.`
    });
  }

  // RR distribution signal
  const rrs = trades.map(realisedRR).filter((x): x is number => x !== null);
  const avgRR = rrs.length ? rrs.reduce((s, x) => s + x, 0) / rrs.length : 0;
  if (rrs.length >= 10) {
    if (avgRR < 0.5) {
      out.push({ tone: "warn", title: "Average RR is low", detail: `Avg ${avgRR.toFixed(2)}R — try cutting losers earlier or trailing winners.` });
    } else if (avgRR > 1.5) {
      out.push({ tone: "good", title: "RR is paying you well", detail: `Avg ${avgRR.toFixed(2)}R per trade.` });
    }
  }

  return out;
}

export default function GsInsightsPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  const parts = useMemo(() => computeGsScoreParts(filtered), [filtered]);
  const score = useMemo(() => gsScore(parts), [parts]);
  const insights = useMemo(() => buildInsights(filtered, fmt), [filtered, fmt]);

  if (loading) return <div className="text-sm text-fg-muted">Loading insights…</div>;
  if (!filtered.length)
    return (
      <Empty
        title={trades.length ? "No trades match filters" : "No data yet"}
        description={trades.length ? "Adjust filters in the top bar." : "Add trades to unlock GS Insights."}
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="GS Insights"
        description="Your triangular GS Score, contributing factors, and contextual coaching insights — replaces Backtesting."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>GS Score</CardTitle>
          </CardHeader>
          <CardBody>
            <GsScoreRadar parts={parts} score={score} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contributing factors</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <Stat label="Net P&L" value={netPnl(filtered)} format="currency" positive={netPnl(filtered) >= 0} />
            <Stat label="Win %" value={parts.winPct} format="percent" />
            <Stat label="Profit factor" value={parts.profitFactor} format="number" />
            <Stat label="Avg win/loss" value={parts.avgWinLoss} format="number" />
            <Stat label="Max drawdown" value={parts.maxDrawdown} format="currency" positive={false} />
            <Stat label="Recovery factor" value={parts.recoveryFactor} format="number" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {insights.length === 0 ? (
            <div className="text-sm text-fg-muted">Need more trades to surface meaningful coaching signals.</div>
          ) : (
            insights.map((i, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-3 ${
                  i.tone === "good"
                    ? "border-success/40 bg-success/10"
                    : i.tone === "warn"
                    ? "border-warning/40 bg-warning/10"
                    : "border-danger/40 bg-danger/10"
                }`}
              >
                <div className={`text-sm font-medium ${
                  i.tone === "good" ? "text-success" : i.tone === "warn" ? "text-warning" : "text-danger"
                }`}>
                  {i.title}
                </div>
                <div className="mt-1 text-xs text-fg-muted">{i.detail}</div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
