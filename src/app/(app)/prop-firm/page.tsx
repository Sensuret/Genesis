"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  calculateLotSize,
  estimateTimeToPass,
  simulateMultiPhaseChallenge,
  type DdMode,
  type MultiPhaseRules,
  type PhaseRules
} from "@/lib/propfirm";
import { applyAllFilters } from "@/lib/analytics";
import { useFilters } from "@/lib/filters/store";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { formatCurrency, formatPercent, shortDate } from "@/lib/utils";

type PhaseTemplate = "1" | "2" | "3";

const PHASE_TEMPLATES: Record<PhaseTemplate, PhaseRules[]> = {
  "1": [
    { name: "Funded (1-Step)", profitTargetPct: 0, dailyDdPct: 0, maxDdPct: 6, maxDdMode: "equity" }
  ],
  "2": [
    { name: "Phase 1", profitTargetPct: 8, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 5 },
    { name: "Phase 2", profitTargetPct: 5, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 5 }
  ],
  "3": [
    { name: "Phase 1", profitTargetPct: 8, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 },
    { name: "Phase 2", profitTargetPct: 5, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 },
    { name: "Phase 3 (Verification)", profitTargetPct: 0, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 }
  ]
};

export default function PropFirmPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  const [accountSize, setAccountSize] = useState(100_000);
  const [template, setTemplate] = useState<PhaseTemplate>("2");
  const [phases, setPhases] = useState<PhaseRules[]>(PHASE_TEMPLATES["2"]);

  // Lot size calc state
  const [riskPct, setRiskPct] = useState(1);
  const [stopDistance, setStopDistance] = useState(20);
  const [pipValuePerLot, setPipValuePerLot] = useState(10);

  const config: MultiPhaseRules = useMemo(
    () => ({ accountSize, phases, singlePhaseEquityOnly: phases.length === 1 }),
    [accountSize, phases]
  );

  const result = useMemo(() => simulateMultiPhaseChallenge(filtered, config), [filtered, config]);

  const lots = useMemo(
    () => calculateLotSize({ accountSize, riskPct, stopDistance, pipValuePerLot }),
    [accountSize, riskPct, stopDistance, pipValuePerLot]
  );

  const timeToPass = useMemo(() => {
    const firstTarget = phases.find((p) => p.profitTargetPct > 0)?.profitTargetPct ?? 0;
    return estimateTimeToPass({ accountSize, profitTargetPct: firstTarget, recentTrades: filtered });
  }, [accountSize, phases, filtered]);

  function applyTemplate(t: PhaseTemplate) {
    setTemplate(t);
    setPhases(PHASE_TEMPLATES[t].map((p) => ({ ...p })));
  }

  function updatePhase(i: number, patch: Partial<PhaseRules>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prop Firm Challenge Calculator"
        description="Replay your trades against any prop firm rule set — multi-phase, lot sizing, and a time-to-pass estimate."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Account &amp; phases</CardTitle>
          <div className="flex items-center gap-2">
            {(["1", "2", "3"] as PhaseTemplate[]).map((t) => (
              <Button
                key={t}
                variant={template === t ? "primary" : "secondary"}
                size="sm"
                onClick={() => applyTemplate(t)}
              >
                {t === "1" ? "1-Step / Instant" : `${t} Phase`}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Account size ($)">
              <Input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Number(e.target.value))}
              />
            </Field>
            <div className="md:col-span-2 self-end text-xs text-fg-muted">
              {phases.length === 1
                ? "Single-phase / instant: max DD is enforced as equity-based throughout."
                : `Sequential: pass Phase 1 to advance, then Phase 2, etc. ${phases.length} phases configured.`}
            </div>
          </div>

          <div className="space-y-3">
            {phases.map((p, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-line bg-bg-elevated p-4 md:grid-cols-6">
                <Field label="Name">
                  <Input value={p.name} onChange={(e) => updatePhase(i, { name: e.target.value })} />
                </Field>
                <Field label="Profit target %">
                  <Input
                    type="number"
                    step="0.1"
                    value={p.profitTargetPct}
                    onChange={(e) => updatePhase(i, { profitTargetPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Daily DD %">
                  <Input
                    type="number"
                    step="0.1"
                    value={p.dailyDdPct}
                    onChange={(e) => updatePhase(i, { dailyDdPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max DD %">
                  <Input
                    type="number"
                    step="0.1"
                    value={p.maxDdPct}
                    onChange={(e) => updatePhase(i, { maxDdPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max DD type">
                  <select
                    className="h-9 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm"
                    value={p.maxDdMode}
                    onChange={(e) => updatePhase(i, { maxDdMode: e.target.value as DdMode })}
                  >
                    <option value="balance">Balance-based (static)</option>
                    <option value="equity">Equity-based (trailing)</option>
                  </select>
                </Field>
                <Field label="Min trading days">
                  <Input
                    type="number"
                    value={p.minTradingDays ?? 0}
                    onChange={(e) => updatePhase(i, { minTradingDays: Number(e.target.value) })}
                  />
                </Field>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {!filtered.length ? (
        <Empty title="Need trades" description="Upload or add trades to simulate a prop firm challenge." />
      ) : loading ? (
        <div className="text-sm text-fg-muted">Loading…</div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Result</CardTitle>
              <Badge variant={result.passedAllPhases ? "success" : "danger"}>
                {result.passedAllPhases ? "ALL PHASES PASSED" : `FAILED ON ${result.failedAt}`}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              {result.phases.map((p, i) => (
                <div key={i} className="rounded-xl border border-line bg-bg-elevated p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-medium">{p.phaseName}</div>
                    <Badge variant={p.passed ? "success" : "danger"}>{p.passed ? "Passed" : "Failed"}</Badge>
                  </div>
                  <div className="text-sm text-fg-muted">{p.reason}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <Stat label="Final equity" value={p.finalEquity} format="currency" />
                    <Stat label="Highest equity" value={p.highestEquity} format="currency" />
                    <Stat label="Worst daily DD" value={p.worstDailyDdPct} format="percent" positive={false} />
                    <Stat label="Worst overall DD" value={p.worstOverallDdPct} format="percent" positive={false} />
                  </div>
                  {p.finishedAt && (
                    <div className="mt-3 text-xs text-fg-muted">
                      Decision day: <span className="font-medium text-fg">{shortDate(p.finishedAt)}</span> · {p.tradingDays} trading days
                    </div>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          {result.phases[0]?.days?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Equity over the simulation (all phases)</CardTitle>
              </CardHeader>
              <CardBody>
                <EquityCurveChart
                  data={result.phases.flatMap((p) =>
                    p.days.map((d) => ({ date: d.date, equity: d.equity, pnl: d.pnl }))
                  )}
                />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Time to pass (estimate)</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="text-sm text-fg-muted">{timeToPass.note}</div>
              <div className="grid gap-3 md:grid-cols-4">
                <Stat label="Avg daily P&L" value={timeToPass.avgDailyPnl} format="currency" positive={timeToPass.avgDailyPnl >= 0} />
                <Stat label="Trading days" value={timeToPass.tradingDays} format="number" />
                <Stat label="Weeks" value={timeToPass.weeks} format="number" />
                <Stat label="Months" value={timeToPass.months} format="number" />
              </div>
              {!timeToPass.achievable && timeToPass.avgDailyPnl <= 0 && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                  At your current avg daily P&L the target is not reachable — focus on consistency before attempting a challenge.
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lot size calculator</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Risk %">
              <Input
                type="number"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value))}
              />
            </Field>
            <Field label="Stop distance (pips/points)">
              <Input
                type="number"
                step="0.1"
                value={stopDistance}
                onChange={(e) => setStopDistance(Number(e.target.value))}
              />
            </Field>
            <Field label="$ per pip per 1.0 lot">
              <Input
                type="number"
                step="0.01"
                value={pipValuePerLot}
                onChange={(e) => setPipValuePerLot(Number(e.target.value))}
              />
            </Field>
            <Field label="Account size ($)">
              <Input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Risk amount" value={lots.riskAmount} format="currency" />
            <Stat label="Recommended lots" value={lots.recommendedLots.toFixed(3)} format="text" />
            <Stat label="Lots (rounded down)" value={lots.lotsRoundedDown.toFixed(2)} format="text" />
          </div>
          <div className="text-xs text-fg-muted">
            Forex majors: $10/pip per 1.0 std lot. Indices (NAS100/US30) ≈ $1/point per 1.0 lot. Adjust to your broker's contract.
          </div>
        </CardBody>
      </Card>
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
