/**
 * Preset background palette for Resolution cards. The user picks one of
 * three modes:
 *
 *   - "theme"    → defer to the app's current theme (default)
 *   - "solid"    → a single high-contrast colour
 *   - "gradient" → one of the named preset gradients listed below
 *
 * Anything declared here renders as both:
 *   - A swatch in the picker (uses the same `css` string as a small chip)
 *   - The card background itself when applied
 *
 * `text` is the CSS colour to use for body text on top of this background
 * — chosen so labels stay readable without manually fiddling with each
 * picker option.
 */

export type ResolutionBgSwatch = {
  id: string;
  label: string;
  css: string;
  text: "light" | "dark";
};

export const SOLID_SWATCHES: ResolutionBgSwatch[] = [
  { id: "slate", label: "Slate", css: "rgb(15, 23, 42)", text: "light" },
  { id: "midnight", label: "Midnight", css: "rgb(13, 13, 26)", text: "light" },
  { id: "indigo", label: "Indigo", css: "rgb(49, 46, 129)", text: "light" },
  { id: "brand", label: "Brand", css: "rgb(76, 29, 149)", text: "light" },
  { id: "emerald", label: "Emerald", css: "rgb(6, 78, 59)", text: "light" },
  { id: "rose", label: "Rose", css: "rgb(136, 19, 55)", text: "light" },
  { id: "amber", label: "Amber", css: "rgb(120, 53, 15)", text: "light" },
  { id: "cream", label: "Cream", css: "rgb(254, 243, 199)", text: "dark" },
  { id: "white", label: "White", css: "rgb(255, 255, 255)", text: "dark" }
];

export const GRADIENT_SWATCHES: ResolutionBgSwatch[] = [
  {
    id: "sunset",
    label: "Sunset",
    css: "linear-gradient(135deg, rgb(244, 63, 94) 0%, rgb(251, 146, 60) 50%, rgb(250, 204, 21) 100%)",
    text: "light"
  },
  {
    id: "midnight-sky",
    label: "Midnight sky",
    css: "linear-gradient(135deg, rgb(2, 6, 23) 0%, rgb(30, 27, 75) 50%, rgb(76, 29, 149) 100%)",
    text: "light"
  },
  {
    id: "aurora",
    label: "Aurora",
    css: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(139, 92, 246) 50%, rgb(236, 72, 153) 100%)",
    text: "light"
  },
  {
    id: "forest",
    label: "Forest",
    css: "linear-gradient(135deg, rgb(20, 83, 45) 0%, rgb(22, 101, 52) 50%, rgb(132, 204, 22) 100%)",
    text: "light"
  },
  {
    id: "ocean",
    label: "Ocean",
    css: "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 64, 175) 50%, rgb(34, 211, 238) 100%)",
    text: "light"
  },
  {
    id: "fire",
    label: "Fire",
    css: "linear-gradient(135deg, rgb(127, 29, 29) 0%, rgb(220, 38, 38) 50%, rgb(251, 146, 60) 100%)",
    text: "light"
  },
  {
    id: "royal",
    label: "Royal",
    css: "linear-gradient(135deg, rgb(30, 27, 75) 0%, rgb(76, 29, 149) 50%, rgb(168, 85, 247) 100%)",
    text: "light"
  },
  {
    id: "gold",
    label: "Gold",
    css: "linear-gradient(135deg, rgb(120, 53, 15) 0%, rgb(217, 119, 6) 50%, rgb(254, 243, 199) 100%)",
    text: "light"
  },
  {
    id: "rose-quartz",
    label: "Rose quartz",
    css: "linear-gradient(135deg, rgb(254, 226, 226) 0%, rgb(251, 207, 232) 50%, rgb(233, 213, 255) 100%)",
    text: "dark"
  },
  {
    id: "ivory",
    label: "Ivory",
    css: "linear-gradient(135deg, rgb(255, 251, 235) 0%, rgb(254, 243, 199) 50%, rgb(252, 211, 77) 100%)",
    text: "dark"
  }
];

export function findSwatch(
  id: string | undefined,
  list: ResolutionBgSwatch[]
): ResolutionBgSwatch | null {
  if (!id) return null;
  return list.find((s) => s.id === id) ?? null;
}

/**
 * Resolve a Resolution.background descriptor to concrete CSS. Returns
 * `null` when the user has chosen the theme default — the consumer should
 * apply its own theme-reactive styles in that case.
 */
export function resolveBackgroundCss(
  bg: import("@/lib/supabase/types").ResolutionBackground | undefined | null
): { css: string; text: "light" | "dark" } | null {
  if (!bg || bg.kind === "theme") return null;
  if (bg.kind === "solid") {
    const sw = findSwatch(bg.color, SOLID_SWATCHES);
    if (sw) return { css: sw.css, text: sw.text };
    return { css: bg.color, text: "light" };
  }
  if (bg.kind === "gradient") {
    const sw = findSwatch(bg.preset, GRADIENT_SWATCHES);
    if (sw) return { css: sw.css, text: sw.text };
  }
  return null;
}
