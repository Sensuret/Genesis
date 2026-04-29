"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  computeGsScoreParts, equityCurve, gsScore, maxDrawdown, netPnl, profitFactor,
  recoveryFactor, winRate, performanceBy
} from "@/lib/analytics";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { GsScoreRadar } from "@/components/charts/gs-score-radar";
import { PerfBar } from "@/components/charts/perf-bar";
import { Empty } from "@/components/ui/empty";

export default function BacktestingPage() {
  const { trades, files, loading } = useTrades();
  const [fileId, setFileId] = useState<string>("all");

  const filtered = useMemo(
    () => (fileId === "all" ? trades : trades.filter((t) => t.file_id === fileId)),
    [trades, fileId]
  );

  if (loading) return <div className="text-sm text-fg-muted">Loading…</div>;
  if (!trades.length) return <Empty title="Backtesting needs data" description="Upload a historical trade file to simulate." />;

  const parts = computeGsScoreParts(filtered);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtesting Dashboard"
        description="Simulated analytics from any uploaded historical trade file."
        actions={
          <Select value={fileId} onChange={(e) => setFileId(e.target.value)} className="w-56">
            <option value="all">All files</option>
            {files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Net P&L" value={netPnl(filtered)} format="currency" positive={netPnl(filtered) >= 0} />
        <Stat label="Win rate" value={winRate(filtered)} format="percent" />
        <Stat label="Profit factor" value={profitFactor(filtered)} format="number" />
        <Stat label="Max DD" value={maxDrawdown(filtered)} format="currency" positive={false} />
        <Stat label="Recovery" value={recoveryFactor(filtered)} format="number" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Equity curve</CardTitle></CardHeader>
          <CardBody><EquityCurveChart data={equityCurve(filtered)} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>GS Score</CardTitle></CardHeader>
          <CardBody><GsScoreRadar parts={parts} score={gsScore(parts)} /></CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance by setup</CardTitle></CardHeader>
          <CardBody><PerfBar data={performanceBy(filtered, "setup_tag").slice(0, 10)} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Performance by pair</CardTitle></CardHeader>
          <CardBody><PerfBar data={performanceBy(filtered, "pair").slice(0, 10)} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
