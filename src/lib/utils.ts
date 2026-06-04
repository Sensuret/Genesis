import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number | null | undefined, currency = "USD") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2
  });
  return formatter.format(n);
}

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(n);
}

export function formatPercent(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function pnlColor(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return "text-fg-muted";
  return n > 0 ? "text-success" : "text-danger";
}

export function safeDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function shortDate(d: string | Date | null | undefined) {
  const dt = safeDate(d);
  return dt ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
}

export function isoDate(d: string | Date | null | undefined) {
  const dt = safeDate(d);
  return dt ? dt.toISOString().slice(0, 10) : null;
}
