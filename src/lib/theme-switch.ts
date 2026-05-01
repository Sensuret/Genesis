"use client";

/**
 * Smoothly switch theme using the View Transitions API when available.
 *
 * This snapshots the current page, applies the theme change synchronously
 * (next-themes' setTheme), and lets the browser cross-fade old → new in a
 * single render frame. This avoids:
 *  - the brief flash where html has no theme class (we'd fall back to :root)
 *  - per-element transition staggering where the body fades but a button
 *    snaps because Tailwind's own `transition` utility wins specificity
 *
 * Falls back to a plain setTheme call on browsers without View Transitions
 * (Firefox <= 121, Safari <= 17.4 etc.).
 */
type ViewTransitionLike = { finished: Promise<unknown> };

type StartViewTransitionFn = (cb: () => void) => ViewTransitionLike;

export function smoothSetTheme(setTheme: (t: string) => void, next: string) {
  const start = (
    document as Document & { startViewTransition?: StartViewTransitionFn }
  ).startViewTransition;
  if (typeof start !== "function") {
    setTheme(next);
    return;
  }
  // Mark the root so our CSS can suppress regular element transitions
  // while the snapshot crossfade is running.
  document.documentElement.classList.add("theme-switching");
  const transition = start.call(document, () => {
    setTheme(next);
  });
  transition.finished.finally(() => {
    document.documentElement.classList.remove("theme-switching");
  });
}
