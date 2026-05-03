"use client";

import { useMemo } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  avgWin,
  avgLoss,
  maxDrawdown,
  performanceBy,
  totalPnl,
  groupBy
} from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import type { TradeRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Fmt = (n: number | null | undefined) => string;

const PIE_COLORS = [
  "#5b9eff",
  "#3b82f6",
  "#a866ff",
  "#ec4899",
  "#fb7185",
  "#f59e0b",
  "#22c55e",
  "#0ea5e9",
  "#7b3cff",
  "#14b8a6",
  "#eab308",
  "#ef4444"
];

function pnlClass(n: number): string {
  return n > 0 ? "text-success" : n < 0 ? "text-danger" : "text-fg-muted";
}

function fmtSigned(n: number, fmt: Fmt): string {
  return `${n > 0 ? "+" : n < 0 ? "" : ""}${fmt(n)}`;
}

function durationHours(t: TradeRow): number | null {
  // Prefer the stored seconds, but fall back to open_time/close_time so
  // imports that didn't persist `duration_seconds` (older generic imports,
  // HFM before the dedicated parser landed) still contribute to the avg.
  let secs = t.duration_seconds;
  if (secs == null && t.open_time && t.close_time) {
    const ms = new Date(t.close_time).getTime() - new Date(t.open_time).getTime();
    if (Number.isFinite(ms) && ms > 0) secs = Math.round(ms / 1000);
  }
  if (secs == null || !Number.isFinite(secs) || secs <= 0) return null;
  return secs / 3600;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function sharpe(trades: TradeRow[]): number {
  const pnls = trades.map((t) => t.pnl ?? 0);
  if (pnls.length < 2) return 0;
  const mean = pnls.reduce((s, x) => s + x, 0) / pnls.length;
  const variance =
    pnls.reduce((s, x) => s + (x - mean) ** 2, 0) / (pnls.length - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  // annualised assuming ~252 trading days; treats trades equally per day
  return (mean / sd) * Math.sqrt(252);
}

function maxDrawdownPercent(trades: TradeRow[], startBalance: number): number {
  if (!startBalance) return 0;
  let peak = startBalance;
  let equity = startBalance;
  let maxPct = 0;
  for (const t of trades) {
    equity += t.pnl ?? 0;
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const pct = ((peak - equity) / peak) * 100;
      if (pct > maxPct) maxPct = pct;
    }
  }
  return maxPct;
}

export function ReportsDetailed({
  trades,
  fmt,
  startBalance
}: {
  trades: TradeRow[];
  fmt: Fmt;
  startBalance: number | null;
}) {
  // ---- Asset performance & trade insights ------------------------------
  const byPair = useMemo(() => performanceBy(trades, "pair"), [trades]);
  const pairTotal = useMemo(() => byPair.reduce((s, p) => s + p.trades, 0), [byPair]);

  const longShort = useMemo(() => {
    const longs = trades.filter((t) => t.side === "long");
    const shorts = trades.filter((t) => t.side === "short");
    const longPnl = totalPnl(longs);
    const shortPnl = totalPnl(shorts);
    const avgLong = longs.length ? longPnl / longs.length : 0;
    const avgShort = shorts.length ? shortPnl / shorts.length : 0;
    return {
      longCount: longs.length,
      shortCount: shorts.length,
      avgLong,
      avgShort,
      better:
        longs.length === 0 && shorts.length === 0
          ? null
          : avgLong >= avgShort
            ? "Long"
            : "Short"
    };
  }, [trades]);

  const durations = useMemo(
    () => trades.map(durationHours).filter((n): n is number => n != null && Number.isFinite(n)),
    [trades]
  );
  const avgDuration = durations.length ? durations.reduce((s, x) => s + x, 0) / durations.length : 0;
  const medDuration = median(durations);

  // ---- Focus assets / sessions / days / time windows -------------------
  // Only surface profitable assets here — this card is for "where to double
  // down", not a full leaderboard. Unprofitable assets show up in the
  // per-asset equity curves section below.
  const focusAssets = useMemo(
    () => [...byPair].filter((a) => a.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 3),
    [byPair]
  );

  const sessionRows = useMemo(() => {
    const buckets = groupBy(trades, (t) => t.session ?? detectSession(t.open_time ?? t.trade_date));
    return Object.entries(buckets).map(([session, list]) => ({
      session,
      trades: list.length,
      pnl: totalPnl(list),
      avg: list.length ? totalPnl(list) / list.length : 0
    }));
  }, [trades]);

  const mostTraded = useMemo(
    () => [...sessionRows].sort((a, b) => b.trades - a.trades)[0],
    [sessionRows]
  );
  const bestSession = useMemo(
    () => [...sessionRows].sort((a, b) => b.avg - a.avg)[0],
    [sessionRows]
  );

  const dayRows = useMemo(() => {
    const dayBuckets = groupBy(trades, (t) =>
      t.trade_date ? new Date(t.trade_date).toLocaleDateString("en-US", { weekday: "long" }) : null
    );
    return Object.entries(dayBuckets).map(([day, list]) => ({
      day,
      pnl: totalPnl(list),
      trades: list.length
    }));
  }, [trades]);
  const bestDay = useMemo(() => [...dayRows].sort((a, b) => b.pnl - a.pnl)[0], [dayRows]);
  const worstDay = useMemo(() => [...dayRows].sort((a, b) => a.pnl - b.pnl)[0], [dayRows]);

  // 30-minute trade-time windows (UTC), keyed by HH:MM-HH:MM
  const timeWindowRows = useMemo(() => {
    const buckets = groupBy(trades, (t) => {
      const ts = t.open_time ?? t.trade_date;
      if (!ts) return null;
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return null;
      const h = d.getUTCHours();
      const m = d.getUTCMinutes() < 30 ? "00" : "30";
      const next = m === "00" ? `${String(h).padStart(2, "0")}:30` : `${String((h + 1) % 24).padStart(2, "0")}:00`;
      return `${String(h).padStart(2, "0")}:${m}-${next}`;
    });
    return Object.entries(buckets).map(([window, list]) => ({
      window,
      trades: list.length,
      pnl: totalPnl(list)
    }));
  }, [trades]);
  const bestWindow = useMemo(() => [...timeWindowRows].sort((a, b) => b.pnl - a.pnl)[0], [timeWindowRows]);
  const worstWindow = useMemo(() => [...timeWindowRows].sort((a, b) => a.pnl - b.pnl)[0], [timeWindowRows]);

  // ---- Additional metrics + per-asset equity curves --------------------
  const dd = maxDrawdown(trades);
  const ddPct = startBalance ? maxDrawdownPercent(trades, startBalance) : 0;
  const sr = sharpe(trades);
  const winAvg = avgWin(trades);
  const lossAvg = Math.abs(avgLoss(trades));

  const perAssetCurves = useMemo(() => {
    const groupedRaw = groupBy(trades, (t) => t.pair);
    const grouped: Record<string, TradeRow[]> = groupedRaw;
    const list = Object.entries(grouped).map(([pair, ts]) => {
      const sorted = [...ts].sort((a, b) => {
        const da = new Date(a.trade_date ?? a.open_time ?? 0).getTime();
        const db = new Date(b.trade_date ?? b.open_time ?? 0).getTime();
        return da - db;
      });
      let cum = 0;
      const points = sorted.map((t, i) => {
        cum += t.pnl ?? 0;
        return { i, equity: cum };
      });
      return { pair, total: cum, points };
    });
    return list.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [trades]);

  return (
    <div className="space-y-6">
      {/* Section 1: Asset Performance & Trade Insights ------------------- */}
      <section>
        <SectionHeader
          title="Asset Performance & Trade Insights"
          subtitle="Pie, long/short, duration + recommendations"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Trades per Asset</CardTitle>
            </CardHeader>
            <CardBody>
              {byPair.length === 0 ? (
                <Empty title="No assets" description="Tag your trades with a symbol to see distribution." />
              ) : (
                <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 16, right: 8, bottom: 16, left: 8 }}>
                        <Pie
                          data={byPair}
                          dataKey="trades"
                          nameKey="key"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={72}
                          paddingAngle={2}
                          label={(d: { percent?: number }) =>
                            d.percent && d.percent >= 0.04
                              ? `${Math.round(d.percent * 100)}%`
                              : ""
                          }
                          labelLine={false}
                        >
                          {byPair.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "rgb(15 14 26 / 0.95)",
                            border: "1px solid rgb(168 102 255 / 0.4)",
                            borderRadius: 12,
                            color: "white",
                            fontSize: 12
                          }}
                          formatter={(value: number, name) => [
                            `${value} (${pairTotal ? Math.round((value / pairTotal) * 100) : 0}%)`,
                            String(name)
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto pr-1 text-[11px] text-fg-muted">
                    {byPair.map((d, i) => (
                      <div key={String(d.key)} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate">{String(d.key)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Long vs Short</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Counts</div>
                  <div className="mt-1 flex justify-between text-sm">
                    <span>
                      Long: <span className="font-semibold tabular-nums">{longShort.longCount}</span>
                    </span>
                    <span>
                      Short: <span className="font-semibold tabular-nums">{longShort.shortCount}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Average P&amp;L</div>
                  <div className="mt-1 flex justify-between text-sm">
                    <span className={pnlClass(longShort.avgLong)}>
                      Long: {fmtSigned(longShort.avgLong, fmt)}
                    </span>
                    <span className={pnlClass(longShort.avgShort)}>
                      Short: {fmtSigned(longShort.avgShort, fmt)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Better</div>
                  <div className="mt-1 text-base font-semibold">
                    {longShort.better ?? "—"}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Trade Duration</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div>
                  Average: <span className="font-semibold">{avgDuration.toFixed(2)} hrs</span>
                </div>
                <div>
                  Median: <span className="font-semibold">{medDuration.toFixed(2)} hrs</span>
                </div>
              </div>
              <div className="mt-3 h-32 rounded-xl bg-bg-soft/40 p-3">
                <div className="flex h-full items-end gap-2">
                  <DurationBar label="Avg" value={avgDuration} max={Math.max(avgDuration, medDuration, 1)} />
                  <DurationBar label="Median" value={medDuration} max={Math.max(avgDuration, medDuration, 1)} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Section 2: Focus + sessions + days/time windows ---------------- */}
      <section>
        <SectionHeader title="Focus, sessions & timing" subtitle="Where the edge is — and where it isn't" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Assets to Focus On</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {focusAssets.length === 0 || focusAssets.every((a) => a.pnl <= 0) ? (
                <div className="text-sm text-fg-muted">No profitable assets yet.</div>
              ) : (
                focusAssets.map((a) => (
                  <div key={String(a.key)} className="rounded-xl border border-line bg-bg-soft/30 p-3">
                    <div className="text-sm font-semibold uppercase">{String(a.key)}</div>
                    <div className="text-xs text-fg-muted">
                      Net P&amp;L:{" "}
                      <span className={pnlClass(a.pnl)}>{fmt(a.pnl)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Traded Session</CardTitle>
            </CardHeader>
            <CardBody>
              {mostTraded ? (
                <div className="rounded-xl border border-line bg-bg-soft/30 p-3">
                  <div className="text-base font-semibold">{mostTraded.session}</div>
                  <div className="text-xs text-fg-muted">
                    Trades: <span className="font-semibold tabular-nums">{mostTraded.trades}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-fg-muted">No session data.</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Performing Session</CardTitle>
            </CardHeader>
            <CardBody>
              {bestSession ? (
                <div className="rounded-xl border border-line bg-bg-soft/30 p-3">
                  <div className="text-base font-semibold">{bestSession.session}</div>
                  <div className="text-xs text-fg-muted">
                    Avg P&amp;L:{" "}
                    <span className={pnlClass(bestSession.avg)}>{fmt(bestSession.avg)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-fg-muted">No session data.</div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle>Other Sessions Traded &amp; Performance</CardTitle>
            </CardHeader>
            <CardBody>
              {sessionRows.length === 0 ? (
                <div className="text-sm text-fg-muted">No data.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line text-fg-subtle">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Session</th>
                      <th className="px-2 py-1.5 text-right font-medium">Trades</th>
                      <th className="px-2 py-1.5 text-right font-medium">Total P&amp;L</th>
                      <th className="px-2 py-1.5 text-right font-medium">Avg P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessionRows].sort((a, b) => b.pnl - a.pnl).map((s) => (
                      <tr key={s.session} className="border-b border-line/50 last:border-0">
                        <td className="px-2 py-1.5">{s.session}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{s.trades}</td>
                        <td className={cn("px-2 py-1.5 text-right tabular-nums", pnlClass(s.pnl))}>
                          {fmt(s.pnl)}
                        </td>
                        <td className={cn("px-2 py-1.5 text-right tabular-nums", pnlClass(s.avg))}>
                          {fmt(s.avg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <DayCard title="Worst Performing Days" rows={dayRows} order="asc" fmt={fmt} />
          <DayCard title="Best Performing Days" rows={dayRows} order="desc" fmt={fmt} />

          <WindowCard
            title="Worst Trade Time Window"
            row={worstWindow && worstWindow.pnl < 0 ? worstWindow : undefined}
            fmt={fmt}
            kind="bad"
          />
          <WindowCard
            title="Best Trade Time Window"
            row={bestWindow && bestWindow.pnl > 0 ? bestWindow : undefined}
            fmt={fmt}
            kind="good"
          />
        </div>
      </section>

      {/* Section 3: Additional metrics + per-asset equity curves --------- */}
      <section>
        <SectionHeader title="Additional Metrics & Asset Performance" subtitle="Enhanced overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Max Drawdown ($)" value={fmt(dd)} negative />
          <MetricCard label="Max Drawdown (%)" value={`${ddPct.toFixed(2)}%`} negative />
          <MetricCard label="Sharpe Ratio" value={sr.toFixed(2)} negative={sr < 0} />
          <Card>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-fg-subtle">Avg Win / Avg Loss</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                <span className="text-success">{fmt(winAvg)}</span>
                <span className="px-1 text-fg-muted">/</span>
                <span className="text-danger">{fmt(lossAvg)}</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {perAssetCurves.length > 0 && (
          <div className="mt-4 space-y-3">
            {perAssetCurves.slice(0, 8).map((curve) => (
              <Card key={curve.pair}>
                <CardBody>
                  <div className="mb-1 flex items-baseline justify-between">
                    <div className="text-sm font-semibold uppercase">{curve.pair}</div>
                    <div className={cn("text-sm tabular-nums", pnlClass(curve.total))}>
                      {curve.total >= 0 ? "+" : ""}
                      {fmt(curve.total)}
                    </div>
                  </div>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curve.points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke={curve.total >= 0 ? "#22c55e" : "#ef4444"}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Tooltip
                          cursor={{ stroke: "#ffffff20" }}
                          contentStyle={{
                            background: "rgb(15 14 26 / 0.95)",
                            border: "1px solid rgb(168 102 255 / 0.4)",
                            borderRadius: 8,
                            color: "white",
                            fontSize: 11
                          }}
                          formatter={(v: number) => [fmt(v), "Equity"]}
                          labelFormatter={() => ""}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  negative
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", negative ? "text-fg" : "text-fg")}>
          {value}
        </div>
      </CardBody>
    </Card>
  );
}

function DayCard({
  title,
  rows,
  order,
  fmt
}: {
  title: string;
  rows: Array<{ day: string; pnl: number; trades: number }>;
  order: "asc" | "desc";
  fmt: Fmt;
}) {
  // "Best" shows only positive days; "Worst" shows only negative days. A
  // break-even day should never appear in either. Up to 4 rows so users with
  // data spread across the week can see the full picture.
  const filtered = rows.filter((r) => (order === "desc" ? r.pnl > 0 : r.pnl < 0));
  const sorted = [...filtered].sort((a, b) => (order === "desc" ? b.pnl - a.pnl : a.pnl - b.pnl));
  const visible = sorted.slice(0, 4);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {visible.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-fg-subtle">
              <tr>
                <th className="px-2 py-1.5 font-medium">Day</th>
                <th className="px-2 py-1.5 text-right font-medium">Total P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.day} className="border-b border-line/50 last:border-0">
                  <td className="px-2 py-1.5">{r.day}</td>
                  <td className={cn("px-2 py-1.5 text-right tabular-nums font-semibold", pnlClass(r.pnl))}>
                    {fmt(r.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-fg-muted">
            {order === "desc" ? "No profitable days yet." : "No losing days yet."}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function WindowCard({
  title,
  row,
  fmt,
  kind
}: {
  title: string;
  row: { window: string; trades: number; pnl: number } | undefined;
  fmt: Fmt;
  kind: "good" | "bad";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {row ? (
          <div className="rounded-xl border border-line bg-bg-soft/30 p-3 text-center">
            <div className="text-base font-semibold tabular-nums">{row.window}</div>
            <div className="mt-1 text-xs text-fg-muted">
              Total P&amp;L:{" "}
              <span className={kind === "good" ? "text-success" : "text-danger"}>{fmt(row.pnl)}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-fg-muted">No data.</div>
        )}
      </CardBody>
    </Card>
  );
}

function DurationBar({
  label,
  value,
  max
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-1">
      <div className="w-full rounded-md bg-brand-500/30" style={{ height: `${pct * 100}%`, minHeight: 4 }} />
      <div className="text-[10px] text-fg-subtle">{label}</div>
    </div>
  );
}
