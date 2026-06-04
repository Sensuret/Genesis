/**
 * Translation lookup with fallback chain.
 *
 *   1. Try the active locale bundle for the dotted key.
 *   2. If missing, fall back to en-US.
 *   3. If still missing, return the key itself (so missing translations
 *      surface in the UI as e.g. "settings.global.unknown_key" — a
 *      strong dev-time signal that we forgot to add a string).
 *
 * Placeholder substitution: `t("settings.global.timezone.auto", { timezone: "Africa/Nairobi" })`
 * replaces every `{timezone}` token with the value.
 */

import type { Locale, MessageTree } from "./types";
import { DEFAULT_LOCALE } from "./types";
import { LOCALE_BUNDLES } from "./messages";

export type TranslateValues = Record<string, string | number | undefined | null>;

function lookup(tree: MessageTree, parts: string[]): string | undefined {
  let cursor: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as MessageTree)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

function substitute(template: string, values: TranslateValues | undefined): string {
  if (!values) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key) => {
    const v = values[key];
    return v === undefined || v === null ? full : String(v);
  });
}

/**
 * Resolve a translation key against a locale, returning the rendered
 * string. Used by the `useT()` hook and any non-React code path that
 * still needs i18n (toasts, audit-log labels, etc.).
 */
export function translate(
  locale: Locale,
  key: string,
  values?: TranslateValues
): string {
  const parts = key.split(".");
  const active = LOCALE_BUNDLES[locale];
  const fallback = LOCALE_BUNDLES[DEFAULT_LOCALE];
  const found = lookup(active, parts) ?? lookup(fallback, parts) ?? key;
  return substitute(found, values);
}
