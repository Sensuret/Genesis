"use client";

import { Moon, Sun, Cloudy } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "gray", label: "Slate", icon: Cloudy },
  { id: "light", label: "Light", icon: Sun }
] as const;

/**
 * 3-way theme switcher. Renders as a segmented control. Falls back to a
 * neutral placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dim = size === "sm" ? "h-6 px-2 text-[10px]" : "h-8 px-2.5 text-xs";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  if (!mounted) {
    return <div className={cn("inline-flex rounded-lg bg-bg-soft", dim, "w-[124px]")} />;
  }
  const active = theme === "system" ? "dark" : theme;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-bg-soft p-1">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-label={`${opt.label} theme`}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg font-medium transition",
              dim,
              isActive
                ? "bg-bg-elevated text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className={icon} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
