"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Calendar, Languages, Ruler, Save } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";

type WeekStart = "monday" | "sunday" | "saturday";
type PipUnits = "pips" | "points";

type LocaleOption = { value: string; label: string };
const LOCALES: LocaleOption[] = [
  { value: "auto", label: "Auto-detect (browser)" },
  { value: "en-US", label: "English · US" },
  { value: "en-GB", label: "English · UK" },
  { value: "en-KE", label: "English · Kenya" },
  { value: "es-ES", label: "Español · España" },
  { value: "es-MX", label: "Español · México" },
  { value: "fr-FR", label: "Français · France" },
  { value: "de-DE", label: "Deutsch · Deutschland" },
  { value: "pt-BR", label: "Português · Brasil" },
  { value: "ar-AE", label: "العربية · UAE" },
  { value: "sw-KE", label: "Kiswahili · Kenya" },
  { value: "hi-IN", label: "हिन्दी · India" },
  { value: "zh-CN", label: "中文 · 简体" },
  { value: "ja-JP", label: "日本語" }
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("auto");
  const [locale, setLocale] = useState<string>("auto");
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  const [pipUnits, setPipUnits] = useState<PipUnits>("pips");
  const [currency, setCurrency] = useState<string>("USD");

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
      const { data } = await supabase
        .from("profiles")
        .select("timezone, locale, week_starts_on, pip_units, default_currency")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setTimezone(data.timezone ?? "auto");
        setLocale(data.locale ?? "auto");
        setWeekStart((data.week_starts_on as WeekStart) ?? "monday");
        setPipUnits((data.pip_units as PipUnits) ?? "pips");
        setCurrency(data.default_currency ?? "USD");
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
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          timezone: timezone === "auto" ? null : timezone,
          locale: locale === "auto" ? null : locale,
          week_starts_on: weekStart,
          pip_units: pipUnits,
          default_currency: currency
        })
        .eq("id", userId);
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
      setSuccess("Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-fg-muted">Loading global settings…</div>;
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-brand-300" />
            Region & display
          </CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" />
              Timezone
            </Label>
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="auto">Auto-detect ({detected.timezone})</option>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Used for calendar boundaries, daily P&amp;L cut-offs and recap windows.
              <br />
              Per-file <em>broker</em> timezone (the one MetaTrader prints
              timestamps in) is set independently in <strong>Accounts → Manual</strong>.
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              Language &amp; locale
            </Label>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.value === "auto" ? `${l.label} (${detected.locale})` : l.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Affects number, currency and date formatting across the app.
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Week starts on
            </Label>
            <Select value={weekStart} onChange={(e) => setWeekStart(e.target.value as WeekStart)}>
              <option value="monday">Monday (ISO 8601)</option>
              <option value="sunday">Sunday (US)</option>
              <option value="saturday">Saturday (Middle East)</option>
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Reports → Calendar and weekly recaps use this as the first column.
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />
              Distance units
            </Label>
            <Select value={pipUnits} onChange={(e) => setPipUnits(e.target.value as PipUnits)}>
              <option value="pips">Pips (1.00010 → 1 pip)</option>
              <option value="points">Points (1.00010 → 10 points)</option>
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Switches the &ldquo;Avg SL/TP pips&rdquo; cards and the per-trade pips column.
            </p>
          </div>

          <div className="md:col-span-2">
            <Label>Default currency</Label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-fg-subtle">
              Initial currency selection on the top-bar — you can still flip it per-session.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="inline-flex items-center gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
        {success && <span className="text-xs text-success">{success}</span>}
      </div>
    </form>
  );
}
