"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { useTrades } from "@/lib/hooks/use-trades";
import { useFilters, useMoney } from "@/lib/filters/store";
import { applyAllFilters, tpBeSl, type TpBeSlBreakdown } from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import type { TradeRow } from "@/lib/supabase/types";
import { formatPercent } from "@/lib/utils";

type ScorePeriod = "day" | "week" | "month" | "quarter" | "year";

const PERIODS: { id: ScorePeriod; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" }
];

const SESSIONS = ["New York", "London", "Asia", "Sydney"];

function periodBounds(period: ScorePeriod, now = new Date()): { from: Date; label: string } {
  const d = new Date(now);
  switch (period) {
    case "day":
      d.setHours(0, 0, 0, 0);
      return { from: d, label: now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) };
    case "week": {
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return { from: d, label: `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
    }
    case "month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), q * 3, 1),
        label: `Q${q + 1} ${now.getFullYear()}`
      };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), label: `${now.getFullYear()}` };
  }
}

function inWindow(t: TradeRow, from: Date): boolean {
  if (!t.trade_date) return false;
  const d = new Date(t.trade_date);
  return !Number.isNaN(d.getTime()) && d >= from;
}

function tradeSession(t: TradeRow): string | null {
  return t.session ?? detectSession(t.trade_date);
}

function ScoreCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "tp" | "be" | "sl" | "win" }) {
  const toneClass =
    tone === "tp"
      ? "text-success"
      : tone === "sl"
      ? "text-danger"
      : tone === "win"
      ? "text-brand-300"
      : "text-fg";
  return (
    <div className="rounded-xl border border-line bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-muted">{sub}</div>}
    </div>
  );
}

function SessionRow({ session, b, pnl, fmt }: { session: string; b: TpBeSlBreakdown; pnl: number; fmt: (n: number | null | undefined) => string }) {
  return (
    <tr className="border-b border-line/50 last:border-0">
      <td className="px-4 py-3 font-medium">{session}</td>
      <td className="px-4 py-3 text-fg-muted">{b.total}</td>
      <td className="px-4 py-3 text-success">{b.tp}</td>
      <td className="px-4 py-3 text-fg-muted">{b.be}</td>
      <td className="px-4 py-3 text-danger">{b.sl}</td>
      <td className="px-4 py-3">{formatPercent(b.winRate, 1)}</td>
      <td className={`px-4 py-3 font-medium ${pnl >= 0 ? "text-success" : "text-danger"}`}>
        {fmt(pnl)}
      </td>
    </tr>
  );
}

export default function RecapsPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [period, setPeriod] = useState<ScorePeriod>("week");

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);
  const { from, label } = useMemo(() => periodBounds(period), [period]);
  const windowed = useMemo(() => filtered.filter((t) => inWindow(t, from)), [filtered, from]);

  const overall = useMemo(() => tpBeSl(windowed), [windowed]);
  const overallPnl = useMemo(
    () => windowed.reduce((s, t) => s + (t.pnl ?? 0), 0),
    [windowed]
  );

  const bySession = useMemo(() => {
    const out: { session: string; b: TpBeSlBreakdown; pnl: number }[] = [];
    for (const s of SESSIONS) {
      const ts = windowed.filter((t) => tradeSession(t) === s);
      out.push({
        session: s,
        b: tpBeSl(ts),
        pnl: ts.reduce((acc, t) => acc + (t.pnl ?? 0), 0)
      });
    }
    return out;
  }, [windowed]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recaps"
        description="Score-board view of your trading performance, plus drill-downs into Weekly / Monthly / Quarterly / Annual recaps."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Score Board</CardTitle>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-bg-elevated p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1 text-xs ${
                  period === p.id ? "bg-brand-500 text-white" : "text-fg-muted hover:text-fg"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>

          {loading ? (
            <div className="text-sm text-fg-muted">Loading…</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <ScoreCard label="Trades" value={String(overall.total)} />
                <ScoreCard label="TP" value={String(overall.tp)} tone="tp" />
                <ScoreCard label="BE" value={String(overall.be)} tone="be" />
                <ScoreCard label="SL" value={String(overall.sl)} tone="sl" />
                <ScoreCard
                  label="Win rate"
                  value={formatPercent(overall.winRate, 1)}
                  sub={`Net ${fmt(overallPnl)}`}
                  tone="win"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-bg-soft/50 text-xs text-fg-subtle">
                    <tr>
                      <th className="px-4 py-3 font-medium">Session</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">TP</th>
                      <th className="px-4 py-3 font-medium">BE</th>
                      <th className="px-4 py-3 font-medium">SL</th>
                      <th className="px-4 py-3 font-medium">Win %</th>
                      <th className="px-4 py-3 font-medium">Net P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySession.map((row) => (
                      <SessionRow key={row.session} session={row.session} b={row.b} pnl={row.pnl} fmt={fmt} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Period Recaps</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/recap/weekly", label: "Weekly Recap", desc: "Last 7 calendar days" },
            { href: "/recap/monthly", label: "Monthly Recap", desc: "Current month" },
            { href: "/recap/quarterly", label: "Quarterly Recap", desc: "Current quarter" },
            { href: "/recap/annual", label: "Annual Recap", desc: "Current year" }
          ].map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group flex items-center justify-between rounded-xl border border-line bg-bg-elevated p-4 transition hover:border-brand-400"
            >
              <div className="flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-brand-300" />
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-fg-muted">{r.desc}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-brand-300" />
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
