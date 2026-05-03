"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import { detectSession } from "@/lib/parser";
import { createClient } from "@/lib/supabase/client";
import type { TradeFileRow, TradeRow } from "@/lib/supabase/types";
import { shortDate } from "@/lib/utils";

/**
 * Common MetaTrader broker server timezones. Stored as UTC-offset minutes so
 * we can subtract the offset from the recorded timestamp to get true UTC
 * before bucketing into Asia / Sydney / London / New York. The list covers
 * the brokers our users tend to import from; an "Auto" / "UTC" pair handles
 * the long tail.
 */
const TZ_OPTIONS: Array<{ value: number | "auto"; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: 0, label: "UTC (GMT+0)" },
  { value: 60, label: "GMT+1 (Pepperstone, Tickmill)" },
  { value: 120, label: "GMT+2 (FTMO, ICMarkets winter)" },
  { value: 180, label: "GMT+3 (FTMO, ICMarkets summer / EET DST)" },
  { value: 240, label: "GMT+4" },
  { value: 300, label: "GMT+5" },
  { value: -300, label: "GMT-5 (US Eastern, OANDA winter)" },
  { value: -240, label: "GMT-4 (US Eastern DST)" }
];

function tzLabel(offset: number | null): string {
  if (offset == null) return "Auto-detect";
  const found = TZ_OPTIONS.find((o) => o.value === offset);
  if (found) return found.label;
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function ImportedFilesCard() {
  const { files, trades, refresh } = useTrades();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateFileTimezone(file: TradeFileRow, value: number | "auto") {
    setSavingId(file.id);
    setError(null);
    try {
      const supabase = createClient();
      const offset = value === "auto" ? null : value;

      // 1. Persist the file's broker tz override.
      const { error: updErr } = await supabase
        .from("trade_files")
        .update({ broker_tz_offset_minutes: offset })
        .eq("id", file.id);
      if (updErr) throw updErr;

      // 2. Re-bucket the session of every trade in this file using the new
      //    offset so dashboards / reports / streaks pick up the change. We
      //    only update rows where the recomputed session differs from the
      //    stored value to keep this idempotent and cheap.
      const fileTrades = trades.filter((t) => t.file_id === file.id);
      const updates: Array<{ id: string; session: string | null }> = [];
      for (const t of fileTrades) {
        const next = detectSession(t.open_time ?? t.trade_date, offset);
        if (next !== t.session) updates.push({ id: t.id, session: next });
      }
      // Run sequentially in small chunks — Supabase has no native bulk-update
      // for varied values, but the row count per file is bounded so this is
      // fine.
      for (const u of updates) {
        await supabase.from("trades").update({ session: u.session }).eq("id", u.id);
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update broker timezone.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteFile(file: TradeFileRow) {
    if (!confirm(`Delete "${file.name}" and all ${countForFile(trades, file.id)} of its trades? This can't be undone.`)) {
      return;
    }
    setSavingId(file.id);
    setError(null);
    try {
      const supabase = createClient();
      // Trades cascade delete via ON DELETE SET NULL on file_id by default,
      // so we delete trades first to avoid orphans.
      const { error: tradesErr } = await supabase.from("trades").delete().eq("file_id", file.id);
      if (tradesErr) throw tradesErr;
      const { error: fileErr } = await supabase.from("trade_files").delete().eq("id", file.id);
      if (fileErr) throw fileErr;
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete file.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imported files</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Each MT4/MT5 export uses its broker&apos;s server timezone (FTMO and ICMarkets typically run on
          GMT+2/+3, Pepperstone on GMT+1, OANDA on US Eastern). Set the right zone per file so the
          Asia / Sydney / London / New York session split is computed against true UTC.
        </p>
        {error && (
          <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>
        )}
        {files.length === 0 ? (
          <Empty title="No imports yet" description="Upload an MT4 or MT5 statement from the top bar to get started." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg-soft/40 text-[11px] uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">File</th>
                  <th className="px-3 py-2.5 font-medium">Imported</th>
                  <th className="px-3 py-2.5 text-right font-medium">Trades</th>
                  <th className="px-3 py-2.5 font-medium">Broker timezone</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const current: number | "auto" = f.broker_tz_offset_minutes ?? "auto";
                  return (
                    <tr key={f.id} className="border-t border-line/60 align-middle">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-fg">{f.name}</div>
                        <div className="text-xs text-fg-muted">
                          {f.source ?? "Generic"} · current: {tzLabel(f.broker_tz_offset_minutes)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted">{shortDate(f.created_at)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {countForFile(trades, f.id)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Label className="sr-only">Broker timezone for {f.name}</Label>
                        <Select
                          aria-label={`Broker timezone for ${f.name}`}
                          value={String(current)}
                          disabled={savingId === f.id}
                          onChange={(e) => {
                            const v = e.target.value === "auto" ? "auto" : Number(e.target.value);
                            updateFileTimezone(f, v);
                          }}
                        >
                          {TZ_OPTIONS.map((o) => (
                            <option key={String(o.value)} value={String(o.value)}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => deleteFile(f)}
                          disabled={savingId === f.id}
                          className="text-danger hover:bg-danger/10"
                        >
                          {savingId === f.id ? "…" : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function countForFile(trades: TradeRow[], fileId: string): number {
  let n = 0;
  for (const t of trades) if (t.file_id === fileId) n += 1;
  return n;
}
