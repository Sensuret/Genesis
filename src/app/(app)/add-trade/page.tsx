"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseFile, type ParsedTrade } from "@/lib/parser";
import { createClient } from "@/lib/supabase/client";
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
  const [preview, setPreview] = useState<{ trades: ParsedTrade[]; mapping: Record<string, string | undefined> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    setError(null);
    setBusy(true);
    try {
      const result = await parseFile(f);
      setPreview({ trades: result.trades, mapping: result.mapping });
      setFile(f);
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
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
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Not signed in.");
      setBusy(false);
      return;
    }

    const { data: created, error: fileErr } = await supabase
      .from("trade_files")
      .insert({ user_id: user.id, name: name || file.name, source: "upload", trade_count: preview.trades.length })
      .select()
      .single();
    if (fileErr || !created) {
      setError(fileErr?.message ?? "Failed to create file record.");
      setBusy(false);
      return;
    }

    const rows = preview.trades.map((t) => ({ ...t, user_id: user.id, file_id: created.id }));
    const { error: tradesErr } = await supabase.from("trades").insert(rows);
    if (tradesErr) {
      setError(tradesErr.message);
      setBusy(false);
      return;
    }
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
          <div className="text-xs text-fg-subtle">CSV, XLSX — flexible column names supported</div>
        </button>

        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        {preview && (
          <div className="space-y-3">
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
          </div>
        )}

        {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}

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
    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      pair: form.pair || null,
      trade_date: form.trade_date || null,
      session: form.session,
      side: form.side as "long" | "short",
      entry: num(form.entry),
      stop_loss: num(form.stop_loss),
      take_profit: num(form.take_profit),
      exit_price: num(form.exit_price),
      lot_size: num(form.lot_size),
      result_r: num(form.result_r),
      pnl: num(form.pnl),
      commissions: num(form.commissions),
      spread: num(form.spread),
      account_balance: num(form.account_balance),
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
