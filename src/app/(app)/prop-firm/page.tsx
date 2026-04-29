"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  simulatePropChallenge,
  DEFAULT_RULES,
  DEFAULT_PHASE_TARGETS,
  ACCOUNT_SIZES,
  DAILY_DD_OPTIONS,
  MAX_DD_OPTIONS,
  type PropRules,
  type PhaseRule
} from "@/lib/propfirm";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { formatCurrency, shortDate, cn } from "@/lib/utils";

export default function PropFirmPage() {
  const { trades, loading } = useTrades();
  const [rules, setRules] = useState<PropRules>(DEFAULT_RULES);

  const result = useMemo(() => simulatePropChallenge(trades, rules), [trades, rules]);
  const phaseCount = rules.phases.length as 1 | 2 | 3;

  function updatePhaseCount(n: 1 | 2 | 3) {
    const targets = DEFAULT_PHASE_TARGETS[n];
    const phases: PhaseRule[] = targets.map((t) => ({ profitTargetPct: t }));
    setRules({ ...rules, phases });
  }

  function setPhaseTarget(i: number, val: number) {
    const phases = rules.phases.map((p, idx) =>
      idx === i ? { ...p, profitTargetPct: val } : p
    );
    setRules({ ...rules, phases });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prop Firm Challenge Calculator"
        description="Replay your real trades against any prop firm rule set. Configure 1, 2 or 3 phases — see exactly which day each phase would pass or fail."
      />

      <Card>
        <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Account size">
              <Select
                value={rules.accountSize.toString()}
                onChange={(v) => setRules({ ...rules, accountSize: Number(v) })}
                options={ACCOUNT_SIZES.map((s) => ({
                  value: s.toString(),
                  label: `$${(s / 1000).toFixed(0)}k`
                }))}
              />
            </Field>
            <Field label="Daily DD %">
              <Select
                value={rules.dailyDdPct.toString()}
                onChange={(v) => setRules({ ...rules, dailyDdPct: Number(v) })}
                options={DAILY_DD_OPTIONS.map((d) => ({
                  value: d.toString(),
                  label: d === 0 ? "None" : `${d}%`
                }))}
              />
            </Field>
            <Field label="Max DD %">
              <Select
                value={rules.maxDdPct.toString()}
                onChange={(v) => setRules({ ...rules, maxDdPct: Number(v) })}
                options={MAX_DD_OPTIONS.map((d) => ({ value: d.toString(), label: `${d}%` }))}
              />
            </Field>
            <Field label="DD type">
              <Select
                value={rules.trailingDd ? "trailing" : "static"}
                onChange={(v) => setRules({ ...rules, trailingDd: v === "trailing" })}
                options={[
                  { value: "static", label: "Static" },
                  { value: "trailing", label: "Trailing" }
                ]}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Phases</Label>
            <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-bg-soft p-1">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updatePhaseCount(n)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-medium",
                    phaseCount === n
                      ? "bg-bg-elevated text-fg shadow-sm"
                      : "text-fg-muted hover:text-fg"
                  )}
                >
                  {n}-Phase
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {rules.phases.map((p, i) => (
              <Field key={i} label={`Phase ${i + 1} target %`}>
                <Input
                  type="number"
                  step="0.1"
                  value={p.profitTargetPct}
                  onChange={(e) => setPhaseTarget(i, Number(e.target.value))}
                />
              </Field>
            ))}
          </div>

          <div className="text-xs text-fg-muted">
            Combined target across all phases:&nbsp;
            <span className="font-semibold text-fg">
              {rules.phases.reduce((s, p) => s + p.profitTargetPct, 0).toFixed(1)}%
            </span>
            &nbsp;· Min trading days per phase:
            <input
              type="number"
              className="ml-2 w-16 rounded-md border border-line bg-bg-soft px-2 py-1 text-xs text-fg"
              value={rules.minTradingDays ?? 0}
              onChange={(e) => setRules({ ...rules, minTradingDays: Number(e.target.value) || 0 })}
            />
          </div>
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
              <CardTitle>Overall</CardTitle>
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
            </CardBody>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {result.phases.map((phase) => (
              <Card key={phase.phaseIndex} className="card-elev">
                <CardHeader>
                  <CardTitle>{phase.phaseLabel}</CardTitle>
                  <Badge variant={phase.passed ? "success" : "danger"}>
                    {phase.passed ? "PASS" : "FAIL"}
                  </Badge>
                </CardHeader>
                <CardBody className="space-y-2 text-sm">
                  <div className="text-fg-muted">{phase.reason}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Mini label="Target" value={`${rules.phases[phase.phaseIndex].profitTargetPct}%`} />
                    <Mini label="Trading days" value={phase.tradingDays.toString()} />
                    <Mini label="Final" value={formatCurrency(phase.finalEquity)} />
                    <Mini label="Highest" value={formatCurrency(phase.highestEquity)} />
                    <Mini label="Worst daily DD" value={`${phase.worstDailyDdPct.toFixed(2)}%`} />
                    <Mini label="Worst overall DD" value={`${phase.worstOverallDdPct.toFixed(2)}%`} />
                  </div>
                  {phase.finishedAt && (
                    <div className="rounded-lg border border-line bg-bg-soft/40 p-2 text-xs">
                      Decision day: <span className="font-medium text-fg">{shortDate(phase.finishedAt)}</span>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Equity across the simulation</CardTitle></CardHeader>
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
                  {result.days.map((d, i) => (
                    <tr key={`${d.date}-${i}`} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2">{shortDate(d.date)}</td>
                      <td className={`px-3 py-2 ${d.pnl >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(d.pnl)}</td>
                      <td className="px-3 py-2 tabular">{formatCurrency(d.equity)}</td>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-soft/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="text-sm font-semibold tabular text-fg">{value}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-line bg-bg-soft px-3 text-sm text-fg outline-none focus:border-brand-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
