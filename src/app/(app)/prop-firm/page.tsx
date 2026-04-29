"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { useTrades } from "@/lib/hooks/use-trades";
import { simulatePropChallenge, DEFAULT_RULES, type PropRules } from "@/lib/propfirm";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { formatCurrency, formatPercent, shortDate } from "@/lib/utils";

export default function PropFirmPage() {
  const { trades, loading } = useTrades();
  const [rules, setRules] = useState<PropRules>(DEFAULT_RULES);

  const result = useMemo(() => simulatePropChallenge(trades, rules), [trades, rules]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prop Firm Challenge Calculator"
        description="Replay your real trades against any prop firm rule set. See exactly which day a challenge would fail or pass."
      />

      <Card>
        <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-4">
          <Field label="Account size ($)">
            <Input type="number" value={rules.accountSize} onChange={(e) => setRules({ ...rules, accountSize: Number(e.target.value) })} />
          </Field>
          <Field label="Daily DD %">
            <Input type="number" step="0.1" value={rules.dailyDdPct} onChange={(e) => setRules({ ...rules, dailyDdPct: Number(e.target.value) })} />
          </Field>
          <Field label="Max DD %">
            <Input type="number" step="0.1" value={rules.maxDdPct} onChange={(e) => setRules({ ...rules, maxDdPct: Number(e.target.value) })} />
          </Field>
          <Field label="Profit target %">
            <Input type="number" step="0.1" value={rules.profitTargetPct ?? ""} onChange={(e) => setRules({ ...rules, profitTargetPct: Number(e.target.value) })} />
          </Field>
        </CardBody>
      </Card>

      {!trades.length ? (
        <Empty title="Need trades" description="Upload or add trades to simulate a prop firm challenge." />
      ) : loading ? (
        <div className="text-sm text-fg-muted">Loading…</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <Badge variant={result.passed ? "success" : "danger"}>
                {result.passed ? "PASSED" : "FAILED"}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="text-sm text-fg-muted">{result.reason}</div>
              <div className="grid gap-4 md:grid-cols-4">
                <Stat label="Final equity" value={result.finalEquity} format="currency" />
                <Stat label="Highest equity" value={result.highestEquity} format="currency" />
                <Stat label="Worst daily DD" value={result.worstDailyDdPct} format="percent" positive={false} />
                <Stat label="Worst overall DD" value={result.worstOverallDdPct} format="percent" positive={false} />
              </div>
              {result.finishedAt && (
                <div className="rounded-xl border border-line bg-bg-soft/40 p-3 text-sm">
                  Decision day: <span className="font-medium">{shortDate(result.finishedAt)}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Equity over the simulation</CardTitle></CardHeader>
            <CardBody>
              <EquityCurveChart
                data={result.days.map((d) => ({ date: d.date, equity: d.equity, pnl: d.pnl }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Day-by-day log</CardTitle></CardHeader>
            <CardBody className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-fg-subtle">
                  <tr>
                    {["Date", "P&L", "Equity", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.days.map((d) => (
                    <tr key={d.date} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2">{shortDate(d.date)}</td>
                      <td className={`px-3 py-2 ${d.pnl >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(d.pnl)}</td>
                      <td className="px-3 py-2">{formatCurrency(d.equity)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={d.status === "ok" ? "default" : d.status === "target-hit" ? "success" : "danger"}>
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
