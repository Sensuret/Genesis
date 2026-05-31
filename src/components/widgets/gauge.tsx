"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * GaugeRing — Tradezella-style ring widget.
 * Renders a thick circular arc with a centered value. Color encodes
 * how strong / healthy the metric is.
 *
 * Used for: Trade Win %, Profit Factor, Day Win %, etc.
 */
export function GaugeRing({
  value,
  max = 100,
  size = 96,
  thickness = 9,
  label,
  sublabel,
  format = "percent",
  tone = "auto",
  className
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
  format?: "percent" | "number" | "x";
  tone?: "auto" | "good" | "bad" | "neutral" | "accent";
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = useMemo(() => {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(1, safe / Math.max(0.0001, max)));
  }, [value, max]);

  const stroke =
    tone === "good"
      ? "rgb(var(--pos))"
      : tone === "bad"
        ? "rgb(var(--neg))"
        : tone === "accent"
          ? "rgb(var(--accent))"
          : tone === "neutral"
            ? "rgb(var(--fg-muted))"
            : pct >= 0.6
              ? "rgb(var(--pos))"
              : pct >= 0.35
                ? "rgb(var(--accent))"
                : "rgb(var(--neg))";

  const display =
    format === "percent"
      ? `${(value).toFixed(1)}%`
      : format === "x"
        ? `${value.toFixed(2)}`
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgb(var(--line))"
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - c * pct}
          style={{ transition: "stroke-dashoffset .6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-base font-semibold tabular text-fg">{display}</div>
        {sublabel && <div className="text-[10px] text-fg-subtle">{sublabel}</div>}
      </div>
      {label && <div className="mt-1 text-xs text-fg-muted">{label}</div>}
    </div>
  );
}
