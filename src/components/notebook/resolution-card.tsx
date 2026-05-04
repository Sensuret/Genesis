"use client";

import { Flag } from "lucide-react";
import { chineseZodiacEmoji, chineseZodiacOf } from "@/lib/zodiac";
import { resolveBackgroundCss } from "@/lib/notebook/resolution-backgrounds";
import type { Resolution, ResolutionSection } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ResolutionCardProps = {
  resolution: Resolution;
  /** "portrait" matches paper/acrylic A-series; "landscape" is wide-printable. */
  orientation?: "portrait" | "landscape";
  /** Used as a tighter preview on the Created/Time-passed lists. */
  variant?: "full" | "preview";
  /**
   * Optional click handler for individual bullet checkboxes. When
   * provided, each bullet renders as a clickable button that flips its
   * `checked` flag — used in Created / Time-passed lists and in the
   * detail modal so users can mark progress on goals.
   */
  onToggleItem?: (sectionId: string, subId: string, itemId: string, next: boolean) => void;
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
  variant = "full",
  onToggleItem
}: ResolutionCardProps) {
  const zodiac = chineseZodiacOf(resolution.year);
  const emoji = chineseZodiacEmoji(resolution.year);
  const isLandscape = orientation === "landscape";
  const bg = resolveBackgroundCss(resolution.background);
  const showYearLabel = resolution.show_year_label !== false;
  const showGenesisLogo = resolution.show_genesis_logo !== false;

  // When a custom background is applied we want to anchor text colour to a
  // tone that always reads against the chosen colour. "light" → soft white
  // body text + warm-amber accents (works on dark or saturated grounds).
  // "dark" → near-black body text (works on cream / pastel gradients).
  const onLight = bg?.text === "dark";
  const bodyText = onLight ? "rgb(15 23 42)" : "rgb(248 250 252)";
  const mutedText = onLight ? "rgb(71 85 105)" : "rgba(248,250,252,0.78)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line shadow-card",
        !bg && "bg-bg-elevated text-fg",
        isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]",
        variant === "preview" && "max-h-[420px]"
      )}
      style={bg ? { background: bg.css, color: bodyText } : undefined}
    >
      {/* Year banner */}
      <div
        className={cn(
          "relative flex items-start justify-between gap-4 border-b p-5",
          bg ? "border-white/10" : "border-line bg-gradient-to-br from-amber-500/15 via-bg-elevated to-bg-elevated"
        )}
      >
        <div>
          {showYearLabel && (
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={bg ? { color: onLight ? "rgb(120 53 15)" : "rgba(252 211 77 / 0.95)" } : undefined}
            >
              {!bg && (
                <span className="text-amber-300/80">Year of the {zodiac}</span>
              )}
              {bg && <span>Year of the {zodiac}</span>}
            </div>
          )}
          <h2
            className={cn(
              "font-extrabold tracking-tight",
              variant === "preview" ? "text-3xl" : "text-5xl",
              !bg && "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent"
            )}
            style={bg ? { color: onLight ? "rgb(120 53 15)" : "rgb(252 211 77)" } : undefined}
          >
            {resolution.year}
          </h2>
          {resolution.title && (
            <div className="mt-1 text-xs" style={bg ? { color: mutedText } : undefined}>
              <span className={!bg ? "text-fg-muted" : undefined}>{resolution.title}</span>
            </div>
          )}
        </div>

        {/* Year-cycle animal — always rendered, not togglable, reacts to year. */}
        <div
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border",
            bg
              ? "border-white/20 bg-white/10"
              : "border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent",
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
                      <div className="text-xs" style={bg ? { color: mutedText } : undefined}>
                        <span className={cn("rounded-md border px-1.5 py-0.5", tone.chip)}>
                          Target
                        </span>{" "}
                        <span className={!bg ? "text-fg-muted" : undefined}>{sub.target}</span>
                      </div>
                    )}
                    <ul className="space-y-1 pl-1">
                      {sub.items.map((item) => {
                        const interactive = !!onToggleItem;
                        return (
                          <li
                            key={item.id}
                            className={cn("flex items-start gap-2", !bg && "text-fg-muted")}
                            style={bg ? { color: mutedText } : undefined}
                          >
                            <button
                              type="button"
                              tabIndex={interactive ? 0 : -1}
                              disabled={!interactive}
                              onClick={(e) => {
                                if (!interactive) return;
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleItem!(section.id, sub.id, item.id, !item.checked);
                              }}
                              className={cn(
                                "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none",
                                item.checked
                                  ? "border-emerald-400 bg-emerald-500/30 text-emerald-100"
                                  : "border-line bg-bg-soft/40 text-transparent",
                                interactive && "cursor-pointer hover:border-emerald-400/80",
                                !interactive && "cursor-default"
                              )}
                              aria-label={item.checked ? "Mark as not done" : "Mark as done"}
                              aria-pressed={!!item.checked}
                            >
                              {item.checked ? "✓" : ""}
                            </button>
                            <span
                              className={cn(
                                "flex-1",
                                item.checked && "line-through opacity-70"
                              )}
                            >
                              {item.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checker-finish flag — bottom-left default decoration. On a light
          background the amber-on-cream gradient washes out, so we swap to
          a contrast-safe deep-amber tone with a darker chip. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
          onLight
            ? "border-amber-700/40 bg-amber-500/25 text-amber-900"
            : "border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent text-amber-200"
        )}
      >
        <Flag className="h-3 w-3" />
        Finish strong
      </div>

      {/* Genesis brand mark — toggleable per resolution. */}
      {showGenesisLogo && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={
            bg
              ? {
                  color: onLight ? "rgb(15 23 42 / 0.7)" : "rgba(255,255,255,0.78)",
                  borderColor: onLight ? "rgb(15 23 42 / 0.2)" : "rgba(255,255,255,0.25)",
                  background: onLight ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.18)"
                }
              : undefined
          }
        >
          <span className={!bg ? "text-fg-muted" : undefined}>Genesis</span>
        </div>
      )}
    </div>
  );
}
