"use client";

import { Lock, MoreHorizontal, Users } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { PlaybookRow } from "@/lib/supabase/types";

export type PlaybookGridStats = {
  tradeCount: number;
  winRate: number;
  netPnl: number;
};

function playbookEmoji(name: string): string {
  const icons = ["📈", "🎯", "⚡", "🔥", "🚀", "💎", "🌊", "🦁"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % icons.length;
  return icons[h] ?? "📘";
}

function WinRateRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="url(#pbWinGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="pbWinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-fg">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function PlaybookGridCard({
  pb,
  stats,
  selected,
  onSelect,
  currency = "USD"
}: {
  pb: PlaybookRow;
  stats: PlaybookGridStats;
  selected: boolean;
  onSelect: () => void;
  currency?: string;
}) {
  const shared = Boolean((pb.rules as { shared?: boolean })?.shared);
  const desc = (pb.description ?? "").trim() || "Simple playbook that works for me best.";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col rounded-2xl border bg-bg-elevated p-4 text-left shadow-card transition",
        selected
          ? "border-brand-400 ring-2 ring-brand-500/30"
          : "border-line hover:border-brand-400/50 hover:shadow-brand-glow"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-soft text-lg">
            {playbookEmoji(pb.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{pb.name || "Untitled"}</div>
            <div className="text-xs font-medium text-sky-400">
              {stats.tradeCount} trade{stats.tradeCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-fg-muted">
          {shared ? (
            <>
              <Users className="h-3.5 w-3.5" /> Shared
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" /> Private
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <WinRateRing pct={stats.winRate} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-fg-subtle">Net P&L</div>
            <div
              className={cn(
                "text-sm font-semibold tabular-nums",
                stats.netPnl >= 0 ? "text-success" : "text-danger"
              )}
            >
              {formatCurrency(stats.netPnl, currency)}
            </div>
          </div>
        </div>
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-fg-muted">{desc}</p>
    </button>
  );
}
