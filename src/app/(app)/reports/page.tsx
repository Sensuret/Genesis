"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  performanceBy, totalCommissions, totalSpread, dailyPnl, winRate, profitFactor,
  netPnl, totalPnl, groupBy
} from "@/lib/analytics";
import { PerfBar } from "@/components/charts/perf-bar";
import { DailyPnlChart } from "@/components/charts/daily-pnl";
import { Empty } from "@/components/ui/empty";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

const TABS = ["Overview", "Behavior", "Sessions & Pairs", "Costs & Account", "Calendar"] as const;
type Tab = (typeof TABS)[number];

export default function ReportsPage() {
  const { trades, loading } = useTrades();
  const [tab, setTab] = useState<Tab>("Overview");

  if (loading) return <div className="text-sm text-fg-muted">Loading reports…</div>;
  if (!trades.length) return <Empty title="No trades" description="Reports unlock once you log trades." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Tradezella-depth insights on behavior, sessions, costs and your psychological pattern."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "border-brand-400 bg-brand-500/15 text-brand-200" : "border-line bg-bg-soft text-fg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview trades={trades} />}
      {tab === "Behavior" && <Behavior trades={trades} />}
      {tab === "Sessions & Pairs" && <SessionsPairs trades={trades} />}
      {tab === "Costs & Account" && <Costs trades={trades} />}
      {tab === "Calendar" && <CalendarView trades={trades} />}
    </div>
  );
}

function Overview({ trades }: { trades: TradeRow[] }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Net P&L" value={netPnl(trades)} format="currency" positive={netPnl(trades) >= 0} />
        <Stat label="Trade win %" value={winRate(trades)} format="percent" />
        <Stat label="Profit factor" value={profitFactor(trades)} format="number" />
        <Stat label="Total trades" value={trades.length} />
      </div>
      <Card>
        <CardHeader><CardTitle>Daily net P&L</CardTitle></CardHeader>
        <CardBody><DailyPnlChart data={dailyPnl(trades).slice(-60)} /></CardBody>
      </Card>
    </>
  );
}

function Behavior({ trades }: { trades: TradeRow[] }) {
  const byMistake = performanceBy(trades, "mistake_tag");
  const bySetup = performanceBy(trades, "setup_tag");
  const byEmotion = useEmotions(trades);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Best setups</CardTitle></CardHeader>
          <CardBody><PerfBar data={bySetup.slice(0, 8)} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Worst habits (mistakes)</CardTitle></CardHeader>
          <CardBody><PerfBar data={byMistake.slice(-8).reverse()} /></CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Emotion → P&L correlation</CardTitle></CardHeader>
        <CardBody>
          {byEmotion.length === 0 ? (
            <div className="text-sm text-fg-muted">Tag emotions on your trades to unlock this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2 font-medium">Emotion</th>
                    <th className="px-3 py-2 font-medium">Trades</th>
                    <th className="px-3 py-2 font-medium">Win %</th>
                    <th className="px-3 py-2 font-medium">Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byEmotion.map((e) => (
                    <tr key={e.emotion} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2 font-medium">{e.emotion}</td>
                      <td className="px-3 py-2">{e.trades}</td>
                      <td className="px-3 py-2">{formatPercent(e.winRate)}</td>
                      <td className="px-3 py-2">{formatCurrency(e.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function useEmotions(trades: TradeRow[]) {
  const buckets: Record<string, TradeRow[]> = {};
  for (const t of trades) {
    for (const e of t.emotions ?? []) {
      (buckets[e] ||= []).push(t);
    }
  }
  return Object.entries(buckets)
    .map(([emotion, ts]) => ({
      emotion,
      trades: ts.length,
      pnl: totalPnl(ts),
      winRate: winRate(ts)
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

function SessionsPairs({ trades }: { trades: TradeRow[] }) {
  const sessions = performanceBy(trades, "session");
  const pairs = performanceBy(trades, "pair");
  const bestSession = sessions[0];
  const worstSession = sessions[sessions.length - 1];
  const dayBuckets = groupBy(trades, (t) => (t.trade_date ? new Date(t.trade_date).toLocaleDateString("en-US", { weekday: "long" }) : null));
  const days = Object.entries(dayBuckets).map(([k, v]) => ({ key: k, pnl: totalPnl(v), trades: v.length }));
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Best session" value={bestSession ? `${bestSession.key} · ${formatCurrency(bestSession.pnl)}` : "—"} format="text" />
        <Stat label="Worst session" value={worstSession ? `${worstSession.key} · ${formatCurrency(worstSession.pnl)}` : "—"} format="text" />
        <Stat label="Most traded pair" value={pairs.sort((a, b) => b.trades - a.trades)[0]?.key ?? "—"} format="text" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>By session</CardTitle></CardHeader><CardBody><PerfBar data={sessions} /></CardBody></Card>
        <Card><CardHeader><CardTitle>By day of week</CardTitle></CardHeader><CardBody><PerfBar data={days} /></CardBody></Card>
      </div>
      <Card><CardHeader><CardTitle>Pairs</CardTitle></CardHeader><CardBody><PerfBar data={pairs.slice(0, 12)} /></CardBody></Card>
    </>
  );
}

function Costs({ trades }: { trades: TradeRow[] }) {
  const commissions = totalCommissions(trades);
  const spread = totalSpread(trades);
  const balances = trades
    .filter((t) => t.account_balance !== null && t.account_balance !== undefined)
    .map((t) => ({ date: t.trade_date ?? "", value: t.account_balance ?? 0 }));
  const latestBalance = balances[balances.length - 1]?.value ?? null;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Commissions paid" value={commissions} format="currency" positive={false} />
        <Stat label="Spread paid" value={spread} format="currency" positive={false} />
        <Stat label="Total cost" value={commissions + spread} format="currency" positive={false} />
        <Stat label="Latest account balance" value={latestBalance ?? "—"} format={latestBalance !== null ? "currency" : "text"} />
      </div>
      <Card>
        <CardHeader><CardTitle>Where the costs come from</CardTitle></CardHeader>
        <CardBody>
          <div className="text-sm text-fg-muted">
            Track per-trade <span className="text-fg">commissions</span> and{" "}
            <span className="text-fg">spread</span> in the Add Trade form or include them in your CSV. Genesis sums them
            into your true Net P&L automatically.
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function CalendarView({ trades }: { trades: TradeRow[] }) {
  const days = dailyPnl(trades);
  const totalsByMonth = days.reduce<Record<string, { trades: number; pnl: number }>>((acc, d) => {
    const m = d.date.slice(0, 7);
    if (!acc[m]) acc[m] = { trades: 0, pnl: 0 };
    acc[m].trades += d.trades;
    acc[m].pnl += d.pnl;
    return acc;
  }, {});
  const months = Object.entries(totalsByMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return (
    <Card>
      <CardHeader><CardTitle>By month</CardTitle></CardHeader>
      <CardBody className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 py-2 font-medium">Trades</th>
              <th className="px-3 py-2 font-medium">Net P&L</th>
            </tr>
          </thead>
          <tbody>
            {months.map(([m, v]) => (
              <tr key={m} className="border-b border-line/50 last:border-0">
                <td className="px-3 py-2 font-medium">{m}</td>
                <td className="px-3 py-2">{v.trades}</td>
                <td className={`px-3 py-2 font-medium ${v.pnl >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(v.pnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
