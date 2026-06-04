"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function GsMark({
  className,
  fontSize = 36
}: {
  className?: string;
  fontSize?: number;
}) {
  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="6 0 60 44"
      className={cn("logo-mark-svg block w-auto shrink-0 overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="48%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <text
        x="36"
        y="34"
        textAnchor="middle"
        fill={`url(#${gradId})`}
        fontSize={fontSize}
        className="font-display font-extrabold"
        style={{ letterSpacing: "-0.05em" }}
      >
        GS
      </text>
    </svg>
  );
}
