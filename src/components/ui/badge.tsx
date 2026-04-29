import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "danger" | "warn" | "brand";

const VARIANTS: Record<Variant, string> = {
  default: "bg-bg-soft text-fg-muted border-line",
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  brand: "bg-brand-500/15 text-brand-300 border-brand-500/30"
};

export function Badge({
  className,
  variant = "default",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
      {...rest}
    />
  );
}
