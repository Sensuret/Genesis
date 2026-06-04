"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import type { MultiPhaseResult, TimeToPassResult } from "@/lib/propfirm";
import { shortDate } from "@/lib/utils";

type PropFirmSimulationPanelProps = {
  result: MultiPhaseResult;
  timeToPass: TimeToPassResult;
  simPhaseIdx: number;
  onSimPhaseIdxChange: (idx: number) => void;
  tradesCount: number;
  loading?: boolean;
};

/**
 * Rule simulation vs filtered trades — shared by manual simulator and preset modal.
 */
export function PropFirmSimulationPanel({
  result,
  timeToPass,
  simPhaseIdx,
  onSimPhaseIdxChange,
  tradesCount,
  loading
}: PropFirmSimulationPanelProps) {
  if (loading) {
    return <div className="text-sm text-fg-muted">Loading trades…</div>;
  }

  if (!tradesCount) {
    return (
      <Empty
        title="Need trades"
        description="Upload or add trades to run a rule simulation against your history."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">Rule simulation vs your trades</h3>
        <Badge variant={result.passedAllPhases ? "success" : "danger"}>
          {result.passedAllPhases ? "ALL PHASES PASSED" : `FAILED ON ${result.failedAt ?? "—"}`}
        </Badge>
      </div>

      {result.phases.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {result.phases.map((p, i) => (
            <button
              key={p.phaseName}
              type="button"
              onClick={() => onSimPhaseIdxChange(i)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                simPhaseIdx === i
                  ? "border-brand-400 bg-brand-500/15 text-brand-200"
                  : "border-line bg-bg-soft text-fg-muted"
              }`}
            >
              {p.phaseName}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
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
                  Decision day: <span className="font-medium text-fg">{shortDate(p.finishedAt)}</span> ·{" "}
                  {p.tradingDays} trading days
                </div>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {result.phases.map((p, i) =>
        p.days?.length > 0 && (result.phases.length === 1 || i === simPhaseIdx) ? (
          <Card key={`equity-${i}`}>
            <CardHeader>
              <CardTitle>{p.phaseName} · equity curve</CardTitle>
            </CardHeader>
            <CardBody>
              <EquityCurveChart
                variant="purple"
                data={p.days.map((d) => ({ date: d.date, equity: d.equity, pnl: d.pnl }))}
              />
            </CardBody>
          </Card>
        ) : null
      )}

      <Card>
        <CardHeader>
          <CardTitle>Time to pass (estimate)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-sm text-fg-muted">{timeToPass.note}</div>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat
              label="Avg daily P&L"
              value={timeToPass.avgDailyPnl}
              format="currency"
              positive={timeToPass.avgDailyPnl >= 0}
            />
            <Stat label="Trading days" value={timeToPass.tradingDays} format="number" />
            <Stat label="Weeks" value={timeToPass.weeks} format="number" />
            <Stat label="Months" value={timeToPass.months} format="number" />
          </div>
          {!timeToPass.achievable && timeToPass.avgDailyPnl <= 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              At your current avg daily P&L the target is not reachable — focus on consistency before attempting a
              challenge.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
