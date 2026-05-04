"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import {
  GRADIENT_SWATCHES,
  SOLID_SWATCHES
} from "@/lib/notebook/resolution-backgrounds";
import type { ResolutionBackground } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Props = {
  value: ResolutionBackground | undefined;
  onChange: (bg: ResolutionBackground) => void;
  /** When true the picker is rendered as a small ring icon that expands on
   *  click (used inside the modal toolbar). When false it renders inline
   *  always-open (used on the Create form). */
  compact?: boolean;
};

function isActive(value: ResolutionBackground | undefined, kind: "theme" | "solid" | "gradient", id?: string): boolean {
  if (!value) return kind === "theme";
  if (kind === "theme") return value.kind === "theme";
  if (kind === "solid") return value.kind === "solid" && value.color === id;
  if (kind === "gradient") return value.kind === "gradient" && value.preset === id;
  return false;
}

export function ResolutionBgPicker({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(!compact);

  const trigger = compact && (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-fg/20 shadow-inner transition hover:scale-110"
      style={{
        background:
          "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)"
      }}
      aria-label="Pick background"
      title="Background colour"
    >
      <Palette className="h-3.5 w-3.5 text-white drop-shadow" />
    </button>
  );

  return (
    <div className={cn("relative", compact && "inline-flex")}>
      {trigger}
      {open && (
        <div
          className={cn(
            "z-[1200] space-y-3 rounded-xl border border-line bg-bg-elevated p-3 shadow-card",
            compact
              ? "absolute right-0 top-10 w-[320px]"
              : "w-full"
          )}
        >
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Theme
            </div>
            <button
              type="button"
              onClick={() => onChange({ kind: "theme" })}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition",
                isActive(value, "theme")
                  ? "border-brand-400 bg-brand-500/10 text-fg"
                  : "border-line bg-bg-soft/40 text-fg-muted hover:border-brand-400 hover:text-fg"
              )}
            >
              <span>App default (reacts to theme)</span>
              {isActive(value, "theme") && <Check className="h-3.5 w-3.5 text-brand-300" />}
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Solid colours
            </div>
            <div className="flex flex-wrap gap-2">
              {SOLID_SWATCHES.map((sw) => (
                <button
                  key={sw.id}
                  type="button"
                  onClick={() => onChange({ kind: "solid", color: sw.id })}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    isActive(value, "solid", sw.id)
                      ? "border-brand-400 ring-2 ring-brand-400/40 ring-offset-2 ring-offset-bg-elevated"
                      : "border-fg/20 hover:scale-110"
                  )}
                  style={{ background: sw.css }}
                  aria-label={sw.label}
                  title={sw.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Preset gradients
            </div>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENT_SWATCHES.map((sw) => (
                <button
                  key={sw.id}
                  type="button"
                  onClick={() => onChange({ kind: "gradient", preset: sw.id })}
                  className={cn(
                    "aspect-square rounded-xl border-2 transition",
                    isActive(value, "gradient", sw.id)
                      ? "border-brand-400 ring-2 ring-brand-400/40 ring-offset-2 ring-offset-bg-elevated"
                      : "border-fg/20 hover:scale-110"
                  )}
                  style={{ background: sw.css }}
                  aria-label={sw.label}
                  title={sw.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
