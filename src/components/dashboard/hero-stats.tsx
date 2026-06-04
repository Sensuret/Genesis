"use client";

import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMoney } from "@/lib/filters/store";
import { cn, formatNumber, pnlColor } from "@/lib/utils";

// ---------------------------------------------------------------------
// Hero stat cards on the dashboard. Built to mirror TradeZella's hero row
// layout: each card has its own embedded visualisation (gauge, split bar,
// mini-rings) instead of being a single big number.
// ---------------------------------------------------------------------

export function HeroStatLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-fg-muted">
      <span>{label}</span>
      <Info className="h-3 w-3 text-fg-subtle" aria-hidden />
    </div>
  );
}

// ---------- Net P&L ----------------------------------------------------

export function NetPnlCard({ value, tradeCount }: { value: number; tradeCount: number }) {
  const { fmt } = useMoney();
  const positive = value >= 0;
  return (
    <Card className="relative flex h-24 flex-col justify-between p-3.5">
      <div className="flex items-start justify-between">
        <HeroStatLabel label="Net P&L" />
        <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-medium text-fg-muted">
          {tradeCount}
        </span>
      </div>
      <div className={cn("text-xl font-semibold tracking-tight", pnlColor(value))}>
        {fmt(value)}
      </div>
    </Card>
  );
}

// ---------- Trade win % -----------------------------------------------

export function WinRateCard({
  winRate,
  wins,
  breakeven,
  losses
}: {
  winRate: number;
  wins: number;
  breakeven: number;
  losses: number;
}) {
  return (
    <Card className="flex h-24 flex-col justify-between p-3.5">
      <HeroStatLabel label="Trade win %" />
      <div className="flex items-end justify-between gap-2">
        <div className="text-xl font-semibold tracking-tight text-fg">
          {winRate.toFixed(2)}%
        </div>
        <WinRateGauge wins={wins} breakeven={breakeven} losses={losses} />
      </div>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="rounded-md bg-success/15 px-1.5 py-0.5 font-medium text-success">{wins}</span>
        <span className="rounded-md bg-fg-muted/15 px-1.5 py-0.5 font-medium text-fg-muted">{breakeven}</span>
        <span className="rounded-md bg-danger/15 px-1.5 py-0.5 font-medium text-danger">{losses}</span>
      </div>
    </Card>
  );
}

function WinRateGauge({
  wins,
  breakeven,
  losses
}: {
  wins: number;
  breakeven: number;
  losses: number;
}) {
  const total = wins + breakeven + losses;
  // Geometry: half-circle arc (radius 30) drawn from (0, 35) sweeping to (70, 35).
  const radius = 30;
  const cx = 35;
  const cy = 35;
  const ARC = Math.PI * radius; // half circle length
  const winLen = total ? (wins / total) * ARC : 0;
  const beLen = total ? (breakeven / total) * ARC : 0;
  const lossLen = total ? (losses / total) * ARC : 0;
  return (
    <svg viewBox="0 0 70 40" className="h-10 w-16 shrink-0" aria-hidden>
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke="rgba(127,127,150,0.18)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {total > 0 && (
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgb(34 197 94)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${winLen} ${ARC}`}
        />
      )}
      {total > 0 && (
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgb(160 160 175)"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${beLen} ${ARC}`}
          strokeDashoffset={-winLen}
        />
      )}
      {total > 0 && (
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgb(239 68 68)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${lossLen} ${ARC}`}
          strokeDashoffset={-(winLen + beLen)}
        />
      )}
    </svg>
  );
}

// ---------- Avg win/loss trade ----------------------------------------

export function AvgWinLossCard({
  ratio,
  avgWin,
  avgLoss
}: {
  ratio: number;
  avgWin: number;
  avgLoss: number;
}) {
  const { fmt } = useMoney();
  const winMag = Math.max(avgWin, 0);
  const lossMag = Math.abs(Math.min(avgLoss, 0));
  const total = winMag + lossMag;
  const winPct = total ? (winMag / total) * 100 : 50;
  const lossPct = 100 - winPct;
  return (
    <Card className="flex h-24 flex-col justify-between p-3.5">
      <HeroStatLabel label="Avg win/loss trade" />
      <div className="text-xl font-semibold tracking-tight text-fg">
        {formatNumber(ratio, 2)}
      </div>
      <div className="space-y-1.5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-fg-muted/15">
          <div className="bg-success" style={{ width: `${winPct}%` }} />
          <div className="bg-danger" style={{ width: `${lossPct}%` }} />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="font-medium text-success">{fmt(avgWin)}</span>
          <span className="font-medium text-danger">{fmt(avgLoss)}</span>
        </div>
      </div>
    </Card>
  );
}

// ---------- Profit factor ---------------------------------------------

export function ProfitFactorCard({ value }: { value: number }) {
  // Map PF onto a 0-1 scale: 0 → red, 1 → amber, 2.5+ → green.
  const fill = clamp01((value - 0) / 3);
  const color =
    value >= 1.5 ? "rgb(34 197 94)" : value >= 1 ? "rgb(234 179 8)" : "rgb(239 68 68)";
  return (
    <Card className="flex h-24 flex-col justify-between p-3.5">
      <HeroStatLabel label="Profit factor" />
      <div className="flex items-end justify-between gap-2">
        <div className="text-xl font-semibold tracking-tight text-fg">
          {Number.isFinite(value) ? value.toFixed(2) : "—"}
        </div>
        <ProfitFactorRing fill={fill} color={color} />
      </div>
    </Card>
  );
}

function ProfitFactorRing({ fill, color }: { fill: number; color: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = fill * circumference;
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden>
      <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(127,127,150,0.18)" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

// ---------- Current streak --------------------------------------------

export function CurrentStreakCard({
  daysCurrent,
  daysType,
  daysBestWin,
  daysBestLoss,
  tradesCurrent,
  tradesType,
  tradesBestWin,
  tradesBestLoss
}: {
  daysCurrent: number;
  daysType: "win" | "loss" | null;
  daysBestWin: number;
  daysBestLoss: number;
  tradesCurrent: number;
  tradesType: "win" | "loss" | null;
  tradesBestWin: number;
  tradesBestLoss: number;
}) {
  return (
    <Card className="flex h-24 flex-col justify-between p-3.5">
      <HeroStatLabel label="Current streak" />
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <StreakColumn
          title="DAYS"
          value={daysCurrent}
          type={daysType}
          bestWin={daysBestWin}
          bestLoss={daysBestLoss}
          unit="d"
        />
        <StreakColumn
          title="TRADES"
          value={tradesCurrent}
          type={tradesType}
          bestWin={tradesBestWin}
          bestLoss={tradesBestLoss}
          unit="t"
        />
      </div>
    </Card>
  );
}

function StreakColumn({
  title,
  value,
  type,
  bestWin,
  bestLoss,
  unit
}: {
  title: string;
  value: number;
  type: "win" | "loss" | null;
  bestWin: number;
  bestLoss: number;
  unit: "d" | "t";
}) {
  const ringColor =
    type === "win"
      ? "rgb(34 197 94)"
      : type === "loss"
        ? "rgb(239 68 68)"
        : "rgb(160 160 175)";
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const ringMax = Math.max(bestWin, bestLoss, value, 1);
  const fill = Math.min(value / ringMax, 1);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r={radius} fill="none" stroke="rgba(127,127,150,0.18)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${fill * circumference} ${circumference}`}
          transform="rotate(-90 12 12)"
        />
        <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" className="fill-fg">
          {value}
        </text>
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-fg-subtle">
          {title}
        </span>
        <div className="flex min-w-0 items-center gap-1 text-[9px] leading-tight">
          <span className="whitespace-nowrap rounded bg-success/15 px-1 py-0.5 font-semibold text-success">
            {bestWin}
            {unit}
          </span>
          <span className="whitespace-nowrap rounded bg-danger/15 px-1 py-0.5 font-semibold text-danger">
            {bestLoss}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
