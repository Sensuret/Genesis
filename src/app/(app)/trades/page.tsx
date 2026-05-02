"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, FolderOpen, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import {
  AvgWinLossCard,
  NetPnlCard,
  ProfitFactorCard,
  WinRateCard
} from "@/components/dashboard/hero-stats";
import { useTrades } from "@/lib/hooks/use-trades";
import { useFilters, useMoney } from "@/lib/filters/store";
import { createClient } from "@/lib/supabase/client";
import {
  applyAllFilters,
  avgLoss,
  avgWin,
  avgWinLoss,
  isRealTrade,
  netPnl,
  profitFactor,
  realisedRR,
  tpBeSl,
  winRate
} from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import { cn, formatNumber, pnlColor, shortDate } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

type Status = "WIN" | "LOSS" | "BE";

function rowStatus(t: TradeRow): Status {
  const p = t.pnl ?? 0;
  if (p > 0) return "WIN";
  if (p < 0) return "LOSS";
  return "BE";
}

function tradeRoi(t: TradeRow, balanceFallback: number | null): number | null {
  const balance =
    typeof t.account_balance === "number" && t.account_balance > 0
      ? t.account_balance
      : balanceFallback;
  if (!balance || balance <= 0 || t.pnl == null) return null;
  return (t.pnl / balance) * 100;
}

export default function TradesPage() {
  const { trades, files, loading, refresh } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [q, setQ] = useState("");
  const [fileFilter, setFileFilter] = useState<string>("all");
  const [filesOpen, setFilesOpen] = useState(false);

  const filtered = useMemo(() => {
    const real = applyAllFilters(trades, filters);
    return real.filter((t) => {
      if (fileFilter !== "all" && t.file_id !== fileFilter) return false;
      if (!q) return true;
      const blob = `${t.pair ?? ""} ${t.setup_tag ?? ""} ${t.mistake_tag ?? ""} ${t.notes ?? ""}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [trades, filters, q, fileFilter]);

  const ghostCount = useMemo(() => trades.filter((t) => !isRealTrade(t)).length, [trades]);

  // Hero-row stats — driven by the same `filtered` set as the table.
  const breakdown = useMemo(() => tpBeSl(filtered), [filtered]);
  const stats = useMemo(
    () => ({
      net: netPnl(filtered),
      win: winRate(filtered),
      pf: profitFactor(filtered),
      ratio: avgWinLoss(filtered),
      avgW: avgWin(filtered),
      avgL: avgLoss(filtered)
    }),
    [filtered]
  );

  // Use the most recent observed account balance as a fallback for ROI
  // computation when a trade row doesn't carry its own balance snapshot.
  const balanceFallback = useMemo<number | null>(() => {
    for (let i = trades.length - 1; i >= 0; i -= 1) {
      const b = trades[i].account_balance;
      if (typeof b === "number" && b > 0) return b;
    }
    return null;
  }, [trades]);

  async function deleteFile(id: string) {
    if (!confirm("Delete this file and all its trades?")) return;
    const supabase = createClient();
    await supabase.from("trades").delete().eq("file_id", id);
    await supabase.from("trade_files").delete().eq("id", id);
    if (fileFilter === id) setFileFilter("all");
    refresh();
  }

  async function purgeGhostRows() {
    if (!confirm(`Delete ${ghostCount} empty / ghost row(s)?`)) return;
    const supabase = createClient();
    const ids = trades.filter((t) => !isRealTrade(t)).map((t) => t.id);
    if (ids.length) {
      await supabase.from("trades").delete().in("id", ids);
      refresh();
    }
  }

  const activeFile = files.find((f) => f.id === fileFilter) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trade Log"
        actions={
          <div className="flex items-center gap-2">
            {ghostCount > 0 && (
              <Button variant="secondary" onClick={purgeGhostRows}>
                <Trash2 className="h-4 w-4" /> Remove {ghostCount} empty row{ghostCount === 1 ? "" : "s"}
              </Button>
            )}
            <Link href="/add-trade">
              <Button>
                <Plus className="h-4 w-4" /> Add Trade
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero stat row — mirrors the TradeZella Trade Log header. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NetPnlCard value={stats.net} tradeCount={filtered.length} />
        <ProfitFactorCard value={stats.pf} />
        <WinRateCard
          winRate={stats.win}
          wins={breakdown.tp}
          breakeven={breakdown.be}
          losses={breakdown.sl}
        />
        <AvgWinLossCard ratio={stats.ratio} avgWin={stats.avgW} avgLoss={stats.avgL} />
      </div>

      {/* Collapsible Files bar — rolled up by default into a single thin row. */}
      {files.length > 0 && (
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            aria-expanded={filesOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-bg-soft/40"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <FolderOpen className="h-4 w-4 shrink-0 text-brand-300" />
              <span className="text-sm font-medium text-fg">
                Imported files
              </span>
              <Badge variant="brand">{files.length}</Badge>
              {activeFile && (
                <span className="truncate text-xs text-fg-muted">
                  · filtered to <span className="text-brand-300">{activeFile.name}</span>{" "}
                  <button
                    type="button"
                    className="underline hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileFilter("all");
                    }}
                  >
                    clear
                  </button>
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-fg-muted transition-transform",
                filesOpen && "rotate-180"
              )}
            />
          </button>
          {filesOpen && (
            <div className="grid gap-2 border-t border-line p-3 md:grid-cols-2 lg:grid-cols-3">
              {files.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border bg-bg-soft/40 p-3 transition",
                    fileFilter === f.id ? "border-brand-400" : "border-line"
                  )}
                >
                  <button
                    onClick={() => setFileFilter(f.id === fileFilter ? "all" : f.id)}
                    className={`min-w-0 flex-1 text-left ${fileFilter === f.id ? "text-brand-300" : ""}`}
                  >
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-fg-subtle">
                      {f.trade_count} trade{f.trade_count === 1 ? "" : "s"} · imported{" "}
                      {formatTimestamp(f.created_at)}
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => deleteFile(f.id)} aria-label="Delete file">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Search bar — kept compact. */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search pair, setup, mistake, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <span className="text-xs text-fg-muted">
          {filtered.length} of {trades.length} trade{trades.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Trade log table — TradeZella columns: Open / Symbol / Status /
          Close / Entry / Exit / Net P&L / Net ROI / Setup / Duration. */}
      {loading ? (
        <div className="text-sm text-fg-muted">Loading trades…</div>
      ) : filtered.length === 0 ? (
        <Empty
          title="No trades match"
          description="Adjust filters or add a new trade."
          action={
            <Link href="/add-trade">
              <Button>Add Trade</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg-soft/40 text-[11px] uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-3 py-3 font-medium">Open Date</th>
                  <th className="px-3 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium">Side</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Session</th>
                  <th className="px-3 py-3 font-medium text-right">Entry</th>
                  <th className="px-3 py-3 font-medium text-right">Exit</th>
                  <th className="px-3 py-3 font-medium text-right">Lot</th>
                  <th className="px-3 py-3 font-medium text-right">R:R</th>
                  <th className="px-3 py-3 font-medium text-right">Net P&amp;L</th>
                  <th className="px-3 py-3 font-medium text-right">Net ROI</th>
                  <th className="px-3 py-3 font-medium">Setup</th>
                  <th className="px-3 py-3 font-medium">Mistake</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const rr = realisedRR(t);
                  const session = t.session ?? detectSession(t.trade_date);
                  const status = rowStatus(t);
                  const roi = tradeRoi(t, balanceFallback);
                  return (
                    <tr key={t.id} className="border-b border-line/50 transition last:border-0 hover:bg-bg-soft/30">
                      <td className="px-3 py-2.5 text-fg-muted whitespace-nowrap">{shortDate(t.trade_date)}</td>
                      <td className="px-3 py-2.5 font-medium">{t.pair ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {t.side ? (
                          <Badge variant={t.side === "long" ? "success" : "danger"}>{t.side}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted">{session ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(t.entry, 5)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(t.exit_price, 5)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(t.lot_size)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {rr === null ? <span className="text-fg-muted">—</span> : `1:${rr.toFixed(2)}`}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${pnlColor(t.pnl)}`}>
                        {fmt(t.pnl)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-medium tabular-nums",
                          roi === null
                            ? "text-fg-muted"
                            : roi > 0
                              ? "text-success"
                              : roi < 0
                                ? "text-danger"
                                : "text-fg-muted"
                        )}
                      >
                        {roi === null ? "—" : `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted">{t.setup_tag ?? "—"}</td>
                      <td className="px-3 py-2.5 text-fg-muted">{t.mistake_tag ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "WIN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
        Win
      </span>
    );
  }
  if (status === "LOSS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
        Loss
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-fg-muted/40 bg-fg-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
      BE
    </span>
  );
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
