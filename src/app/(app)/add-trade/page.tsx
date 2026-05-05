"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { computePips, parseFile, type ParsedTrade, type AccountInfo } from "@/lib/parser";
import { createClient } from "@/lib/supabase/client";
import {
  insertManyWithFallback,
  insertOneWithFallback
} from "@/lib/supabase/insert-with-fallback";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";
import { CheckCircle2, Upload } from "lucide-react";
import Link from "next/link";

const SESSIONS = ["Asia", "London", "New York", "Sydney", "Other"];

export default function AddTradePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "manual">("upload");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Trade"
        description="Upload a CSV/XLSX from any broker or add a trade by hand."
        actions={
          <div className="rounded-xl border border-line bg-bg-soft p-1">
            <button
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === "upload" ? "bg-bg-elevated text-fg" : "text-fg-muted"}`}
              onClick={() => setTab("upload")}
            >
              File upload
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === "manual" ? "bg-bg-elevated text-fg" : "text-fg-muted"}`}
              onClick={() => setTab("manual")}
            >
              Manual entry
            </button>
          </div>
        }
      />

      {tab === "upload" ? <UploadForm onDone={() => router.replace("/trades")} /> : <ManualForm onDone={() => router.replace("/trades")} />}

      <Card>
        <CardHeader><CardTitle>How import works</CardTitle></CardHeader>
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
            <li>Auto-detects columns (pair / symbol / ticker / instrument, P&L, entry, exit, lot, commissions, spread, etc.).</li>
            <li>Each upload is saved as a named file you can rename or delete from <Link href="/trades" className="text-brand-300">Trades</Link>.</li>
            <li>Anything we couldn&apos;t map shows up as null — you can still edit each trade.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    trades: ParsedTrade[];
    mapping: Record<string, string | undefined>;
    format: "metatrader" | "metatrader-htm" | "hfm" | "ctrader" | "tradingview" | "generic";
    accountInfo?: AccountInfo;
    broker?: string | null;
    platform?: string | null;
    language?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // List of column names that the Supabase schema cache rejected during
  // the last save. Surfaces a friendly "apply schema for full features"
  // hint instead of leaving the user staring at the raw PostgREST error.
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    setError(null);
    setBusy(true);
    try {
      const result = await parseFile(f);
      setPreview({
        trades: result.trades,
        mapping: result.mapping,
        format: result.format,
        accountInfo: result.accountInfo,
        broker: result.broker,
        platform: result.platform,
        language: result.language
      });
      setFile(f);
      if (!name) {
        // Prefer a friendly broker · account name when the MT5 ReportHistory
        // preamble was detected — e.g. "JustMarkets · 2001900944". Falls
        // back to the raw filename minus extension for everything else.
        const a = result.accountInfo;
        const friendly =
          a?.broker && a?.account_number
            ? `${a.broker} · ${a.account_number}`
            : a?.account_number
              ? a.account_number
              : f.name.replace(/\.[^.]+$/, "");
        setName(friendly);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!file || !preview) return;
    setBusy(true);
    setError(null);
    setMissingCols([]);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Not signed in.");
      setBusy(false);
      return;
    }

    const a = preview.accountInfo;
    const platform = preview.platform ??
      (preview.format === "metatrader" ? "MT5" :
        preview.format === "metatrader-htm" ? "MT4" :
        preview.format === "ctrader" ? "cTrader" :
        preview.format === "tradingview" ? "TradingView" :
        preview.format === "hfm" ? "MT4" :
        null);
    const sourceLabel =
      preview.format === "metatrader" ? "MT5" :
      preview.format === "metatrader-htm" ? "MT4 HTM" :
      preview.format === "hfm" ? "HFM" :
      preview.format === "ctrader" ? "cTrader" :
      preview.format === "tradingview" ? "TradingView" :
      "Generic";
    type CreatedFile = { id: string; source: string };
    // Schema-resilient insert: the helper tries the full payload first
    // and on a "column not in schema cache" error, drops the offending
    // key and retries. This means an imperfectly-migrated Supabase
    // project still succeeds at the core insert; the broker / account
    // chips just won't show on the file row until the migration is
    // applied. The list of dropped columns is surfaced as a banner.
    const { data: created, error: fileErr, missingColumns: missingFile } =
      await insertOneWithFallback<CreatedFile>(supabase, "trade_files", {
        user_id: user.id,
        name: name || file.name,
        source: sourceLabel,
        trade_count: preview.trades.length,
        broker_tz_offset_minutes: null,
        account_balance: a?.balance ?? null,
        account_equity: a?.equity ?? null,
        deposits_total: a?.deposits_total ?? null,
        withdrawals_total: a?.withdrawals_total ?? null,
        // The columns below are added by the PR #35 / PR #37 migrations.
        // If the user's project hasn't run them yet, the helper drops
        // them transparently so the import still goes through.
        sync_kind: "manual",
        account_number: a?.account_number ?? null,
        account_name: a?.account_holder ?? null,
        broker: preview.broker ?? a?.broker ?? a?.company ?? null,
        server: a?.broker_server ?? null,
        platform
      });
    if (fileErr || !created) {
      setError(fileErr?.message ?? "Failed to create file record.");
      setBusy(false);
      return;
    }

    // Stamp every trade row with the same broker / account / platform
    // metadata so the analytic pages (Reports, Streaks, Calendar) can
    // segment by broker or account without re-joining trade_files.
    const rows = preview.trades.map((t) => ({
      ...t,
      user_id: user.id,
      file_id: created.id,
      account_number: a?.account_number ?? null,
      broker: preview.broker ?? a?.broker ?? a?.company ?? null,
      server: a?.broker_server ?? null,
      platform,
      source: "manual" as const
    }));
    const { error: tradesErr, missingColumns: missingTrades } =
      await insertManyWithFallback(supabase, "trades", rows);
    if (tradesErr) {
      setError(tradesErr.message);
      setBusy(false);
      return;
    }

    // Aggregate the dropped column names from the two inserts so the
    // user can see (once the save succeeds) what they'd unlock by
    // applying the schema.
    const allMissing = Array.from(new Set([...missingFile, ...missingTrades]));
    if (allMissing.length) setMissingCols(allMissing);
    await logAuditEvent(
      AUDIT_EVENT.TRADE_FILE_IMPORTED,
      `Imported ${preview.trades.length} trades from ${name || file.name}`,
      {
        file_id: created.id,
        file_name: name || file.name,
        source: created.source,
        trade_count: preview.trades.length
      }
    );
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload your CSV / XLSX</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <Label>File name (saved per user)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2025 Live Account" />
        </div>

        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg-soft/40 px-6 py-10 text-center hover:border-brand-400/50"
        >
          <Upload className="h-6 w-6 text-brand-300" />
          <div className="text-sm font-medium">{file ? file.name : "Drag & drop or click to select"}</div>
          <div className="text-xs text-fg-subtle">CSV, XLSX, HTM — MT4/MT5, cTrader, TradingView, HFM, JustMarkets, XM, Exness, IC Markets, Pepperstone</div>
        </button>

        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx,.xls,.htm,.html"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        {preview && (
          <div className="space-y-3">
            {(preview.broker || preview.platform || preview.language) && (
              <div className="rounded-xl border border-brand-400/40 bg-brand-500/5 p-3 text-xs">
                <div className="mb-1 font-medium text-fg">Detected</div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.broker && (
                    <Badge variant="brand">{preview.broker}</Badge>
                  )}
                  {preview.platform && (
                    <Badge variant="brand">{preview.platform}</Badge>
                  )}
                  {preview.format === "metatrader-htm" && (
                    <Badge>HTM Statement</Badge>
                  )}
                  {preview.format === "ctrader" && (
                    <Badge>cTrader CSV</Badge>
                  )}
                  {preview.format === "tradingview" && (
                    <Badge>TradingView Strategy Tester</Badge>
                  )}
                  {preview.language && preview.language !== "en" && (
                    <Badge>Language: {preview.language.toUpperCase()}</Badge>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-line bg-bg-soft/40 p-3 text-xs">
              <div className="mb-1 font-medium text-fg">Detected mapping</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.mapping).map(([field, col]) => (
                  <Badge key={field} variant="brand">
                    {field}: {col ?? "—"}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-xs text-fg-muted">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-success" />
              {preview.trades.length} trades parsed
            </div>
            {preview.accountInfo &&
              (preview.accountInfo.balance != null ||
                preview.accountInfo.deposits_count > 0 ||
                preview.accountInfo.withdrawals_count > 0 ||
                preview.accountInfo.account_number ||
                preview.accountInfo.broker) && (
                <div className="rounded-xl border border-line bg-bg-soft/40 p-3 text-xs">
                  <div className="mb-1 font-medium text-fg">
                    {preview.format === "metatrader" && preview.accountInfo.account_number
                      ? "MT5 ReportHistory detected"
                      : preview.format === "metatrader-htm" && preview.accountInfo.account_number
                        ? "MT4 HTM Statement detected"
                        : "Account info detected"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.accountInfo.account_number && (
                      <Badge variant="brand">
                        Account #{preview.accountInfo.account_number}
                      </Badge>
                    )}
                    {preview.accountInfo.broker && (
                      <Badge variant="brand">{preview.accountInfo.broker}</Badge>
                    )}
                    {preview.accountInfo.currency && (
                      <Badge>{preview.accountInfo.currency}</Badge>
                    )}
                    {preview.accountInfo.account_kind && (
                      <Badge>{preview.accountInfo.account_kind.toUpperCase()}</Badge>
                    )}
                    {preview.accountInfo.balance != null && (
                      <Badge>Balance ${preview.accountInfo.balance.toFixed(2)}</Badge>
                    )}
                    {preview.accountInfo.equity != null && (
                      <Badge>Equity ${preview.accountInfo.equity.toFixed(2)}</Badge>
                    )}
                    {preview.accountInfo.deposits_count > 0 && (
                      <Badge variant="success">
                        {preview.accountInfo.deposits_count} deposits · $
                        {(preview.accountInfo.deposits_total ?? 0).toFixed(2)}
                      </Badge>
                    )}
                    {preview.accountInfo.withdrawals_count > 0 && (
                      <Badge variant="danger">
                        {preview.accountInfo.withdrawals_count} withdrawals · $
                        {(preview.accountInfo.withdrawals_total ?? 0).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {preview.accountInfo.account_holder && (
                    <div className="mt-1.5 text-[11px] text-fg-subtle">
                      Holder: {preview.accountInfo.account_holder}
                      {preview.accountInfo.company ? ` · ${preview.accountInfo.company}` : ""}
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">
            {error}
            {/^Could not find the/i.test(error) && (
              <div className="mt-1.5 text-[11px] leading-relaxed text-danger/80">
                Your Supabase project is missing the latest schema. Run the
                steps in the banner below — once. Then try again.
              </div>
            )}
          </div>
        )}

        {(missingCols.length > 0 || /schema cache/i.test(error ?? "")) && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
            <div className="mb-1 font-semibold uppercase tracking-wide">
              Apply the latest Supabase schema
            </div>
            <p className="text-amber-100/80">
              {missingCols.length > 0
                ? `The following columns aren't in your project yet: ${missingCols
                    .map((c) => `"${c}"`)
                    .join(", ")}. The import still saved without them — but broker
                / account chips, deposit totals and analytics grouping won't
                work until you apply the migration.`
                : "Your import failed because Supabase doesn't have the latest columns yet."}
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
                Run a second statement to refresh the cache:{" "}
                <code className="rounded bg-amber-500/15 px-1 py-0.5">
                  notify pgrst, &apos;reload schema&apos;;
                </code>
              </li>
              <li>Refresh Genesis. Re-upload to get the broker / account chips.</li>
            </ol>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setFile(null); setPreview(null); }}>Reset</Button>
          <Button disabled={!preview || busy} onClick={save}>
            {busy ? "Saving…" : "Save trades"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    pair: "",
    trade_date: new Date().toISOString().slice(0, 10),
    session: "New York",
    side: "long",
    entry: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    lot_size: "",
    result_r: "",
    pnl: "",
    commissions: "",
    spread: "",
    account_balance: "",
    setup_tag: "",
    mistake_tag: "",
    emotions: "",
    notes: ""
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Not signed in.");
      setBusy(false);
      return;
    }

    const num = (s: string) => (s === "" ? null : Number(s));
    const entry = num(form.entry);
    const exit_price = num(form.exit_price);
    const side = form.side as "long" | "short";
    const pair = form.pair || null;
    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      pair,
      trade_date: form.trade_date || null,
      session: form.session,
      side,
      entry,
      stop_loss: num(form.stop_loss),
      take_profit: num(form.take_profit),
      exit_price,
      lot_size: num(form.lot_size),
      result_r: num(form.result_r),
      pnl: num(form.pnl),
      commissions: num(form.commissions),
      spread: num(form.spread),
      account_balance: num(form.account_balance),
      pips: computePips({ pair, entry, exit_price, side }),
      setup_tag: form.setup_tag || null,
      mistake_tag: form.mistake_tag || null,
      emotions: form.emotions ? form.emotions.split(",").map((s) => s.trim()).filter(Boolean) : null,
      notes: form.notes || null
    });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader><CardTitle>Manual trade entry</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div><Label>Pair / symbol</Label><Input value={form.pair} onChange={(e) => set("pair", e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={form.trade_date} onChange={(e) => set("trade_date", e.target.value)} /></div>
          <div>
            <Label>Session</Label>
            <Select value={form.session} onChange={(e) => set("session", e.target.value)}>
              {SESSIONS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <Label>Side</Label>
            <Select value={form.side} onChange={(e) => set("side", e.target.value)}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </Select>
          </div>
          <div><Label>Entry</Label><Input type="number" step="any" value={form.entry} onChange={(e) => set("entry", e.target.value)} /></div>
          <div><Label>Stop loss</Label><Input type="number" step="any" value={form.stop_loss} onChange={(e) => set("stop_loss", e.target.value)} /></div>
          <div><Label>Take profit</Label><Input type="number" step="any" value={form.take_profit} onChange={(e) => set("take_profit", e.target.value)} /></div>
          <div><Label>Exit price</Label><Input type="number" step="any" value={form.exit_price} onChange={(e) => set("exit_price", e.target.value)} /></div>
          <div><Label>Lot size</Label><Input type="number" step="any" value={form.lot_size} onChange={(e) => set("lot_size", e.target.value)} /></div>
          <div><Label>Result (R)</Label><Input type="number" step="any" value={form.result_r} onChange={(e) => set("result_r", e.target.value)} /></div>
          <div><Label>P&L</Label><Input type="number" step="any" value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></div>
          <div><Label>Commissions</Label><Input type="number" step="any" value={form.commissions} onChange={(e) => set("commissions", e.target.value)} /></div>
          <div><Label>Spread</Label><Input type="number" step="any" value={form.spread} onChange={(e) => set("spread", e.target.value)} /></div>
          <div><Label>Account balance</Label><Input type="number" step="any" value={form.account_balance} onChange={(e) => set("account_balance", e.target.value)} /></div>
          <div><Label>Setup tag</Label><Input value={form.setup_tag} onChange={(e) => set("setup_tag", e.target.value)} /></div>
          <div><Label>Mistake tag</Label><Input value={form.mistake_tag} onChange={(e) => set("mistake_tag", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Emotions (comma-separated)</Label><Input value={form.emotions} onChange={(e) => set("emotions", e.target.value)} placeholder="confident, fomo, patient" /></div>
          <div className="md:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>

          {error && <div className="md:col-span-3 rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}

          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save trade"}</Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
