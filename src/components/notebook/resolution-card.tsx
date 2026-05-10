"use client";

import { ChevronRight, Flag, Megaphone, Quote as QuoteIcon } from "lucide-react";
import { chineseZodiacEmoji, chineseZodiacOf } from "@/lib/zodiac";
import { resolveBackgroundCss } from "@/lib/notebook/resolution-backgrounds";
import { sanitizeInlineHtml } from "@/lib/notebook/rich-text";
import type {
  Resolution,
  ResolutionBlockKind,
  ResolutionItem,
  ResolutionSection
} from "@/lib/supabase/types";
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
      // Only count checkbox-style blocks toward the progress meter.
      // Headings, dividers, callouts, quotes, plain text, bullets,
      // numbered list items, and toggles aren't tickable, so they
      // shouldn't pull the percentage down. Recurse into toggle /
      // callout children so a checkbox tucked inside a toggle still
      // contributes to the headline percentage.
      const visit = (items: ResolutionItem[]): void => {
        for (const item of items) {
          const kind = item.kind ?? "todo";
          if (item.text.trim() && (kind === "todo" || kind === "bigbox")) {
            total += 1;
            if (item.checked) done += 1;
          }
          if (item.children?.length) visit(item.children);
        }
      };
      visit(sub.items);
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
        "relative rounded-2xl border border-line shadow-card",
        !bg && "bg-bg-elevated text-fg",
        // Preview (grid tile): keep fixed A4 aspect + crop overflow so every
        // tile is the same shape.
        variant === "preview" && [
          "overflow-hidden max-h-[420px]",
          isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]"
        ],
        // Full view (open modal / screenshot target): A4 is the MINIMUM —
        // the card still looks like A4 when short, but grows with the
        // content so nothing is clipped and the Finish-strong + GƎNƎSIS
        // footer always lands below the last section instead of floating
        // on top of Q3 / Q4. `flex-col` puts the footer in normal flow
        // under the sections; `aspect-ratio` on a flex container with
        // auto height gives the A4 floor without capping growth.
        variant === "full" && [
          "flex flex-col",
          isLandscape ? "aspect-[1.41/1]" : "aspect-[1/1.41]"
        ]
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

        {/* Progress — plain text, no background, sits in the gap between
         *  the year banner content and the zodiac icon. Format: "X% Done".
         *  Only renders when the user has toggled `show_progress` on,
         *  so it never visually competes with the owner name above. */}
        {progress && (
          <div
            className={cn(
              "self-center px-1 text-center font-bold tabular-nums tracking-tight",
              variant === "preview" ? "text-base" : "text-2xl"
            )}
            style={
              bg
                ? { color: onLight ? "rgb(120 53 15)" : "rgb(252 211 77)" }
                : undefined
            }
            title={`${progress.done} of ${progress.total} checkboxes ticked`}
          >
            <span className={!bg ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent" : undefined}>
              {progress.pct}% Done
            </span>
          </div>
        )}

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
          "relative grid gap-5 px-5 pt-5",
          // Preview keeps the 12-unit bottom padding because Finish-strong
          // + GƎNƎSIS sit absolutely in the bottom corners of the tile.
          // Full view uses flex-col on the outer card + flow-footer, so
          // the sections block grows (flex-1) and the footer sits in
          // natural order below — no reserved padding needed.
          variant === "preview" ? "pb-12 text-[11px]" : "flex-1 pb-4 text-sm",
          "md:grid-cols-2"
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
                    <div className="space-y-1 pl-1">
                      {sub.items.map((item, idx) => (
                        <ResolutionBlock
                          key={item.id}
                          item={item}
                          numberedIndex={numberedIndexFor(sub.items, idx)}
                          dispatchToggle={
                            onToggleItem
                              ? (childId, next) => onToggleItem(section.id, sub.id, childId, next)
                              : undefined
                          }
                          mutedText={mutedText}
                          bodyText={bodyText}
                          hasBg={!!bg}
                          onLight={onLight}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Footer row: Finish-strong + GƎNƎSIS brand mark.
        - In `preview` (grid tile) they stay absolute in the bottom corners
          so every tile keeps the same A4 silhouette regardless of content.
        - In `full` (open modal / screenshot target) they're normal flow
          items sitting below the sections, so a long resolution pushes
          them down instead of overlapping Q3 / Q4. The flex-col parent
          gives us that ordering for free.
      */}
      {variant === "preview" ? (
        <>
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
        </>
      ) : (
        <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-1">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
              finishStrongClass
            )}
          >
            <Flag className="h-3 w-3" />
            Finish strong
          </div>
          <div
            aria-hidden
            className="pointer-events-none inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
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
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-block renderer.
//
// Resolutions used to be a flat list of tickable bullets. They're now a
// Notion-style block list with mixed kinds: text, h1/h2/h3, todo,
// bigbox, bullet, numbered, toggle, callout, quote, divider. Each kind
// gets its own visual treatment but the wrapper container is the same.
// ---------------------------------------------------------------------------

function blockKindOf(item: ResolutionItem): ResolutionBlockKind {
  return item.kind ?? "todo";
}

/**
 * Render a block's body. When the block has sanitized HTML (from the
 * rich-text editor — bold / italic / underline) we inject that as
 * innerHTML; otherwise fall back to the plain `text` field. Keeps
 * legacy rows working without a migration.
 */
function ItemBody({
  item,
  className
}: {
  item: ResolutionItem;
  className?: string;
}) {
  if (item.html && item.html.trim()) {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item.html) }}
      />
    );
  }
  return <span className={className}>{item.text}</span>;
}

/** Returns the 1-based ordinal of a "numbered" block among other
 *  numbered blocks in the same sub-section. Other kinds return null. */
function numberedIndexFor(items: ResolutionItem[], idx: number): number | null {
  if (blockKindOf(items[idx]) !== "numbered") return null;
  let n = 0;
  for (let i = 0; i <= idx; i++) {
    if (blockKindOf(items[i]) === "numbered") n += 1;
  }
  return n;
}

function ResolutionBlock({
  item,
  numberedIndex,
  dispatchToggle,
  mutedText,
  bodyText,
  hasBg,
  onLight
}: {
  item: ResolutionItem;
  numberedIndex: number | null;
  /** Recursive-friendly toggle dispatcher. The top-level caller closes
   *  over (sectionId, subId) and passes a function `(itemId, next)`
   *  that finds-and-updates the matching item anywhere in the tree.
   *  Children rendered inside toggle / callout containers receive the
   *  same dispatcher so their checkboxes are interactive too. */
  dispatchToggle?: (itemId: string, next: boolean) => void;
  mutedText: string;
  bodyText: string;
  hasBg: boolean;
  onLight: boolean;
}) {
  const kind = blockKindOf(item);
  const interactive = !!dispatchToggle;
  const baseColor = hasBg ? { color: mutedText } : undefined;

  if (kind === "divider") {
    return (
      <hr
        className="my-2 border-line/70"
        style={hasBg ? { borderColor: onLight ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.25)" } : undefined}
      />
    );
  }

  if (!item.text.trim()) {
    // Empty non-divider block — render nothing on the saved card,
    // EXCEPT toggle / callout containers that still have children:
    // a callout whose header is empty but body has bullets is valid,
    // and so is a toggle whose label is empty but children list is
    // populated.
    const isContainerWithChildren =
      (kind === "toggle" || kind === "callout") && (item.children?.length ?? 0) > 0;
    if (!isContainerWithChildren) return null;
  }

  if (kind === "h1" || kind === "h2" || kind === "h3") {
    const sizeClass = kind === "h1" ? "text-base font-bold" : kind === "h2" ? "text-sm font-semibold" : "text-[13px] font-semibold";
    // Use the same `bodyText` colour the rest of the card uses for
    // primary content. Headings need to stay distinct from the muted
    // body lines on every theme — including the cream / white
    // backgrounds where `mutedText` is `rgb(71 85 105)` (no "0.78"
    // substring to swap), so a naive .replace() leaves headings the
    // exact same colour as body text.
    return (
      <div className={cn(sizeClass, !hasBg && "text-fg")} style={hasBg ? { color: bodyText } : undefined}>
        <ItemBody item={item} />
      </div>
    );
  }

  if (kind === "callout") {
    // On light card backgrounds (cream / white) `text-amber-100` is literally
    // the same colour as the cream swatch, so the callout text vanishes.
    // Flip to a dark amber tone whenever we're on a light background.
    const children = item.children ?? [];
    return (
      <div
        className={cn(
          "rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1.5 text-xs",
          onLight ? "text-amber-900" : "text-amber-100"
        )}
      >
        {item.text.trim() && (
          <div className="flex items-start gap-2">
            <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <ItemBody item={item} className="flex-1" />
          </div>
        )}
        {children.length > 0 && (
          <div className={cn("space-y-1", item.text.trim() && "mt-1.5 pl-5")}>
            {children.map((child, cIdx) => (
              <ResolutionBlock
                key={child.id}
                item={child}
                numberedIndex={numberedIndexFor(children, cIdx)}
                dispatchToggle={dispatchToggle}
                mutedText={mutedText}
                bodyText={bodyText}
                hasBg={hasBg}
                onLight={onLight}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === "quote") {
    return (
      <div className="flex items-start gap-2 border-l-2 border-brand-400/60 pl-2 text-xs italic" style={baseColor}>
        <QuoteIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
        <ItemBody item={item} className="flex-1" />
      </div>
    );
  }

  if (kind === "toggle") {
    const children = item.children ?? [];
    return (
      <details
        className="group rounded-md text-xs"
        style={baseColor}
        open={!!item.open}
      >
        <summary className="flex cursor-pointer list-none items-start gap-2">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
          <ItemBody item={item} className="flex-1 font-medium" />
        </summary>
        {children.length > 0 && (
          <div className="mt-1 space-y-1 border-l border-line/40 pl-3 ml-1.5">
            {children.map((child, cIdx) => (
              <ResolutionBlock
                key={child.id}
                item={child}
                numberedIndex={numberedIndexFor(children, cIdx)}
                dispatchToggle={dispatchToggle}
                mutedText={mutedText}
                bodyText={bodyText}
                hasBg={hasBg}
                onLight={onLight}
              />
            ))}
          </div>
        )}
      </details>
    );
  }

  if (kind === "bullet") {
    return (
      <div className={cn("flex items-start gap-2 text-xs", !hasBg && "text-fg-muted")} style={baseColor}>
        <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
        <ItemBody item={item} className="flex-1" />
      </div>
    );
  }

  if (kind === "numbered") {
    return (
      <div className={cn("flex items-start gap-2 text-xs", !hasBg && "text-fg-muted")} style={baseColor}>
        <span className="mt-0.5 inline-flex min-w-[1.1rem] shrink-0 justify-end text-[11px] font-medium">
          {numberedIndex ?? "•"}.
        </span>
        <ItemBody item={item} className="flex-1" />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className={cn("text-xs", !hasBg && "text-fg-muted")} style={baseColor}>
        <ItemBody item={item} />
      </div>
    );
  }

  // bigbox & todo (and any legacy untyped row) — both are tickable.
  const isBig = kind === "bigbox";
  return (
    <div className={cn("flex items-start gap-2 text-xs", !hasBg && "text-fg-muted")} style={baseColor}>
      <button
        type="button"
        tabIndex={interactive ? 0 : -1}
        disabled={!interactive}
        onClick={(e) => {
          if (!interactive) return;
          e.preventDefault();
          e.stopPropagation();
          dispatchToggle?.(item.id, !item.checked);
        }}
        className={cn(
          "shrink-0 inline-flex items-center justify-center leading-none",
          isBig
            ? "mt-0.5 h-5 w-5 rounded-md border-2 text-[12px]"
            : "mt-0.5 h-3.5 w-3.5 rounded-sm border text-[10px]",
          item.checked
            ? isBig
              ? "border-brand-400 bg-brand-500/40 text-brand-50 ring-1 ring-brand-300/40"
              : "border-emerald-400 bg-emerald-500/30 text-emerald-100"
            : isBig
              ? "border-brand-400/60 bg-brand-500/10 text-transparent"
              : "border-line bg-bg-soft/40 text-transparent",
          interactive
            ? isBig
              ? "cursor-pointer hover:border-brand-300"
              : "cursor-pointer hover:border-emerald-400/80"
            : "cursor-default"
        )}
        aria-label={item.checked ? "Mark as not done" : "Mark as done"}
        aria-pressed={!!item.checked}
      >
        {item.checked ? "✓" : ""}
      </button>
      <ItemBody
        item={item}
        className={cn("flex-1", item.checked && "line-through opacity-70", isBig && "text-sm font-medium")}
      />
    </div>
  );
}
