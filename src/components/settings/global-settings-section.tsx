"use client";

import { useEffect, useState } from "react";
import { Globe, Clock } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Global settings — timezone detection, locale, weekday start.
 */
export function GlobalSettingsSection() {
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const [weekStart, setWeekStart] = useState<"monday" | "sunday">("monday");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setLocale(navigator.language || "en-US");
    } catch {
      setTimezone("UTC");
      setLocale("en-US");
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-300" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            Your timezone is automatically detected from your browser. This is used for displaying
            trade times, daily P&amp;L boundaries, and session windows.
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-soft/40 px-3 py-2">
            <Clock className="h-4 w-4 text-fg-subtle" />
            <div>
              <div className="text-sm font-medium text-fg">{timezone || "Detecting…"}</div>
              <div className="text-[10px] text-fg-subtle">
                Auto-detected from browser &middot; {new Date().toLocaleTimeString(locale, { timeZoneName: "short" })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locale</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            The locale determines how numbers, dates, and currencies are formatted across the app.
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-soft/40 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-fg">{locale || "Detecting…"}</div>
              <div className="text-[10px] text-fg-subtle">Auto-detected from browser</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Week starts on</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            Controls how weekly streaks, weekly recaps, and calendar views are aligned.
          </div>
          <div className="inline-flex rounded-xl border border-line bg-bg-soft p-1">
            <button
              type="button"
              onClick={() => setWeekStart("monday")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                weekStart === "monday"
                  ? "bg-bg-elevated text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              Monday
            </button>
            <button
              type="button"
              onClick={() => setWeekStart("sunday")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                weekStart === "sunday"
                  ? "bg-bg-elevated text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              Sunday
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
