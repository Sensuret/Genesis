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
  /** Optional click handler for sub-section overall-target checkboxes. */
  onToggleTarget?: (sectionId: string, subId: string, next: boolean) => void;
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
 * Sums up all checkbox-style entries on a Resolution and returns the
 * fraction that are ticked. A "checkbox-style entry" is either a bullet
 * `ResolutionItem` or a sub-section `target` (when present). The big +
 * small ticks are weighted equally — 1 box = 1 unit — so 4 of 8 = 50%.
 */
export function computeResolutionProgress(resolution: Resolution): {
  total: number;
  done: number;
  pct: number;
} {
  let total = 0;
  let done = 0;
  for (const section of resolution.sections) {
    for (const sub of section.subsections) {
      if (sub.target && sub.target.trim()) {
        total += 1;
        if (sub.target_checked) done += 1;
      }
      for (const item of sub.items) {
        if (!item.text.trim()) continue;
        total += 1;
        if (item.checked) done += 1;
      }
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

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
  onToggleItem,
  onToggleTarget
}: ResolutionCardProps) {
  const zodiac = chineseZodiacOf(resolution.year);
  const emoji = chineseZodiacEmoji(resolution.year);
  const isLandscape = orientation === "landscape";
  const bg = resolveBackgroundCss(resolution.background);
  const showYearLabel = resolution.show_year_label !== false;
  const showOwner = !!resolution.show_owner_name && !!resolution.owner_name?.trim();
  const showTimestamp = !!resolution.show_created_timestamp;
  const showProgress = !!resolution.show_progress;
  const progress = showProgress ? computeResolutionProgress(resolution) : null;

  // When a custom background is applied we want to anchor text colour to a
  // tone that always reads against the chosen colour. "light" → soft white
  // body text + warm-amber accents (works on dark or saturated grounds).
  // "dark" → near-black body text (works on cream / pastel gradients).
  const onLight = bg?.text === "dark";
  const bodyText = onLight ? "rgb(15 23 42)" : "rgb(248 250 252)";
  const mutedText = onLight ? "rgb(71 85 105)" : "rgba(248,250,252,0.78)";

  // FINISH STRONG flag — stays legible on every background. We always use
  // a solid amber chip with a deep-amber border and dark amber type, even
  // when the card is on theme default (which is whitish in light mode).
  const finishStrongClass =
    onLight || !bg
      ? "border-amber-700/50 bg-amber-400/95 text-amber-950 shadow-sm"
      : "border-amber-500/30 bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-amber-300/10 text-amber-100";

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
      {/* Progress chip — top-middle, only when show_progress is on. */}
      {progress && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur"
          style={{
            background: onLight || !bg ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.32)",
            borderColor: onLight || !bg ? "rgba(15,23,42,0.18)" : "rgba(255,255,255,0.18)",
            color: onLight || !bg ? "rgb(15 23 42)" : "rgb(248 250 252)"
          }}
        >
          <span aria-hidden>● </span>
          {progress.pct}%
          <span className="ml-1 opacity-70">
            ({progress.done}/{progress.total})
          </span>
        </div>
      )}

      {/* Year banner */}
      <div
        className={cn(
          "relative flex items-start justify-between gap-4 border-b p-5",
          bg ? "border-white/10" : "border-line bg-gradient-to-br from-amber-500/15 via-bg-elevated to-bg-elevated"
        )}
      >
        <div>
          {showOwner && (
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={bg ? { color: onLight ? "rgb(120 53 15)" : "rgba(252 211 77 / 0.95)" } : undefined}
            >
              {!bg && (
                <span className="text-amber-300/85">{resolution.owner_name}</span>
              )}
              {bg && <span>{resolution.owner_name}</span>}
            </div>
          )}
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
          {showTimestamp && (
            <div
              className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em]"
              style={bg ? { color: mutedText } : undefined}
            >
              <span className={!bg ? "text-fg-subtle" : undefined}>
                Created{" "}
                {new Date(resolution.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </span>
            </div>
          )}
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
                      <div
                        className="flex items-start gap-2 text-xs"
                        style={bg ? { color: mutedText } : undefined}
                      >
                        <button
                          type="button"
                          tabIndex={onToggleTarget ? 0 : -1}
                          disabled={!onToggleTarget}
                          onClick={(e) => {
                            if (!onToggleTarget) return;
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleTarget(section.id, sub.id, !sub.target_checked);
                          }}
                          className={cn(
                            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[12px] leading-none",
                            sub.target_checked
                              ? "border-emerald-400 bg-emerald-500/40 text-emerald-50"
                              : "border-line bg-bg-soft/50 text-transparent",
                            onToggleTarget && "cursor-pointer hover:border-emerald-400/80",
                            !onToggleTarget && "cursor-default"
                          )}
                          aria-label={sub.target_checked ? "Mark target as not done" : "Mark target as done"}
                          aria-pressed={!!sub.target_checked}
                        >
                          {sub.target_checked ? "✓" : ""}
                        </button>
                        <span className={cn("flex-1", sub.target_checked && "line-through opacity-70")}>
                          <span className={cn("rounded-md border px-1.5 py-0.5", tone.chip)}>
                            Target
                          </span>{" "}
                          <span className={!bg ? "text-fg-muted" : undefined}>{sub.target}</span>
                        </span>
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

      {/* Checker-finish flag — bottom-left default decoration. Stays legible
          on every background (including the white/cream theme default). */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
          finishStrongClass
        )}
      >
        <Flag className="h-3 w-3" />
        Finish strong
      </div>

      {/* Genesis brand mark — always rendered. The `Ǝ` (U+018E) glyphs
          mirror the regular E so the mark reads as the actual Genesis
          word-mark used elsewhere in the app. */}
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
        <span className={!bg ? "text-fg-muted" : undefined} aria-label="Genesis">
          GƎNƎSIS
        </span>
      </div>
    </div>
  );
}
