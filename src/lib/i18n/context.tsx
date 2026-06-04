"use client";

/**
 * Locale context — drives the active language across the entire client app.
 *
 * Lifecycle:
 *  1. On mount, read `profiles.locale` from Supabase. If it's null
 *     ("Auto-detect"), fall back to the browser's `navigator.language`
 *     normalised to one of our supported locales.
 *  2. Subscribe to realtime updates on the user's profile row so when
 *     the locale changes from any tab / device the UI re-renders
 *     immediately without a refresh.
 *  3. Expose `setLocale(loc)` for the Global Settings dropdown to call
 *     on `onChange` — this is what makes the language switch *instantly*
 *     across the app even before the user clicks Save. Saving simply
 *     persists the same value into the DB; the UI is already updated.
 *  4. Mirror the active locale to <html lang="…"> and `dir="rtl"` so
 *     screen-readers, browser hyphenation, and CSS logical properties
 *     all see the right context.
 *
 * Why client-side only? Genesis hydrates user data on every page after
 * sign-in — there's no SEO concern with not having a server-rendered
 * locale, and a server-rendered locale would force a full page reload
 * on every change, defeating the "instantly" requirement.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_LOCALE,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
  type Locale
} from "./types";
import { translate, type TranslateValues } from "./translate";

type LocaleContextValue = {
  /** Currently-active locale. Always one of the supported set. */
  locale: Locale;
  /** Switch locale immediately (in-memory). The Global Settings page
   *  also calls this on the dropdown's onChange so the user can preview
   *  the language switch before clicking Save. Persisting to
   *  profiles.locale is a separate concern handled by the save button. */
  setLocale: (loc: Locale) => void;
  /** Convenience translate function bound to the current locale. */
  t: (key: string, values?: TranslateValues) => string;
  /** Whether the active locale renders right-to-left. */
  isRtl: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Map an arbitrary BCP-47 string (e.g. "en", "fr-CA", "zh-Hans-CN")
 * onto one of our 13 supported locales. Used when reading the browser
 * default — we never want to render the app with a locale we have no
 * messages for.
 */
function normaliseLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const exact = SUPPORTED_LOCALES.find((l) => l === input);
  if (exact) return exact;
  // Try the language part (e.g. "en" → "en-US", "es" → "es-ES").
  const lang = input.split("-")[0]?.toLowerCase();
  if (!lang) return DEFAULT_LOCALE;
  const byLang: Record<string, Locale> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    pt: "pt-BR",
    ar: "ar-AE",
    sw: "sw-KE",
    hi: "hi-IN",
    zh: "zh-CN",
    ja: "ja-JP"
  };
  return byLang[lang] ?? DEFAULT_LOCALE;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language ?? ""];
  for (const tag of langs) {
    const exact = SUPPORTED_LOCALES.find((l) => l === tag);
    if (exact) return exact;
  }
  return normaliseLocale(navigator.language ?? null);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // 1. Load preference on mount. We can't read profiles.locale during
  //    initial render (it's async), so we default to en-US and swap in
  //    the real preference once it arrives. Brief flash is acceptable
  //    for a dashboard app where every user is signed in already.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || cancelled) return;
      const { data } = await supabase
        // SELECT * to stay schema-resilient: if `profiles.locale`
        // doesn't yet exist on the user's project we won't crash, we
        // just keep the browser-detected default.
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const stored = (data as Record<string, unknown> | null)?.locale as
        | string
        | null
        | undefined;
      if (stored && stored !== "auto") {
        setLocaleState(normaliseLocale(stored));
      } else {
        setLocaleState(detectBrowserLocale());
      }

      // 2. Realtime subscription on the profile row so locale changes
      //    propagate instantly across tabs.
      const channel = supabase
        .channel(`profile-locale:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            const next = (payload.new as Record<string, unknown>)?.locale as
              | string
              | null
              | undefined;
            if (next === "auto" || !next) {
              setLocaleState(detectBrowserLocale());
            } else {
              setLocaleState(normaliseLocale(next));
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Mirror to <html lang> + dir for accessibility and CSS.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
  }, []);

  const t = useCallback(
    (key: string, values?: TranslateValues) => translate(locale, key, values),
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      isRtl: RTL_LOCALES.includes(locale)
    }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Sensible fallback for unit tests / Storybook where the provider
    // isn't mounted — render English without crashing.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key, values) => translate(DEFAULT_LOCALE, key, values),
      isRtl: false
    };
  }
  return ctx;
}

/** Shorthand when you only need the translate function. */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}
