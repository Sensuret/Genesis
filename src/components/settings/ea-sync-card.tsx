"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Eye, EyeOff, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useTrades } from "@/lib/hooks/use-trades";
import { createClient } from "@/lib/supabase/client";
import type { GenesisApiKeyRow, TradeFileRow } from "@/lib/supabase/types";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";
import { shortDate, cn } from "@/lib/utils";
import { EaSetupWizard } from "@/components/settings/ea-setup-wizard";

/**
 * MT4 / MT5 Expert Advisor key issuance + connected-terminal list.
 * Lives under Settings → Accounts → Automatically Synced Accounts. The
 * plaintext key is shown ONCE on creation; only its SHA-256 hash is
 * persisted via the `generate_genesis_api_key` SECURITY DEFINER RPC.
 */
export function EaSyncCard({ supabaseUrl }: { supabaseUrl: string }) {
  const { files } = useTrades();
  const [keys, setKeys] = useState<GenesisApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("Genesis EA key");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ id: string; plaintext: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // True once we hit a Postgres "missing relation" / "missing function" error
  // — means the auto-sync schema migration hasn't been applied to this
  // Supabase project yet. We swap the whole card for a copy/paste guide.
  const [schemaMissing, setSchemaMissing] = useState(false);

  // EA-synced trade_files come back from the global useTrades() hook so the
  // top-bar Accounts picker stays the source of truth — we just filter to
  // the EA rows for display here.
  const eaFiles = useMemo<TradeFileRow[]>(
    () => files.filter((f) => f.sync_kind === "ea"),
    [files]
  );

  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("genesis_api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) {
        if (isSchemaMissingError(err.message)) {
          setSchemaMissing(true);
        } else {
          setError(err.message);
        }
      }
      setKeys((data ?? []) as GenesisApiKeyRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate() {
    setCreating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("generate_genesis_api_key", {
        p_label: label.trim() || "Genesis EA key"
      });
      if (err) throw err;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.plaintext) throw new Error("No key returned");
      setRevealedKey({ id: row.id, plaintext: row.plaintext });
      // Refresh the listing.
      const { data: refreshed } = await supabase
        .from("genesis_api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      setKeys((refreshed ?? []) as GenesisApiKeyRow[]);
      const labelUsed = label.trim() || "Genesis EA key";
      await logAuditEvent(
        AUDIT_EVENT.API_KEY_CREATED,
        `Created API key "${labelUsed}"`,
        { key_id: row.id, label: labelUsed }
      );
      setCreateOpen(false);
      setLabel("Genesis EA key");
    } catch (e) {
      const msg = (e as Error).message;
      if (isSchemaMissingError(msg)) {
        setSchemaMissing(true);
      } else {
        setError(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    const supabase = createClient();
    const target = keys.find((k) => k.id === id);
    const { error: err } = await supabase
      .from("genesis_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k))
    );
    await logAuditEvent(
      AUDIT_EVENT.API_KEY_REVOKED,
      `Revoked API key${target?.label ? ` "${target.label}"` : ""}`,
      { key_id: id, label: target?.label ?? null }
    );
  }

  async function remove(id: string) {
    setError(null);
    const supabase = createClient();
    const target = keys.find((k) => k.id === id);
    const { error: err } = await supabase.from("genesis_api_keys").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setKeys((prev) => prev.filter((k) => k.id !== id));
    await logAuditEvent(
      AUDIT_EVENT.API_KEY_DELETED,
      `Deleted API key${target?.label ? ` "${target.label}"` : ""}`,
      { key_id: id, label: target?.label ?? null }
    );
  }

  function copy(value: string, marker: string) {
    void navigator.clipboard.writeText(value);
    setCopied(marker);
    setTimeout(() => setCopied((c) => (c === marker ? null : c)), 1500);
  }

  const endpoint = supabaseUrl
    ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/receive-trade`
    : "https://YOUR-PROJECT-REF.supabase.co/functions/v1/receive-trade";

  if (schemaMissing) {
    return <SchemaMissingBanner supabaseUrl={supabaseUrl} />;
  }

  async function refreshKeys() {
    const supabase = createClient();
    const { data } = await supabase
      .from("genesis_api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    setKeys((data ?? []) as GenesisApiKeyRow[]);
  }

  return (
    <div className="space-y-4">
      <EaSetupWizard
        supabaseUrl={supabaseUrl}
        eaFiles={eaFiles}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onKeyCreated={() => void refreshKeys()}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>MT4 / MT5 Expert Advisor</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCreateOpen((o) => !o)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New API key
          </Button>
        </CardHeader>
        <CardBody className="space-y-4 text-xs text-fg-muted">
          <p>
            Drop the Genesis EA on a chart in any MetaTrader 4 / 5 terminal and trades stream
            into this account in real time. The same EA works for any broker (HFM, JustMarkets,
            XM, Exness, IC Markets, Capital Markets, etc.) and any account — your API key
            identifies you.
          </p>

          <div className="rounded-xl border border-line bg-bg-soft/50 p-3 text-[11px]">
            <div className="font-semibold uppercase tracking-wide text-fg-muted">EA inputs</div>
            <dl className="mt-2 grid gap-1.5 sm:grid-cols-[140px_1fr]">
              <dt className="text-fg-subtle">SupabaseUrl</dt>
              <dd className="flex items-center gap-1.5">
                <code className="truncate rounded bg-bg-elevated px-1.5 py-0.5">
                  {supabaseUrl || "https://YOUR-PROJECT-REF.supabase.co"}
                </code>
                {supabaseUrl && (
                  <button
                    type="button"
                    onClick={() => copy(supabaseUrl, "url")}
                    className="rounded p-1 hover:bg-bg-elevated"
                  >
                    {copied === "url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </dd>
              <dt className="text-fg-subtle">Endpoint</dt>
              <dd className="flex items-center gap-1.5">
                <code className="truncate rounded bg-bg-elevated px-1.5 py-0.5">{endpoint}</code>
                <button
                  type="button"
                  onClick={() => copy(endpoint, "endpoint")}
                  className="rounded p-1 hover:bg-bg-elevated"
                >
                  {copied === "endpoint" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </dd>
              <dt className="text-fg-subtle">GenesisApiKey</dt>
              <dd>Generate below — the EA only needs one key, even for multiple accounts.</dd>
            </dl>
            <div className="mt-3 text-[11px] text-fg-subtle">
              Whitelist the Supabase URL in MetaTrader → Tools → Options → Expert Advisors →
              "Allow WebRequest for listed URL" before attaching the EA.
            </div>
          </div>

          {createOpen && (
            <div className="space-y-3 rounded-xl border border-line bg-bg-soft/40 p-3">
              <Label className="text-[11px]">Key label (only you see this)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Oracle VPS · HFM Live"
              />
              <div className="flex items-center gap-2">
                <Button onClick={generate} disabled={creating} className="gap-1.5">
                  {creating ? "Generating…" : "Generate API key"}
                </Button>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {revealedKey && (
            <div className="space-y-2 rounded-xl border border-amber-300/40 bg-amber-50/10 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
                <Eye className="h-3.5 w-3.5" /> Copy this key now — it won't be shown again
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-bg-elevated px-2 py-1 text-xs">
                  {revealedKey.plaintext}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(revealedKey.plaintext, "new-key")}
                >
                  {copied === "new-key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRevealedKey(null)}>
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {error && <div className="text-[11px] text-red-400">{error}</div>}

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              API keys
            </div>
            {loading ? (
              <div className="text-[11px] text-fg-subtle">Loading…</div>
            ) : keys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-3 text-[11px] text-fg-subtle">
                No keys yet. Generate one above and paste it into the EA's `GenesisApiKey`
                input.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-line bg-bg-soft/40 px-3 py-2",
                      k.revoked_at && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-fg">
                        {k.label}
                        {k.revoked_at && (
                          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                            revoked
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-fg-subtle">
                        {k.key_prefix}…{" · "}
                        created {shortDate(k.created_at)}
                        {k.last_used_at ? ` · last used ${shortDate(k.last_used_at)}` : " · never used"}
                      </div>
                    </div>
                    {!k.revoked_at && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                        Revoke
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(k.id)}
                      className="rounded p-1 text-fg-muted hover:bg-bg-elevated hover:text-red-400"
                      aria-label="Delete key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected terminals</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-xs text-fg-muted">
          {eaFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-3 text-[11px] text-fg-subtle">
              No EA-connected accounts yet. Once your terminal sends its first trade the
              account appears here and in the top-bar Accounts picker.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {eaFiles.map((f) => (
                <ConnectedTerminalRow key={f.id} file={f} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>EA install — quick start</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-xs text-fg-muted">
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>Generate an API key above and copy it.</li>
            <li>
              Open MetaTrader → <span className="font-medium">Tools → Options → Expert Advisors</span>
              {" "}→ tick "Allow WebRequest for listed URL" → add the Supabase URL shown above.
            </li>
            <li>
              Drop{" "}
              <code className="rounded bg-bg-elevated px-1 py-0.5">GenesisSync.mq4</code> (MT4) or{" "}
              <code className="rounded bg-bg-elevated px-1 py-0.5">GenesisSync.mq5</code> (MT5)
              into the terminal's <code>Experts/</code> folder, compile, drag onto any chart.
            </li>
            <li>
              In the EA inputs paste the Supabase URL and your API key. Set an optional friendly
              label and OK out — trades start flowing within seconds.
            </li>
          </ol>
          <p className="text-[11px] text-fg-subtle">
            For an always-on capture (so phone trades sync at 3am) run the terminal on Oracle
            Cloud's free Windows VPS — see{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5">integrations/mt-ea/README.md</code>{" "}
            in the repo for the full step-by-step.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

// ---------- ConnectedTerminalRow ----------

/**
 * One row in the "Connected terminals" list. Shows live "last seen
 * X seconds/minutes/hours ago" so the user knows whether the EA is
 * still pinging — re-renders every 10 seconds via a tiny tick state.
 */
function ConnectedTerminalRow({ file }: { file: TradeFileRow }) {
  // Re-render every 10s so "last seen" stays fresh while the user
  // watches the page after attaching the EA.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const status = liveStatus(file.last_synced_at);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-bg-soft/40 px-3 py-2">
      <span
        className={cn(
          "inline-flex h-2 w-2 shrink-0 rounded-full",
          status.tone === "live" && "animate-pulse bg-emerald-400 ring-2 ring-emerald-400/30",
          status.tone === "idle" && "bg-amber-400 ring-2 ring-amber-400/30",
          status.tone === "stale" && "bg-fg-subtle ring-2 ring-fg-subtle/20",
          status.tone === "never" && "bg-fg-subtle ring-2 ring-fg-subtle/20"
        )}
        aria-hidden
      />
      <RefreshCw className={cn("h-3.5 w-3.5", status.tone === "live" ? "text-emerald-400" : "text-fg-subtle")} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-fg">
          {file.account_name || file.name}
        </div>
        <div className="text-[10.5px] text-fg-subtle">
          {[file.broker, file.platform, file.account_number && `#${file.account_number}`, file.server]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[10.5px]">
        <span
          className={cn(
            "font-medium",
            status.tone === "live" && "text-emerald-300",
            status.tone === "idle" && "text-amber-300",
            status.tone === "stale" && "text-fg-subtle",
            status.tone === "never" && "text-fg-subtle"
          )}
        >
          {status.label}
        </span>
        <span className="text-fg-subtle">{file.trade_count} trades</span>
      </div>
    </li>
  );
}

/** Bucket the "last seen" gap into live / idle / stale tiers so the
 *  pulse colour matches reality. */
function liveStatus(lastSyncedAt: string | null | undefined): {
  tone: "live" | "idle" | "stale" | "never";
  label: string;
} {
  if (!lastSyncedAt) return { tone: "never", label: "Never synced" };
  const t = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(t)) return { tone: "never", label: "Never synced" };
  const ageMs = Date.now() - t;
  if (ageMs < 0) return { tone: "live", label: "Live · just now" };
  if (ageMs < 90_000) return { tone: "live", label: "Live · just now" };
  if (ageMs < 5 * 60_000) return { tone: "live", label: `Live · ${Math.round(ageMs / 60_000)}m ago` };
  if (ageMs < 60 * 60_000) return { tone: "idle", label: `Idle · ${Math.round(ageMs / 60_000)}m ago` };
  if (ageMs < 24 * 60 * 60_000)
    return { tone: "idle", label: `Idle · ${Math.round(ageMs / (60 * 60_000))}h ago` };
  // Older than a day — show absolute date.
  const d = new Date(lastSyncedAt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return {
    tone: "stale",
    label: `Last seen ${shortDate(lastSyncedAt)} ${hh}:${mm}`
  };
}

// ---------- helpers ----------

/**
 * Postgres returns one of these phrasings when the auto-sync schema
 * migration hasn't been applied to the project yet. We use this to
 * show a friendly "run the migration" guide instead of the raw error.
 */
function isSchemaMissingError(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("genesis_api_keys") &&
    (m.includes("not found") ||
      m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("not exist"))
  );
}

function SchemaMissingBanner({ supabaseUrl }: { supabaseUrl: string }) {
  const projectRef = (() => {
    try {
      return new URL(supabaseUrl).hostname.split(".")[0];
    } catch {
      return "YOUR-PROJECT-REF";
    }
  })();
  const sqlEditorUrl = projectRef && projectRef !== "YOUR-PROJECT-REF"
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : "https://supabase.com/dashboard";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          One-time Supabase setup needed
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3 text-xs text-fg-muted">
        <p>
          The auto-sync database tables haven't been created on this Supabase project yet —
          that's why the API key UI can't load. It only takes ~30 seconds:
        </p>
        <ol className="list-decimal space-y-2 pl-4">
          <li>
            Open{" "}
            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-300 underline hover:text-brand-200"
            >
              the Supabase SQL Editor
            </a>
            .
          </li>
          <li>
            Copy the <code className="rounded bg-bg-elevated px-1 py-0.5">supabase/schema.sql</code>{" "}
            file from the Genesis repo (everything from the{" "}
            <em>“Auto-sync (MT4 / MT5 Expert Advisor → Supabase Edge Function)”</em> heading
            onwards is enough — every statement is{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5">if not exists</code>-safe so
            re-runs are fine).
          </li>
          <li>Paste into the SQL Editor and click <span className="font-medium text-fg">Run</span>.</li>
          <li>
            Deploy the Edge Function from your local repo:
            <pre className="mt-1 overflow-x-auto rounded bg-bg-elevated px-2 py-1.5 text-[11px] text-fg">
              {`supabase functions deploy receive-trade --project-ref ${projectRef} --no-verify-jwt`}
            </pre>
          </li>
          <li>Refresh this page — the API key UI starts working.</li>
        </ol>
        <p className="text-[11px] text-fg-subtle">
          You only do this once per Supabase project. The schema lives in version control so
          future updates are picked up automatically.
        </p>
      </CardBody>
    </Card>
  );
}
