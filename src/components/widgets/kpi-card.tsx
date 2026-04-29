"use client";

import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import type { ReactNode } from "react";

/**
 * KpiCard — compact, fintech-grade KPI tile. The right slot accepts a
 * GaugeRing, AvgWinLoss, or any visual. Used across Dashboard / Reports.
 */
export function KpiCard({
  title,
  value,
  hint,
  visual,
  tone,
  className
}: {
  title: string;
  value: ReactNode;
  hint?: ReactNode;
  visual?: ReactNode;
  tone?: "good" | "bad" | "neutral";
  className?: string;
}) {
  const valueColor =
    tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-fg";
  return (
    <Card className={cn("card-elev", className)}>
      <CardBody className="flex h-full items-center justify-between gap-3 p-4">
        <div className="flex flex-1 flex-col">
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{title}</div>
          <div className={cn("mt-1 text-xl font-semibold tabular leading-none", valueColor)}>{value}</div>
          {hint && <div className="mt-1 text-[11px] text-fg-muted">{hint}</div>}
        </div>
        {visual && <div className="shrink-0">{visual}</div>}
      </CardBody>
    </Card>
  );
}
