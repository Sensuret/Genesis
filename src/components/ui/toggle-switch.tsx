"use client";

import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/** Purple → blue gradient slide toggle (matches GƎNƎSIS brand). */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  className,
  disabled
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
        checked
          ? "bg-brand-gradient shadow-brand-glow"
          : "bg-bg-soft border border-line",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
