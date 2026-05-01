"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = { id: "light" | "dark" | "grey" | "purple"; label: string; swatches: string[] };

const VARIANTS: Variant[] = [
  { id: "light", label: "Pure White", swatches: ["#ffffff", "#f6f7fb", "#111118"] },
  { id: "dark", label: "Pure Black", swatches: ["#090b0e", "#0e1016", "#f0f2f7"] },
  { id: "grey", label: "Grey", swatches: ["#161921", "#1c202a", "#ebedf4"] },
  { id: "purple", label: "Purple", swatches: ["#0b0912", "#100e1a", "#a866ff"] }
];

/**
 * Full 4-way theme picker for Settings → Appearance.
 * The simpler Sun/Moon toggle in the top bar only flips dark<->light.
 */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const current = (theme ?? "dark") as Variant["id"];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {VARIANTS.map((v) => {
        const active = current === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              document.documentElement.classList.add("theme-transition");
              setTheme(v.id);
              window.setTimeout(
                () => document.documentElement.classList.remove("theme-transition"),
                250
              );
            }}
            className={cn(
              "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition",
              active
                ? "border-brand-400 bg-brand-500/10 ring-2 ring-brand-500/30"
                : "border-line bg-bg-soft hover:border-brand-400/60"
            )}
          >
            <div className="flex h-16 overflow-hidden rounded-xl border border-line">
              <div className="flex-1" style={{ background: v.swatches[0] }} />
              <div className="flex-1" style={{ background: v.swatches[1] }} />
              <div className="flex-1 flex items-center justify-center" style={{ background: v.swatches[1] }}>
                <span className="text-xs font-bold" style={{ color: v.swatches[2] }}>
                  Aa
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{v.label}</span>
              {active && <Check className="h-4 w-4 text-brand-300" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
