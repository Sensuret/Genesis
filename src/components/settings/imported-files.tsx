"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import { detectSession } from "@/lib/parser";
import { createClient } from "@/lib/supabase/client";
import type { TradeFileRow, TradeRow } from "@/lib/supabase/types";
import { AUDIT_EVENT, logAuditEvent } from "@/lib/audit/log";
import { shortDate } from "@/lib/utils";

/**
 * Detect the viewer's local timezone (via Intl API) — used as the Auto
 * fallback so users in EAT / EEST / CST etc. get a sensible session split
 * out of the box. Returns `{ offset, label }` where offset is in minutes
 * east of UTC and label is like "GMT+3 · Nairobi".
 */
function localAutoDetected(): { offset: number; label: string } {
  // `Date#getTimezoneOffset` returns minutes *west* of UTC; flip the sign.
  const offset = -new Date().getTimezoneOffset();
  let place = "";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    place = tz ? tz.split("/").pop()!.replace(/_/g, " ") : "";
  } catch {
    /* ignore */
  }
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const gmt = `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
  return { offset, label: place ? `${gmt} · ${place}` : gmt };
}

/**
 * MetaTrader broker-server timezones, expanded. Every UTC offset from -12
 * to +14 in 30-minute steps is covered so any broker — HFM, JustMarkets,
 * Exness, XM, IC Markets, FTMO, OANDA, Pepperstone, Tickmill, FBS, etc. —
 * can be picked. The most common brokers are annotated in the label.
 * `"auto"` resolves to the viewer's local timezone at render time.
 */
const BROKER_HINTS: Record<number, string> = {
  [-300]: "OANDA winter, FX Pro US",
  [-240]: "OANDA DST, FX Pro US DST",
  [0]: "UTC (Pepperstone winter)",
  [60]: "Pepperstone, Tickmill",
  [120]: "FTMO, IC Markets, Admirals, FBS winter · HFM, JustMarkets winter",
  [180]: "FTMO, IC Markets, Admirals, Exness, XM, HFM, JustMarkets (DST / EEST)",
  [240]: "UAE, Gulf brokers",
  [300]: "Pakistan",
  [330]: "India",
  [480]: "Singapore, China",
  [540]: "Japan, Korea"
};

function labelForOffset(offset: number): string {
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const gmt = `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
  const hint = BROKER_HINTS[offset];
  return hint ? `${gmt} — ${hint}` : gmt;
}

/** All half-hour offsets from -12 to +14 (Chatham/Kiribati). */
function buildTzOffsets(): number[] {
  const out: number[] = [];
  for (let total = -12 * 60; total <= 14 * 60; total += 30) out.push(total);
  return out;
}

type TzOption = { value: number | "auto"; label: string };

function buildTzOptions(auto: { label: string }): TzOption[] {
  const options: TzOption[] = [
    { value: "auto", label: `Auto-detect (${auto.label})` }
  ];
  for (const off of buildTzOffsets()) {
    options.push({ value: off, label: labelForOffset(off) });
  }
  return options;
}

function tzLabel(offset: number | null, auto: { label: string }): string {
  if (offset == null) return `Auto-detect (${auto.label})`;
  return labelForOffset(offset);
}

export function ImportedFilesCard() {
  const { files, trades, refresh } = useTrades();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Compute on the client after mount — SSR has no access to Intl timezone.
  const [auto, setAuto] = useState<{ offset: number; label: string }>({ offset: 0, label: "GMT+0" });
  useEffect(() => {
    setAuto(localAutoDetected());
  }, []);
  const TZ_OPTIONS = useMemo(() => buildTzOptions(auto), [auto]);

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
      //    "auto" → use the viewer's local-timezone offset so Kenyan users
      //    on HFM (GMT+3 in summer) get sessions split against the right UTC.
      const effectiveOffset = value === "auto" ? auto.offset : offset;
      const fileTrades = trades.filter((t) => t.file_id === file.id);
      const updates: Array<{ id: string; session: string | null }> = [];
      for (const t of fileTrades) {
        const next = detectSession(t.open_time ?? t.trade_date, effectiveOffset);
        if (next !== t.session) updates.push({ id: t.id, session: next });
      }
      // Run sequentially in small chunks — Supabase has no native bulk-update
      // for varied values, but the row count per file is bounded so this is
      // fine.
      for (const u of updates) {
        await supabase.from("trades").update({ session: u.session }).eq("id", u.id);
      }

      await logAuditEvent(
        AUDIT_EVENT.TRADE_FILE_TZ_UPDATED,
        `Updated broker timezone on ${file.name}`,
        {
          file_id: file.id,
          file_name: file.name,
          offset_minutes: offset,
          rows_rebucketed: updates.length
        }
      );

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
      const tradeCount = countForFile(trades, file.id);
      const { error: tradesErr } = await supabase.from("trades").delete().eq("file_id", file.id);
      if (tradesErr) throw tradesErr;
      const { error: fileErr } = await supabase.from("trade_files").delete().eq("id", file.id);
      if (fileErr) throw fileErr;
      await logAuditEvent(
        AUDIT_EVENT.TRADE_FILE_DELETED,
        `Deleted file ${file.name} (${tradeCount} trades)`,
        {
          file_id: file.id,
          file_name: file.name,
          source: file.source,
          broker: file.broker,
          account_number: file.account_number,
          trade_count: tradeCount
        }
      );
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
                          {f.source ?? "Generic"} · current: {tzLabel(f.broker_tz_offset_minutes, auto)}
                        </div>
                        {(f.account_balance != null ||
                          f.deposits_total != null ||
                          f.withdrawals_total != null) && (
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-fg-subtle">
                            {f.account_balance != null && (
                              <span className="rounded-md border border-line bg-bg-soft/50 px-1.5 py-0.5">
                                Balance ${f.account_balance.toFixed(2)}
                              </span>
                            )}
                            {f.deposits_total != null && (
                              <span className="rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-success/80">
                                Deposits ${f.deposits_total.toFixed(2)}
                              </span>
                            )}
                            {f.withdrawals_total != null && f.withdrawals_total > 0 && (
                              <span className="rounded-md border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-danger/80">
                                Withdrawals ${f.withdrawals_total.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
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
