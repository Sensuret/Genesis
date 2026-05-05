/**
 * i18n core types for Genesis.
 *
 * The locale dropdown in Settings → Global Settings is the source of
 * truth for the user's preferred language. We ship 13 locales and
 * route every user-visible string through a translation function.
 *
 * Why a custom layer instead of next-intl?
 *  - next-intl is built around URL-based locale routing
 *    (`/en-US/dashboard`, `/sw-KE/dashboard`). Genesis is a single-user
 *    app where the locale is per-account, not per-URL — adding URL
 *    segments would force every link, redirect and screenshot URL to
 *    re-stamp the locale prefix.
 *  - Our needs are simple: load messages, render strings, switch
 *    instantly when the dropdown changes. A small context provider
 *    + JSON message bundles do the job without taking on the routing
 *    surface area.
 *  - We can swap in next-intl later if the requirement changes —
 *    `useT()` is the only API surface and a thin wrapper.
 */

/** All supported locales. The user picks one of these in Global Settings.
 *  Keep in sync with src/lib/i18n/messages/index.ts.  */
export type Locale =
  | "en-US"
  | "en-GB"
  | "en-KE"
  | "es-ES"
  | "es-MX"
  | "fr-FR"
  | "de-DE"
  | "pt-BR"
  | "ar-AE"
  | "sw-KE"
  | "hi-IN"
  | "zh-CN"
  | "ja-JP";

export const SUPPORTED_LOCALES: Locale[] = [
  "en-US",
  "en-GB",
  "en-KE",
  "es-ES",
  "es-MX",
  "fr-FR",
  "de-DE",
  "pt-BR",
  "ar-AE",
  "sw-KE",
  "hi-IN",
  "zh-CN",
  "ja-JP"
];

/** RTL locales — the LocaleProvider sets `dir="rtl"` on the document
 *  root when the active locale matches. Only Arabic for now; Hebrew
 *  / Persian / Urdu can be added later if requested. */
export const RTL_LOCALES: ReadonlyArray<Locale> = ["ar-AE"];

export const DEFAULT_LOCALE: Locale = "en-US";

/**
 * Recursive message tree. Leaves are strings (or string templates with
 * `{placeholder}` substitutions); branches are sub-trees. Keeping the
 * shape recursive lets us namespace by feature without flattening into
 * an unwieldy single-level dictionary.
 */
export type MessageTree = {
  [key: string]: string | MessageTree;
};
