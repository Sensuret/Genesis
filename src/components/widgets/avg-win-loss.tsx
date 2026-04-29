"use client";

import { formatCurrency } from "@/lib/utils";

/**
 * AvgWinLoss — Tradezella's signature dual-circle widget.
 * Shows average win on the left (green ring) and average loss on
 * the right (red ring) with a horizontal split bar in between
 * representing the relative magnitudes.
 */
export function AvgWinLoss({
  avgWin,
  avgLoss
}: {
  avgWin: number;
  avgLoss: number; // pass as positive magnitude
}) {
  const total = Math.max(0.0001, avgWin + Math.abs(avgLoss));
  const winPct = (avgWin / total) * 100;
  const lossPct = 100 - winPct;
  const ratio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Pill tone="good" value={formatCurrency(avgWin)} hint="Avg win" />
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-wide text-fg-subtle">W : L</div>
          <div className="text-sm font-semibold text-fg">{ratio.toFixed(2)}</div>
        </div>
        <Pill tone="bad" value={`-${formatCurrency(Math.abs(avgLoss))}`} hint="Avg loss" />
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-soft">
        <div
          className="h-full bg-success"
          style={{ width: `${winPct}%`, transition: "width .5s ease-out" }}
        />
        <div
          className="h-full bg-danger"
          style={{ width: `${lossPct}%`, transition: "width .5s ease-out" }}
        />
      </div>
    </div>
  );
}

function Pill({ tone, value, hint }: { tone: "good" | "bad"; value: string; hint: string }) {
  const ring = tone === "good" ? "border-success/40 text-success bg-success/10" : "border-danger/40 text-danger bg-danger/10";
  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-[11px] font-semibold tabular ${ring}`}>
        {tone === "good" ? "+" : "-"}
      </div>
      <div className="mt-1 text-xs font-semibold tabular text-fg">{value}</div>
      <div className="text-[10px] text-fg-subtle">{hint}</div>
    </div>
  );
}
