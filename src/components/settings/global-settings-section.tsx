"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Calendar, Languages, Ruler, Save } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateOneWithFallback } from "@/lib/supabase/insert-with-fallback";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";
import { useLocale } from "@/lib/i18n/context";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/types";

type WeekStart = "monday" | "sunday" | "saturday";
type PipUnits = "pips" | "points";

type LocaleOption = { value: string; label: string };
// Each locale's label is intentionally written in its own script so a
// user who lands on Genesis without speaking English can still find
// their language. This list also drives the dropdown order.
const LOCALE_LABELS: Record<Locale, string> = {
  "en-US": "English · US",
  "en-GB": "English · UK",
  "en-KE": "English · Kenya",
  "es-ES": "Español · España",
  "es-MX": "Español · México",
  "fr-FR": "Français · France",
  "de-DE": "Deutsch · Deutschland",
  "pt-BR": "Português · Brasil",
  "ar-AE": "العربية · UAE",
  "sw-KE": "Kiswahili · Kenya",
  "hi-IN": "हिन्दी · India",
  "zh-CN": "中文 · 简体",
  "ja-JP": "日本語"
};
const LOCALES: LocaleOption[] = [
  { value: "auto", label: "Auto-detect (browser)" },
  ...SUPPORTED_LOCALES.map((value) => ({
    value,
    label: LOCALE_LABELS[value]
  }))
];

/** Currated list — covers the regions Genesis users actually trade from. */
const COMMON_TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Athens",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires"
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "ZAR", "KES"];

export function GlobalSettingsSection() {
  const { t, locale: activeLocale, setLocale: setRuntimeLocale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("auto");
  // The dropdown holds the persisted value ("auto" or a specific
  // locale). The runtime locale (`activeLocale`) is derived from this
  // by the LocaleProvider — we update it eagerly in the dropdown's
  // onChange so the language flips instantly, before the user clicks
  // Save.
  const [locale, setLocale] = useState<string>("auto");
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  const [pipUnits, setPipUnits] = useState<PipUnits>("pips");
  const [currency, setCurrency] = useState<string>("USD");
  // Columns the schema cache rejected on the most recent save — lets us
  // surface the exact same "apply Supabase schema" guidance the import
  // form shows, instead of a raw "PGRST204 column not found" error.
  const [missingCols, setMissingCols] = useState<string[]>([]);

  const detected = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const lc = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
      return { timezone: tz, locale: lc };
    } catch {
      return { timezone: "UTC", locale: "en-US" };
    }
  }, []);

  const tzOptions = useMemo(() => {
    const set = new Set<string>([detected.timezone, ...COMMON_TIMEZONES]);
    return Array.from(set).sort();
  }, [detected.timezone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || cancelled) return;
      setUserId(user.id);
      // SELECT * so we don't fail on projects whose `profiles` table
      // hasn't yet been migrated with the new preferences columns. The
      // missing columns simply come back as undefined, the form keeps
      // its initial defaults, and the user can still save (which will
      // surface the schema banner).
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const row = data as Record<string, unknown>;
        setTimezone((row.timezone as string | null) ?? "auto");
        setLocale((row.locale as string | null) ?? "auto");
        setWeekStart((row.week_starts_on as WeekStart) ?? "monday");
        setPipUnits((row.pip_units as PipUnits) ?? "pips");
        setCurrency((row.default_currency as string | null) ?? "USD");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    setMissingCols([]);
    try {
      const supabase = createClient();
      const { error, missingColumns } = await updateOneWithFallback(
        supabase,
        "profiles",
        {
          timezone: timezone === "auto" ? null : timezone,
          locale: locale === "auto" ? null : locale,
          week_starts_on: weekStart,
          pip_units: pipUnits,
          default_currency: currency
        },
        { id: userId }
      );
      if (error) throw error;
      await logAuditEvent(
        AUDIT_EVENT.GLOBAL_SETTINGS_UPDATED,
        "Updated global settings",
        {
          timezone: timezone === "auto" ? null : timezone,
          locale: locale === "auto" ? null : locale,
          week_starts_on: weekStart,
          pip_units: pipUnits,
          default_currency: currency
        }
      );
      if (missingColumns.length) setMissingCols(missingColumns);
      setSuccess(
        missingColumns.length
          ? t("settings.global.saved_partial", {
              count: missingColumns.length,
              plural: missingColumns.length === 1 ? "" : "s"
            })
          : t("settings.global.saved")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-fg-muted">{t("common.loading")}</div>;
  }

  // Selecting a locale in the dropdown immediately changes the runtime
  // language. The DB save still has to happen for the choice to stick
  // across sessions, but the user gets to preview the chosen language
  // first — mirroring the "live everywhere" behaviour they asked for.
  function onLocaleChange(value: string) {
    setLocale(value);
    if (value === "auto") {
      // "Auto" hands control back to the LocaleProvider's browser
      // detection on the next mount; in the meantime we keep showing
      // the active language so the dropdown isn't disorienting.
      return;
    }
    if ((SUPPORTED_LOCALES as readonly string[]).includes(value)) {
      setRuntimeLocale(value as Locale);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-brand-300" />
            {t("settings.global.title")}
          </CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" />
              {t("settings.global.timezone.label")}
            </Label>
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="auto">
                {t("settings.global.timezone.auto", { timezone: detected.timezone })}
              </option>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t("settings.global.timezone.help")}
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              {t("settings.global.locale.label")}
            </Label>
            <Select value={locale} onChange={(e) => onLocaleChange(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.value === "auto"
                    ? `${t("settings.global.locale.auto")} (${detected.locale})`
                    : l.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t("settings.global.locale.help")}
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("settings.global.week_start.label")}
            </Label>
            <Select value={weekStart} onChange={(e) => setWeekStart(e.target.value as WeekStart)}>
              <option value="monday">{t("settings.global.week_start.monday")}</option>
              <option value="sunday">{t("settings.global.week_start.sunday")}</option>
              <option value="saturday">{t("settings.global.week_start.saturday")}</option>
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t("settings.global.week_start.help")}
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />
              {t("settings.global.pip_units.label")}
            </Label>
            <Select value={pipUnits} onChange={(e) => setPipUnits(e.target.value as PipUnits)}>
              <option value="pips">{t("settings.global.pip_units.pips")}</option>
              <option value="points">{t("settings.global.pip_units.points")}</option>
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t("settings.global.pip_units.help")}
            </p>
          </div>

          <div className="md:col-span-2">
            <Label>{t("settings.global.currency.label")}</Label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {t("settings.global.currency.help")}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="inline-flex items-center gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? t("common.saving") : t("common.save_changes")}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
        {success && <span className="text-xs text-success">{success}</span>}
        <span className="text-[11px] text-fg-subtle">
          ({activeLocale})
        </span>
      </div>

      {(missingCols.length > 0 || /schema cache/i.test(error ?? "")) && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
          <div className="mb-1 font-semibold uppercase tracking-wide">
            Apply the latest Supabase schema
          </div>
          <p className="text-amber-100/80">
            {missingCols.length > 0
              ? `These preferences columns aren't in your project yet: ${missingCols
                  .map((c) => `"${c}"`)
                  .join(", ")}. Other preferences saved — these will save once you apply the migration.`
              : "Save failed because Supabase doesn't have the latest preferences columns yet."}
          </p>
          <ol className="mt-1.5 list-inside list-decimal space-y-0.5 text-amber-100/85">
            <li>
              Open the{" "}
              <a
                className="underline"
                href="https://supabase.com/dashboard/project/muwntpqblrxfhaahaczd/sql/new"
                target="_blank"
                rel="noreferrer noopener"
              >
                Supabase SQL editor
              </a>
              .
            </li>
            <li>
              Copy the entire{" "}
              <a
                className="underline"
                href="https://raw.githubusercontent.com/Sensuret/Genesis/main/supabase/schema.sql"
                target="_blank"
                rel="noreferrer noopener"
              >
                schema.sql
              </a>{" "}
              file (Ctrl+A, Ctrl+C).
            </li>
            <li>Paste into the editor and click Run.</li>
            <li>
              Refresh the cache:{" "}
              <code className="rounded bg-amber-500/15 px-1 py-0.5">
                notify pgrst, &apos;reload schema&apos;;
              </code>
            </li>
            <li>Refresh Genesis. Re-save your preferences.</li>
          </ol>
        </div>
      )}
    </form>
  );
}
