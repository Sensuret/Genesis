"use client";

// =============================================================================
// Built-in EA Setup Wizard — Settings → Accounts → MT4 / MT5 Expert Advisor.
//
// Walks the user through every step of going from "no MetaTrader integration"
// to "live trades streaming into Genesis":
//
//   1. Pick MT4 or MT5
//   2. Download the GenesisSync.mq4 / .mq5 file from the app
//   3. Copy/paste it into MetaTrader's MQL4|5/Experts/ folder (with
//      "File → Open Data Folder" instructions, plus OS-specific paths
//      we auto-detect from `navigator.userAgent`)
//   4. Allow the Supabase URL in WebRequest whitelist
//   5. Generate a one-click sync token (calls `generate_genesis_api_key`
//      RPC) and show the plaintext key once with a big copy button
//   6. Drag EA onto a chart, paste the token into Inputs, watch the
//      live "Waiting for first ping…" → "✓ Connected" status flip.
//
// Each step is an inline panel inside the wizard card — no modal, no page
// navigation, so the user can scroll back to a previous step at any time.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Folder,
  Globe,
  Key,
  Loader2,
  MonitorPlay,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { TradeFileRow } from "@/lib/supabase/types";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";
import { cn } from "@/lib/utils";

type Platform = "MT4" | "MT5";
type DetectedOs = "windows" | "mac" | "linux" | "unknown";

type WizardProps = {
  supabaseUrl: string;
  /** EA-synced trade files from useTrades — used to detect the moment a
   *  brand-new account starts sending data so we can flip to "Connected". */
  eaFiles: TradeFileRow[];
  /** Bumped by parent when we should re-poll for new accounts. */
  onWizardComplete?: () => void;
  /** Callback invoked after a key is created so the parent can refresh
   *  its key list without a round-trip to Supabase. */
  onKeyCreated?: () => void;
  /** True when the wizard is open and stepping. */
  open: boolean;
  /** Toggle handler — called when the user opens / closes the wizard. */
  onOpenChange: (next: boolean) => void;
};

export function EaSetupWizard({
  supabaseUrl,
  eaFiles,
  onKeyCreated,
  onWizardComplete,
  open,
  onOpenChange
}: WizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [label, setLabel] = useState("Genesis EA");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ id: string; plaintext: string } | null>(null);
  const [tokenVisible, setTokenVisible] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const detectedOs = useMemo(detectOs, []);
  const endpoint = useMemo(
    () =>
      supabaseUrl
        ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/receive-trade`
        : "https://YOUR-PROJECT-REF.supabase.co/functions/v1/receive-trade",
    [supabaseUrl]
  );

  // Snapshot the EA file ids at the moment the wizard opens so we can
  // detect a brand-new account showing up at step 5 ("Connected!").
  const [baselineFileIds, setBaselineFileIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open && step === 1) {
      setBaselineFileIds(new Set(eaFiles.map((f) => f.id)));
    }
  }, [open, step, eaFiles]);

  // The first NEW EA-synced account that shows up after the wizard was
  // opened becomes the "connected" account.
  const newlyConnected = useMemo(
    () => eaFiles.find((f) => !baselineFileIds.has(f.id)) ?? null,
    [eaFiles, baselineFileIds]
  );

  useEffect(() => {
    if (newlyConnected && step === 5) {
      onWizardComplete?.();
    }
  }, [newlyConnected, step, onWizardComplete]);

  function copy(value: string, marker: string) {
    void navigator.clipboard.writeText(value);
    setCopied(marker);
    setTimeout(() => setCopied((c) => (c === marker ? null : c)), 1500);
  }

  function reset() {
    setStep(1);
    setPlatform(null);
    setLabel("Genesis EA");
    setTokenInfo(null);
    setError(null);
    setTokenVisible(true);
  }

  async function generateToken() {
    setCreating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("generate_genesis_api_key", {
        p_label: label.trim() || "Genesis EA"
      });
      if (err) throw err;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.plaintext) throw new Error("No key returned");
      setTokenInfo({ id: row.id, plaintext: row.plaintext });
      const labelUsed = label.trim() || "Genesis EA";
      await logAuditEvent(
        AUDIT_EVENT.API_KEY_CREATED,
        `Created API key "${labelUsed}" via setup wizard`,
        { key_id: row.id, label: labelUsed, source: "setup-wizard" }
      );
      onKeyCreated?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  // ---- collapsed (closed) state ----------------------------------------
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          reset();
          onOpenChange(true);
        }}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-400/40 bg-gradient-to-r from-brand-500/15 via-brand-500/10 to-bg-soft px-4 py-3.5 text-left transition",
          "hover:border-brand-300/70 hover:from-brand-500/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-500/20 p-2.5 text-brand-200 ring-1 ring-brand-400/40">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg">Set up a new MT4 / MT5 account</div>
            <div className="text-[11px] text-fg-muted">
              Step-by-step wizard — download the EA, allow the URL, generate your token, attach to a chart.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-200 transition group-hover:gap-2">
          Start <ArrowRight className="h-4 w-4" />
        </div>
      </button>
    );
  }

  // ---- open: stepper + content panel -----------------------------------
  return (
    <div className="space-y-3 rounded-2xl border border-brand-400/40 bg-bg-soft/40 p-3 shadow-lg shadow-brand-500/5">
      <Stepper step={step} />

      {step === 1 && (
        <Step
          icon={<MonitorPlay className="h-4 w-4" />}
          title="Pick your MetaTrader version"
          description="Choose whichever your broker uses. Most prop firms and retail brokers use MT5 today; older accounts are MT4."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(["MT4", "MT5"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border bg-bg-elevated/40 p-3 text-left transition",
                  platform === p
                    ? "border-brand-300/80 bg-brand-500/10 ring-1 ring-brand-300/40"
                    : "border-line hover:border-brand-300/50"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-fg">{p}</span>
                  {platform === p && <Check className="h-4 w-4 text-brand-200" />}
                </div>
                <span className="text-[11px] text-fg-muted">
                  {p === "MT4"
                    ? "MetaTrader 4 — older terminal, .mq4/.ex4 files"
                    : "MetaTrader 5 — current terminal, .mq5/.ex5 files"}
                </span>
              </button>
            ))}
          </div>
          <Footer
            onBack={null}
            onNext={() => setStep(2)}
            nextDisabled={!platform}
            nextLabel="Continue"
          />
        </Step>
      )}

      {step === 2 && platform && (
        <Step
          icon={<Download className="h-4 w-4" />}
          title={`Download GenesisSync.${platform === "MT4" ? "mq4" : "mq5"}`}
          description="The EA source file is bundled with the app. Save it, then drop it into MetaTrader's Experts folder."
        >
          <div className="rounded-xl border border-line bg-bg-elevated/40 p-3">
            <a
              href={`/ea/GenesisSync.${platform === "MT4" ? "mq4" : "mq5"}`}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400"
            >
              <Download className="h-4 w-4" />
              Download GenesisSync.{platform === "MT4" ? "mq4" : "mq5"}
            </a>
            <div className="mt-3 space-y-2 text-[11px] text-fg-muted">
              <div className="flex items-start gap-2">
                <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                <div>
                  <div className="font-medium text-fg">
                    Easiest: open the data folder from MetaTrader
                  </div>
                  <div>
                    In {platform}: <span className="font-mono">File → Open Data Folder</span> →
                    open <span className="font-mono">MQL{platform === "MT4" ? "4" : "5"}/Experts/</span>{" "}
                    → drop the downloaded file into that folder.
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-line/70 p-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Or paste this path directly
                </div>
                <div className="mt-1 break-all font-mono text-[10.5px] text-fg">
                  {pathFor(detectedOs, platform)}
                </div>
                <div className="mt-1 text-[10.5px] text-fg-subtle">
                  ({osLabel(detectedOs)} detected — replace{" "}
                  <code>&lt;terminal-id&gt;</code> with your actual terminal folder.)
                </div>
              </div>
            </div>
          </div>
          <Footer onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="I've copied it in" />
        </Step>
      )}

      {step === 3 && platform && (
        <Step
          icon={<Globe className="h-4 w-4" />}
          title="Allow Genesis in MetaTrader"
          description="MetaTrader blocks outbound HTTP by default. Allow the Supabase URL once and you're done forever."
        >
          <ol className="space-y-2 text-[11.5px] text-fg-muted">
            <li>
              <span className="font-semibold text-fg">{platform} → Tools → Options → Expert Advisors.</span>
            </li>
            <li>
              <span className="font-medium text-fg">✓ Allow algorithmic trading</span>
              {" — "}make sure this checkbox is on.
            </li>
            <li>
              <span className="font-medium text-fg">✓ Allow WebRequest for listed URL</span>
              {" — "}tick this and click <span className="font-medium text-fg">Add</span>.
            </li>
            <li>
              Paste this URL exactly (no trailing slash):
              <CopyRow value={supabaseUrl || "https://YOUR-PROJECT-REF.supabase.co"} marker="ws-url" copied={copied} onCopy={copy} />
            </li>
            <li>Click OK. {platform} remembers it across restarts.</li>
          </ol>
          <Footer onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="URL allowed" />
        </Step>
      )}

      {step === 4 && platform && (
        <Step
          icon={<Key className="h-4 w-4" />}
          title="Generate your sync token"
          description="One token authenticates every account on this terminal. We hash it server-side — the plaintext is shown once, copy it now."
        >
          {!tokenInfo ? (
            <div className="space-y-3 rounded-xl border border-line bg-bg-elevated/40 p-3">
              <div>
                <Label className="text-[11px]">Friendly label (only you see it)</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. HFM Live USD · Oracle VPS"
                />
              </div>
              <Button onClick={generateToken} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                {creating ? "Generating…" : "Generate sync token"}
              </Button>
              {error && <div className="text-[11px] text-red-400">{error}</div>}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-amber-300/40 bg-amber-50/10 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-200">
                <Eye className="h-3.5 w-3.5" /> Copy this token now — it won&apos;t be shown again
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-bg-elevated px-2 py-1.5 font-mono text-xs">
                  {tokenVisible ? tokenInfo.plaintext : tokenInfo.plaintext.replace(/./g, "•")}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copy(tokenInfo.plaintext, "token")}>
                  {copied === "token" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTokenVisible((v) => !v)}>
                  {tokenVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="text-[10.5px] text-fg-subtle">
                Token id: <code>{tokenInfo.id}</code> — you can revoke it any time below.
              </div>
            </div>
          )}
          <Footer
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextDisabled={!tokenInfo}
            nextLabel="I've copied the token"
          />
        </Step>
      )}

      {step === 5 && platform && (
        <Step
          icon={<MonitorPlay className="h-4 w-4" />}
          title="Attach the EA to a chart"
          description="Final step — compile the EA, drag it onto any chart, paste your inputs."
        >
          <ol className="space-y-2.5 text-[11.5px] text-fg-muted">
            <li>
              <div className="font-medium text-fg">1. Compile the EA</div>
              In {platform}: press <span className="font-mono">F4</span> (opens MetaEditor) → in the Navigator on the
              left expand <span className="font-mono">Experts</span> → double-click{" "}
              <span className="font-mono">GenesisSync</span> → press <span className="font-mono">F7</span> to
              compile. Should report &quot;0 errors, 0 warnings&quot;.
            </li>
            <li>
              <div className="font-medium text-fg">2. Drop EA on a chart</div>
              Back in {platform} terminal, in the <span className="font-mono">Navigator</span> panel
              (Ctrl+N), expand <span className="font-mono">Expert Advisors</span> → drag{" "}
              <span className="font-mono">GenesisSync</span> onto any chart of any symbol.
            </li>
            <li>
              <div className="font-medium text-fg">3. Paste these into the EA inputs</div>
              <div className="mt-1.5 grid gap-1.5">
                <CopyRow
                  label="SupabaseUrl"
                  value={supabaseUrl || "https://YOUR-PROJECT-REF.supabase.co"}
                  marker="i-url"
                  copied={copied}
                  onCopy={copy}
                />
                <CopyRow
                  label="GenesisApiKey"
                  value={tokenInfo?.plaintext ?? "(generated above)"}
                  marker="i-key"
                  copied={copied}
                  onCopy={copy}
                />
                <div className="text-[10.5px] text-fg-subtle">
                  Click <span className="font-mono">OK</span>. The smiley face top-right of the
                  chart should turn into a green smile.
                </div>
              </div>
            </li>
          </ol>

          <ConnectionWatcher connected={newlyConnected} />

          <Footer
            onBack={() => setStep(4)}
            onNext={() => onOpenChange(false)}
            nextLabel={newlyConnected ? "Done" : "Close wizard"}
          />
        </Step>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function Stepper({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const labels = ["Platform", "Download", "Whitelist", "Token", "Attach"];
  return (
    <ol className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
      {labels.map((label, i) => {
        const idx = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const done = idx < step;
        const active = idx === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                done && "border-brand-300/60 bg-brand-500/30 text-brand-100",
                active && "border-brand-300 bg-brand-500/40 text-white",
                !done && !active && "border-line bg-bg-elevated text-fg-subtle"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : idx}
            </span>
            <span
              className={cn(
                "hidden truncate text-[10px] sm:inline",
                active ? "text-fg" : "text-fg-subtle"
              )}
            >
              {label}
            </span>
            {idx < 5 && <span className={cn("h-px flex-1", done ? "bg-brand-400/60" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

function Step({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-bg-elevated/30 p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-500/20 p-2 text-brand-200 ring-1 ring-brand-400/30">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-fg">{title}</div>
          <div className="mt-0.5 text-[11px] text-fg-muted">{description}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  nextLabel,
  nextDisabled
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button size="sm" onClick={onNext} disabled={nextDisabled} className="gap-1.5">
        {nextLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CopyRow({
  label,
  value,
  marker,
  copied,
  onCopy
}: {
  label?: string;
  value: string;
  marker: string;
  copied: string | null;
  onCopy: (value: string, marker: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/60 px-2 py-1.5">
      {label && (
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle">
          {label}
        </span>
      )}
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{value}</code>
      <button
        type="button"
        onClick={() => onCopy(value, marker)}
        className="rounded p-1 text-fg-muted hover:bg-bg-elevated hover:text-fg"
        aria-label="Copy"
      >
        {copied === marker ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ConnectionWatcher({ connected }: { connected: TradeFileRow | null }) {
  if (connected) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 p-3 text-[11.5px]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <div className="font-semibold text-emerald-200">Connected!</div>
          <div className="text-emerald-200/80">
            Genesis just received the first ping from{" "}
            <span className="font-mono">
              {[connected.broker, connected.platform, connected.account_number && `#${connected.account_number}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
            . Trades will keep syncing as long as the EA is running.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-xl border border-line bg-bg-elevated/30 p-3 text-[11.5px]">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-300" />
      <div className="min-w-0">
        <div className="font-semibold text-fg">Waiting for first ping from your EA…</div>
        <div className="text-fg-muted">
          Once you click OK on the EA dialog this will flip to <span className="font-medium text-emerald-300">Connected</span>{" "}
          within a few seconds. You can close the wizard and come back any time — keys you generated stay valid.
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function osLabel(os: DetectedOs): string {
  if (os === "windows") return "Windows";
  if (os === "mac") return "macOS";
  if (os === "linux") return "Linux";
  return "OS";
}

function pathFor(os: DetectedOs, platform: Platform): string {
  const mql = platform === "MT4" ? "MQL4" : "MQL5";
  if (os === "windows") {
    return `%APPDATA%\\MetaQuotes\\Terminal\\<terminal-id>\\${mql}\\Experts\\`;
  }
  if (os === "mac") {
    return `~/Library/Application Support/net.metaquotes.wine.metatrader${platform === "MT4" ? "4" : "5"}/drive_c/users/<user>/AppData/Roaming/MetaQuotes/Terminal/<terminal-id>/${mql}/Experts/`;
  }
  if (os === "linux") {
    return `~/.wine/drive_c/users/<user>/AppData/Roaming/MetaQuotes/Terminal/<terminal-id>/${mql}/Experts/`;
  }
  return `<MetaTrader data folder>/${mql}/Experts/`;
}
