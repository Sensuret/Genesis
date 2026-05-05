"use client";

import { useEffect, useMemo, useState } from "react";
import { Cable, FileSpreadsheet, History, Workflow } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import { createClient } from "@/lib/supabase/client";
import type { AuditLogRow, TradeFileRow } from "@/lib/supabase/types";
import { cn, shortDate } from "@/lib/utils";

type SyncKindFilter = "all" | "manual" | "ea" | "broker_api";

const SYNC_KIND_LABEL: Record<NonNullable<TradeFileRow["sync_kind"]>, string> = {
  manual: "Manual",
  ea: "MT4/MT5 EA",
  broker_api: "Broker API"
};

const SYNC_KIND_TONE: Record<NonNullable<TradeFileRow["sync_kind"]>, string> = {
  manual: "border-line bg-bg-soft text-fg-muted",
  ea: "border-brand-400/40 bg-brand-500/15 text-brand-200",
  broker_api: "border-violet-400/40 bg-violet-500/15 text-violet-200"
};

/**
 * Settings → Import history.
 *
 * Read-only audit view that combines two data sources:
 *  - `trade_files` (current rows) → one entry per imported / EA-synced
 *    account with rows imported, broker, broker timezone, source format.
 *  - `audit_log` filtered to `trade_file.deleted` → so deleted files are
 *    not silently lost from the trail.
 *
 * Stays in sync with realtime updates via the existing TradesProvider.
 */
export function ImportHistorySection() {
  const { files } = useTrades();
  const [deletedEntries, setDeletedEntries] = useState<AuditLogRow[]>([]);
  const [filter, setFilter] = useState<SyncKindFilter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("audit_log")
        .select("*")
        .in("event_type", ["trade_file.deleted", "trade_file.imported", "trade_file.refreshed"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (err) {
        // Schema may not be applied yet — degrade gracefully.
        setError(null);
        setDeletedEntries([]);
        return;
      }
      const deleted = (data ?? []).filter((d) => d.event_type === "trade_file.deleted");
      setDeletedEntries(deleted as AuditLogRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (filter === "all") return files;
    return files.filter((f) => (f.sync_kind ?? "manual") === filter);
  }, [files, filter]);

  const totalCounts = useMemo(() => {
    const out = { all: files.length, manual: 0, ea: 0, broker_api: 0 };
    for (const f of files) {
      const k = (f.sync_kind ?? "manual") as keyof typeof out;
      out[k]++;
    }
    return out;
  }, [files]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-brand-300" />
            Import history
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-xs text-fg-muted">
          <p>
            Every CSV / XLSX upload, MT4 / MT5 Expert Advisor sync and (later) direct-broker
            connection lands here. Use it to trace &ldquo;why doesn&rsquo;t this trade
            show?&rdquo; — you can confirm the import landed, check the broker timezone
            applied, and see how many trades were captured.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { k: "all", label: `All · ${totalCounts.all}`, Icon: History },
              { k: "manual", label: `Manual · ${totalCounts.manual}`, Icon: FileSpreadsheet },
              { k: "ea", label: `MT4/MT5 EA · ${totalCounts.ea}`, Icon: Workflow },
              { k: "broker_api", label: `Broker API · ${totalCounts.broker_api}`, Icon: Cable }
            ].map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k as SyncKindFilter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition",
                  filter === k
                    ? "border-brand-400/40 bg-brand-500/15 text-fg"
                    : "border-line bg-bg-soft text-fg-muted hover:text-fg"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active imports</CardTitle>
        </CardHeader>
        <CardBody>
          {filteredFiles.length === 0 ? (
            <Empty
              title="Nothing imported yet"
              description={
                filter === "all"
                  ? "Upload an MT4 / MT5 statement, or wire up the EA — every import shows here."
                  : "No imports of this kind yet."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-bg-soft/40 text-[11px] uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">File / Account</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Broker</th>
                    <th className="px-3 py-2.5 font-medium">Imported</th>
                    <th className="px-3 py-2.5 text-right font-medium">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((f) => {
                    const kind = (f.sync_kind ?? "manual") as NonNullable<TradeFileRow["sync_kind"]>;
                    return (
                      <tr key={f.id} className="border-t border-line/60 align-middle">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-fg">{f.name}</div>
                          {(f.account_number || f.account_name) && (
                            <div className="text-[11px] text-fg-subtle">
                              {f.account_number ? `#${f.account_number}` : ""}
                              {f.account_name ? ` · ${f.account_name}` : ""}
                              {f.platform ? ` · ${f.platform}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
                              SYNC_KIND_TONE[kind]
                            )}
                          >
                            {SYNC_KIND_LABEL[kind]}
                          </span>
                          {f.source && (
                            <div className="text-[10.5px] text-fg-subtle">{f.source}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-fg">{f.broker ?? "—"}</div>
                          <div className="text-[10.5px] text-fg-subtle">
                            {f.server ?? ""}
                            {f.broker_tz_offset_minutes != null
                              ? ` · GMT${f.broker_tz_offset_minutes >= 0 ? "+" : "-"}${Math.abs(
                                  Math.round(f.broker_tz_offset_minutes / 60)
                                )}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted">{shortDate(f.created_at)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-fg">
                          {f.trade_count ?? 0}
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

      {deletedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently deleted</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-xs">
              {deletedEntries.slice(0, 10).map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-line bg-bg-soft/40 px-3 py-2"
                >
                  <div>
                    <div className="text-fg">{e.summary}</div>
                    <div className="text-[10.5px] text-fg-subtle">
                      {(e.metadata?.account_number as string | undefined)
                        ? `#${e.metadata.account_number} · `
                        : ""}
                      {(e.metadata?.broker as string | undefined) ?? ""}
                    </div>
                  </div>
                  <div className="text-fg-muted">{shortDate(e.created_at)}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
    </div>
  );
}
