"use client";

import { cn, formatCurrency, formatNumber, formatPercent, pnlColor } from "@/lib/utils";
import { useFilters } from "@/lib/filters/store";
import { Card } from "./card";

type StatProps = {
  label: string;
  value: number | string | null | undefined;
  format?: "currency" | "number" | "percent" | "text";
  hint?: React.ReactNode;
  positive?: boolean;
  className?: string;
  /** Override the currency for currency-formatted stats (defaults to the active filter currency). */
  currency?: string;
};

export function Stat({ label, value, format = "number", hint, positive, className, currency }: StatProps) {
  const { filters } = useFilters();
  const cur = currency ?? filters.currency;
  const display =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? "—"
        : format === "currency"
          ? formatCurrency(value, cur)
          : format === "percent"
            ? formatPercent(value)
            : formatNumber(value);

  const colorClass =
    positive === undefined
      ? "text-fg"
      : positive
        ? "text-success"
        : typeof value === "number"
          ? pnlColor(value)
          : "text-fg";

  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
        {label}
      </div>
      <div className={cn("text-2xl font-semibold tracking-tight", colorClass)}>{display}</div>
      {hint && <div className="mt-2 text-xs text-fg-subtle">{hint}</div>}
    </Card>
  );
}
