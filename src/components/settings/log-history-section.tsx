"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  KeyRound,
  ListChecks,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
  User as UserIcon
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { AuditLogRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Settings → Log history.
 *
 * Reads from `public.audit_log` (RLS-scoped to the signed-in user) and
 * renders a chronological event trail with friendly labels per
 * `event_type`. Supports a single-event-type filter and a "show more"
 * paginator (50 rows at a time).
 */
type EventMeta = {
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
};

const EVENT_META: Record<string, EventMeta> = {
  "auth.sign_in": {
    Icon: LogIn,
    tone: "text-brand-300",
    label: "Sign-in"
  },
  "auth.sign_out": {
    Icon: LogOut,
    tone: "text-fg-muted",
    label: "Sign-out"
  },
  "auth.password_changed": {
    Icon: ShieldAlert,
    tone: "text-amber-300",
    label: "Password changed"
  },
  "profile.updated": {
    Icon: UserIcon,
    tone: "text-fg",
    label: "Profile updated"
  },
  "settings.global_updated": {
    Icon: SettingsIcon,
    tone: "text-fg",
    label: "Global settings"
  },
  "trade_file.imported": {
    Icon: FileSpreadsheet,
    tone: "text-success",
    label: "File imported"
  },
  "trade_file.deleted": {
    Icon: Trash2,
    tone: "text-danger",
    label: "File deleted"
  },
  "trade_file.timezone_updated": {
    Icon: SettingsIcon,
    tone: "text-fg-muted",
    label: "Broker timezone"
  },
  "api_key.created": {
    Icon: KeyRound,
    tone: "text-brand-300",
    label: "API key created"
  },
  "api_key.revoked": {
    Icon: KeyRound,
    tone: "text-amber-300",
    label: "API key revoked"
  },
  "api_key.deleted": {
    Icon: KeyRound,
    tone: "text-danger",
    label: "API key deleted"
  }
};

const EVENT_GROUPS: { label: string; types: string[] }[] = [
  { label: "All events", types: [] },
  { label: "Auth", types: ["auth.sign_in", "auth.sign_out", "auth.password_changed"] },
  { label: "Imports", types: ["trade_file.imported", "trade_file.deleted", "trade_file.timezone_updated"] },
  { label: "Settings", types: ["profile.updated", "settings.global_updated"] },
  { label: "API keys", types: ["api_key.created", "api_key.revoked", "api_key.deleted"] }
];

const PAGE_SIZE = 50;

export function LogHistorySection() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [groupIdx, setGroupIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        setError(
          isSchemaMissingError(error.message)
            ? "schema_missing"
            : error.message
        );
        setLoading(false);
        return;
      }
      setRows((data ?? []) as AuditLogRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const allowed = EVENT_GROUPS[groupIdx].types;
    if (allowed.length === 0) return rows;
    return rows.filter((r) => allowed.includes(r.event_type));
  }, [rows, groupIdx]);

  const visibleRows = filteredRows.slice(0, page * PAGE_SIZE);

  if (loading) {
    return <div className="text-sm text-fg-muted">Loading log history…</div>;
  }

  if (error === "schema_missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            One-time setup needed
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-xs text-fg-muted">
          <p>
            Log history needs the audit-log table from{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5">supabase/schema.sql</code>.
            Paste the latest schema into the Supabase SQL Editor (every statement is{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5">if not exists</code>-safe so
            re-runs are fine), then refresh this page.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-300" />
            Log history
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-xs text-fg-muted">
          <p>
            Sign-ins, password changes, profile / settings updates, file imports + deletes,
            API key activity. Useful as a security trail and for tracing &ldquo;when did this
            change?&rdquo; questions.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-fg-subtle">Filter</span>
            <Select
              value={String(groupIdx)}
              onChange={(e) => {
                setGroupIdx(Number(e.target.value));
                setPage(1);
              }}
              className="w-auto"
            >
              {EVENT_GROUPS.map((g, i) => (
                <option key={g.label} value={i}>
                  {g.label}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardBody>
          {filteredRows.length === 0 ? (
            <Empty
              title="No events yet"
              description="Sign in, change settings or import a file — everything you do shows up here."
            />
          ) : (
            <ul className="space-y-2">
              {visibleRows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 rounded-xl border border-line bg-bg-soft/40 px-3 py-2.5"
                >
                  <EventIcon eventType={row.event_type} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-fg">{row.summary}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10.5px] text-fg-subtle">
                      <span>{eventLabel(row.event_type)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(row.created_at)}</span>
                      <span>·</span>
                      <span>{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {visibleRows.length < filteredRows.length && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
              >
                Show more ({filteredRows.length - visibleRows.length} remaining)
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {error && error !== "schema_missing" && (
        <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>
      )}
    </div>
  );
}

function EventIcon({ eventType }: { eventType: string }) {
  const meta = EVENT_META[eventType] ?? { Icon: CheckCircle2, tone: "text-fg", label: eventType };
  const Icon = meta.Icon;
  return (
    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-elevated", meta.tone)}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function eventLabel(eventType: string): string {
  return EVENT_META[eventType]?.label ?? eventType;
}

function isSchemaMissingError(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("audit_log") &&
    (m.includes("not found") || m.includes("does not exist") || m.includes("schema cache"))
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.round(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.round(month / 12);
  return `${year}y ago`;
}


