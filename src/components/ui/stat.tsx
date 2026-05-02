"use client";

import { cn, formatNumber, formatPercent, pnlColor } from "@/lib/utils";
import { useMoney } from "@/lib/filters/store";
import { formatMoney, convertFromUSD } from "@/lib/fx";
import { Card } from "./card";

type StatProps = {
  label: React.ReactNode;
  value: number | string | null | undefined;
  format?: "currency" | "number" | "percent" | "text";
  hint?: React.ReactNode;
  positive?: boolean;
  className?: string;
  /** Override the currency for currency-formatted stats (defaults to the active filter currency). */
  currency?: string;
  /** Optional explicit colour for the value text (overrides positive/pnlColor). */
  valueClassName?: string;
};

export function Stat({ label, value, format = "number", hint, positive, className, currency, valueClassName }: StatProps) {
  const { currency: activeCurrency, rates } = useMoney();
  const cur = currency ?? activeCurrency;
  const display =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? "—"
        : format === "currency"
          ? formatMoney(convertFromUSD(value, cur, rates), cur)
          : format === "percent"
            ? formatPercent(value)
            : formatNumber(value);

  const colorClass =
    valueClassName
      ? valueClassName
      : positive === undefined
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
