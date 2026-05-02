"use client";

import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { GsScoreTriangle } from "@/components/charts/gs-score-triangle";
import { useTrades } from "@/lib/hooks/use-trades";
import { useFilters, useMoney } from "@/lib/filters/store";
import {
  applyAllFilters,
  avgWinLoss,
  computeGsScoreParts,
  gsScore,
  groupBy,
  maxDrawdown,
  performanceBy,
  profitFactor,
  realisedRR,
  recoveryFactor,
  totalPnl,
  winRate
} from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import { cn } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

const GROUPS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const;
type GroupBy = (typeof GROUPS)[number];

type Insight = { tone: "good" | "warn" | "bad"; title: string; detail: string };

function buildInsights(trades: TradeRow[], fmt: (n: number | null | undefined) => string): Insight[] {
  const out: Insight[] = [];
  if (!trades.length) return out;

  const win = winRate(trades);
  const pf = profitFactor(trades);
  const dd = maxDrawdown(trades);
  const rf = recoveryFactor(trades);

  if (win >= 60)
    out.push({
      tone: "good",
      title: `Strong win rate (${win.toFixed(1)}%)`,
      detail: "Keep doing what you're doing — your edge is showing."
    });
  else if (win < 40)
    out.push({
      tone: "bad",
      title: `Low win rate (${win.toFixed(1)}%)`,
      detail: "Either your entries are weak, or your RR target is too high. Tighten one."
    });

  if (pf >= 2)
    out.push({
      tone: "good",
      title: `Excellent profit factor (${pf.toFixed(2)})`,
      detail: "Your winners pay for losers more than 2x."
    });
  else if (pf < 1.2 && pf > 0)
    out.push({
      tone: "warn",
      title: `Thin profit factor (${pf.toFixed(2)})`,
      detail: "You're barely net-positive. One bad streak wipes the edge."
    });

  if (rf >= 3)
    out.push({
      tone: "good",
      title: "Healthy recovery factor",
      detail: "Your equity bounces back fast from drawdowns."
    });
  if (dd > 0 && Math.abs(dd) > totalPnl(trades) * 0.5) {
    out.push({
      tone: "warn",
      title: "Drawdowns are large vs gains",
      detail: "Reduce risk per trade or increase RR — the equity volatility is high."
    });
  }

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

  const mistakes = performanceBy(trades, "mistake_tag").filter((m) => m.key !== "—" && m.pnl < 0);
  if (mistakes.length) {
    const worst = mistakes.sort((a, b) => a.pnl - b.pnl)[0];
    out.push({
      tone: "bad",
      title: `Top mistake: "${worst.key}"`,
      detail: `${worst.trades} trades, ${fmt(worst.pnl)} lost. Build a checklist rule against this.`
    });
  }

  const rrs = trades.map(realisedRR).filter((x): x is number => x !== null);
  const avgRR = rrs.length ? rrs.reduce((s, x) => s + x, 0) / rrs.length : 0;
  if (rrs.length >= 10) {
    if (avgRR < 1) {
      out.push({
        tone: "warn",
        title: "Planned R:R is below 1:1",
        detail: `Avg setup is 1:${avgRR.toFixed(2)} — you're risking more than you stand to make.`
      });
    } else if (avgRR >= 2) {
      out.push({
        tone: "good",
        title: "Strong R:R discipline",
        detail: `Avg planned setup is 1:${avgRR.toFixed(2)} reward-to-risk.`
      });
    }
  }

  return out;
}

/** Map a YYYY-MM-DD trade_date into a bucket key for the chosen grouping. */
function bucketKey(date: string, group: GroupBy): string {
  if (!date) return "";
  if (group === "Daily") return date;
  // Parse as UTC noon to dodge DST boundaries.
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;

  if (group === "Monthly") return date.slice(0, 7);
  if (group === "Yearly") return String(d.getUTCFullYear());
  if (group === "Quarterly") {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return `${d.getUTCFullYear()}-Q${q}`;
  }
  // Weekly — ISO week starting Monday.
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Mon
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dow);
  return monday.toISOString().slice(0, 10);
}

/** Display label shown on the X axis for a given bucket key. */
function bucketLabel(key: string, group: GroupBy): string {
  if (group === "Daily") {
    const d = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (group === "Weekly") {
    const d = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return key;
    return `wk ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (group === "Monthly") {
    const [y, m] = key.split("-");
    if (!m) return key;
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  if (group === "Yearly") return key;
  return key; // Quarterly already reads "2025-Q3"
}

/** Human-readable description of which period the triangle is showing. */
function focusBucketLabel(key: string, group: GroupBy): string {
  if (group === "Daily") {
    const d = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  if (group === "Weekly") {
    const start = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(start.getTime())) return `Week of ${key}`;
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (group === "Monthly") {
    const [y, m] = key.split("-");
    if (!m) return key;
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return key; // Quarterly + Yearly already self-describing
}

type Bucket = {
  key: string;
  label: string;
  trades: number;
  winPct: number;
  profitFactor: number;
  avgWinLoss: number;
  gsScore: number;
};

function buildBuckets(trades: TradeRow[], group: GroupBy): Bucket[] {
  const grouped = groupBy(trades, (t) => (t.trade_date ? bucketKey(t.trade_date, group) : null));
  const out: Bucket[] = Object.entries(grouped).map(([key, ts]) => {
    const parts = computeGsScoreParts(ts);
    return {
      key,
      label: bucketLabel(key, group),
      trades: ts.length,
      winPct: winRate(ts),
      profitFactor: profitFactor(ts),
      avgWinLoss: avgWinLoss(ts),
      gsScore: gsScore(parts)
    };
  });
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}

export default function GsInsightsPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [group, setGroup] = useState<GroupBy>("Daily");
  const screenshotRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);
  const insights = useMemo(() => buildInsights(filtered, fmt), [filtered, fmt]);
  const buckets = useMemo(() => buildBuckets(filtered, group), [filtered, group]);

  // Triangle radar tracks the *most recent* bucket of the chosen grouping,
  // so toggling Daily / Weekly / Monthly / Quarterly / Yearly visibly redraws
  // it (matches the behaviour of the curves underneath).
  const focusBucket = buckets.length ? buckets[buckets.length - 1] : null;
  const focusTrades = useMemo(() => {
    if (!focusBucket) return filtered;
    return filtered.filter(
      (t) => t.trade_date && bucketKey(t.trade_date, group) === focusBucket.key
    );
  }, [filtered, focusBucket, group]);
  const parts = useMemo(() => computeGsScoreParts(focusTrades), [focusTrades]);
  const score = useMemo(() => gsScore(parts), [parts]);
  const focusLabel = focusBucket ? focusBucketLabel(focusBucket.key, group) : null;

  // Best / worst session breakdown for the right-side coaching column.
  const sessionBreakdown = useMemo(() => {
    const withSession = filtered.map((t) => ({
      ...t,
      session: t.session ?? detectSession(t.trade_date)
    }));
    return performanceBy(withSession, "session").filter((s) => s.key && s.key !== "—");
  }, [filtered]);

  if (loading) return <div className="text-sm text-fg-muted">Loading insights…</div>;
  if (!filtered.length)
    return (
      <Empty
        title={trades.length ? "No trades match filters" : "No data yet"}
        description={trades.length ? "Adjust filters in the top bar." : "Add trades to unlock GS Insights."}
      />
    );

  return (
    <div ref={screenshotRef} className="space-y-4">
      <PageHeader
        title="GS Insights"
        description="Your triangular GS Score across Win %, Profit Factor and Avg Win/Loss — tracked over time, with auto-generated coaching notes."
        actions={
          <div className="flex items-center gap-2">
            <ScreenshotButton targetRef={screenshotRef} filename="gs-insights" />
            <GroupBySwitch value={group} onChange={setGroup} />
          </div>
        }
      />

      {/* Top row: Triangle radar · Score performance · Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>GS Score</CardTitle>
            {focusLabel && (
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                {focusLabel}
              </span>
            )}
          </CardHeader>
          <CardBody>
            <GsScoreTriangle parts={parts} score={score} radarHeight="h-52" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GS Score Performance</CardTitle>
          </CardHeader>
          <CardBody>
            <PurpleArea
              data={buckets}
              dataKey="gsScore"
              height="h-52"
              yDomain={[0, 100]}
              valueLabel="GS Score"
              formatY={(v) => v.toFixed(0)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {insights.length === 0 ? (
              <div className="text-sm text-fg-muted">
                Need more trades to surface meaningful coaching signals.
              </div>
            ) : (
              insights.slice(0, 4).map((i, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border p-3",
                    i.tone === "good"
                      ? "border-success/40 bg-success/10"
                      : i.tone === "warn"
                        ? "border-warning/40 bg-warning/10"
                        : "border-danger/40 bg-danger/10"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-medium",
                      i.tone === "good"
                        ? "text-success"
                        : i.tone === "warn"
                          ? "text-warning"
                          : "text-danger"
                    )}
                  >
                    {i.title}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">{i.detail}</div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom row: three component-metric trend curves. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Win %</CardTitle>
          </CardHeader>
          <CardBody>
            <PurpleArea
              data={buckets}
              dataKey="winPct"
              height="h-44"
              yDomain={[0, 100]}
              valueLabel="Win %"
              formatY={(v) => `${v.toFixed(0)}%`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Factor</CardTitle>
          </CardHeader>
          <CardBody>
            <PurpleArea
              data={buckets}
              dataKey="profitFactor"
              height="h-44"
              valueLabel="Profit factor"
              formatY={(v) => v.toFixed(2)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Win/Loss</CardTitle>
          </CardHeader>
          <CardBody>
            <PurpleArea
              data={buckets}
              dataKey="avgWinLoss"
              height="h-44"
              valueLabel="Avg W/L"
              formatY={(v) => v.toFixed(2)}
            />
          </CardBody>
        </Card>
      </div>

      {/* Creative right-side / extra section: per-session score-card, useful
          for the user since they trade NY / London / Asia. */}
      {sessionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by trading session</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sessionBreakdown.map((s) => (
                <div
                  key={s.key}
                  className="rounded-xl border border-line bg-bg-soft/40 p-3"
                >
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">
                    {s.key}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      s.pnl > 0 ? "text-success" : s.pnl < 0 ? "text-danger" : "text-fg"
                    )}
                  >
                    {fmt(s.pnl)}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-fg-muted">
                    <span>{s.trades} trade{s.trades === 1 ? "" : "s"}</span>
                    <span>{s.winRate.toFixed(0)}% win</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-fg-subtle">
              Sessions are bucketed using the trade open time ({"Asia"} = 00:00–07:00 UTC, {"London"} = 07:00–13:00 UTC, {"New York"} = 13:00–21:00 UTC).
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function GroupBySwitch({
  value,
  onChange
}: {
  value: GroupBy;
  onChange: (next: GroupBy) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-bg p-0.5 text-xs">
      <span className="px-2 py-1 text-fg-subtle">Group by</span>
      {GROUPS.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={cn(
            "rounded-lg px-2.5 py-1 font-medium transition",
            value === g
              ? "bg-brand-500/15 text-brand-300"
              : "text-fg-muted hover:text-fg"
          )}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function PurpleArea({
  data,
  dataKey,
  height,
  yDomain,
  valueLabel,
  formatY
}: {
  data: Bucket[];
  dataKey: keyof Bucket;
  height: string;
  yDomain?: [number, number];
  valueLabel: string;
  formatY: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-xs text-fg-subtle", height)}>
        No data for the selected period.
      </div>
    );
  }
  return (
    <div className={height}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(168 102 255)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="rgb(168 102 255)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(168, 102, 255, 0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgb(130 130 150)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke="rgb(130 130 150)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v) => formatY(Number(v))}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "rgb(20 18 32)",
              border: "1px solid rgba(168, 102, 255, 0.35)",
              borderRadius: 12,
              fontSize: 12
            }}
            labelStyle={{ color: "rgb(168 102 255)" }}
            formatter={(v) => [formatY(Number(v)), valueLabel]}
          />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke="rgb(168 102 255)"
            strokeWidth={2}
            fill={`url(#grad-${String(dataKey)})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
