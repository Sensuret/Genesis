"use client";

import { Flag } from "lucide-react";
import { chineseZodiacEmoji, chineseZodiacOf } from "@/lib/zodiac";
import type { Resolution, ResolutionSection } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ResolutionCardProps = {
  resolution: Resolution;
  /** "portrait" matches paper/acrylic A-series; "landscape" is wide-printable. */
  orientation?: "portrait" | "landscape";
  /** Used as a tighter preview on the Created/Time-passed lists. */
  variant?: "full" | "preview";
};

/** Eyebrow colour map — matches the user's reference template. */
const SECTION_TONES: Record<
  ResolutionSection["color"],
  { text: string; underline: string; chip: string }
> = {
  orange: {
    text: "text-orange-400",
    underline: "from-orange-500/80 via-orange-400/60 to-transparent",
    chip: "bg-orange-500/15 text-orange-200 border-orange-500/30"
  },
  pink: {
    text: "text-pink-400",
    underline: "from-pink-500/80 via-pink-400/60 to-transparent",
    chip: "bg-pink-500/15 text-pink-200 border-pink-500/30"
  },
  green: {
    text: "text-emerald-400",
    underline: "from-emerald-500/80 via-emerald-400/60 to-transparent",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
  },
  purple: {
    text: "text-brand-300",
    underline: "from-brand-500/80 via-brand-400/60 to-transparent",
    chip: "bg-brand-500/15 text-brand-200 border-brand-500/30"
  },
  blue: {
    text: "text-sky-400",
    underline: "from-sky-500/80 via-sky-400/60 to-transparent",
    chip: "bg-sky-500/15 text-sky-200 border-sky-500/30"
  },
  amber: {
    text: "text-amber-400",
    underline: "from-amber-500/80 via-amber-400/60 to-transparent",
    chip: "bg-amber-500/15 text-amber-200 border-amber-500/30"
  }
};

/**
 * Visual renderer for a saved Resolution. Used both as the modal "open"
 * view (portrait or landscape) and inside the Created list as a preview
 * card. Year banner + Chinese-zodiac figure top, sections below, checker
 * flag in the bottom-left as a default decoration.
 */
export function ResolutionCard({
  resolution,
  orientation = "portrait",
  variant = "full"
}: ResolutionCardProps) {
  const zodiac = chineseZodiacOf(resolution.year);
  const emoji = chineseZodiacEmoji(resolution.year);
  const isLandscape = orientation === "landscape";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-bg-elevated text-fg shadow-card",
        isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]",
        variant === "preview" && "max-h-[420px]"
      )}
    >
      {/* Year banner */}
      <div className="relative flex items-start justify-between gap-4 border-b border-line bg-gradient-to-br from-amber-500/15 via-bg-elevated to-bg-elevated p-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
            Year of the {zodiac}
          </div>
          <h2
            className={cn(
              "font-extrabold tracking-tight",
              variant === "preview" ? "text-3xl" : "text-5xl",
              "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent"
            )}
          >
            {resolution.year}
          </h2>
          {resolution.title && (
            <div className="mt-1 text-xs text-fg-muted">{resolution.title}</div>
          )}
        </div>

        <div
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent",
            variant === "preview" ? "h-16 w-16 text-3xl" : "h-24 w-24 text-5xl"
          )}
          title={zodiac}
        >
          {emoji}
        </div>
      </div>

      {/* Sections */}
      <div
        className={cn(
          "relative grid gap-5 px-5 pb-12 pt-5",
          variant === "preview" ? "text-[11px]" : "text-sm",
          isLandscape ? "md:grid-cols-2" : "md:grid-cols-2"
        )}
      >
        {resolution.sections.map((section) => {
          const tone = SECTION_TONES[section.color] ?? SECTION_TONES.orange;
          return (
            <div key={section.id} className="space-y-3">
              <div>
                <h3 className={cn("font-bold uppercase tracking-wide", tone.text, variant === "preview" ? "text-sm" : "text-base")}>
                  {section.label}
                </h3>
                <div className={cn("mt-1 h-[2px] w-full bg-gradient-to-r", tone.underline)} />
              </div>

              <div className="space-y-3">
                {section.subsections.map((sub) => (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold underline decoration-amber-400/60 decoration-2 underline-offset-4">
                        {sub.label}
                      </span>
                    </div>
                    {sub.target && (
                      <div className="text-xs text-fg-muted">
                        <span className={cn("rounded-md border px-1.5 py-0.5", tone.chip)}>
                          Target
                        </span>{" "}
                        {sub.target}
                      </div>
                    )}
                    <ul className="space-y-1 pl-1">
                      {sub.items.map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-fg-muted">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                              item.checked
                                ? "border-emerald-400 bg-emerald-500/30 text-emerald-100"
                                : "border-line bg-bg-soft/40"
                            )}
                          >
                            {item.checked ? "✓" : ""}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checker-finish flag — bottom-left default decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200"
      >
        <Flag className="h-3 w-3" />
        Finish strong
      </div>
    </div>
  );
}
