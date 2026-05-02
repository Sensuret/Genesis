"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/lib/hooks/use-trades";
import { formatNumber, pnlColor, shortDate } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { applyAllFilters, isRealTrade, realisedRR } from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import { useFilters, useMoney } from "@/lib/filters/store";

export default function TradesPage() {
  const { trades, files, loading, refresh } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const [q, setQ] = useState("");
  const [fileFilter, setFileFilter] = useState<string>("all");

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

  async function deleteFile(id: string) {
    if (!confirm("Delete this file and all its trades?")) return;
    const supabase = createClient();
    await supabase.from("trades").delete().eq("file_id", id);
    await supabase.from("trade_files").delete().eq("id", id);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trades"
        description="Every trade across every account, filterable in one place."
        actions={
          <div className="flex items-center gap-2">
            {ghostCount > 0 && (
              <Button variant="secondary" onClick={purgeGhostRows}>
                <Trash2 className="h-4 w-4" /> Remove {ghostCount} empty row{ghostCount === 1 ? "" : "s"}
              </Button>
            )}
            <Link href="/add-trade">
              <Button><Plus className="h-4 w-4" /> Add Trade</Button>
            </Link>
          </div>
        }
      />

      {files.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Files</CardTitle></CardHeader>
          <CardBody className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-line bg-bg-soft/40 p-3">
                <button
                  onClick={() => setFileFilter(f.id === fileFilter ? "all" : f.id)}
                  className={`text-left ${fileFilter === f.id ? "text-brand-300" : ""}`}
                >
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-fg-subtle">{f.trade_count} trades · {shortDate(f.created_at)}</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => deleteFile(f.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Input placeholder="Search pair, setup, mistake, notes…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        {fileFilter !== "all" && (
          <Badge variant="brand">
            File filter active <button className="ml-1 underline" onClick={() => setFileFilter("all")}>clear</button>
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-fg-muted">Loading trades…</div>
      ) : filtered.length === 0 ? (
        <Empty title="No trades match" description="Adjust filters or add a new trade." action={<Link href="/add-trade"><Button>Add Trade</Button></Link>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-fg-subtle">
                <tr>
                  {["Date", "Added", "Pair", "Side", "Session", "Entry", "Exit", "Lot", "RR", "P&L", "Setup", "Mistake"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const rr = realisedRR(t);
                  const session = t.session ?? detectSession(t.trade_date);
                  return (
                    <tr key={t.id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2.5 text-fg-muted">{shortDate(t.trade_date)}</td>
                      <td className="px-4 py-2.5 text-[11px] text-fg-subtle" title={t.created_at}>
                        {formatTimestamp(t.created_at)}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{t.pair ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {t.side ? (
                          <Badge variant={t.side === "long" ? "success" : "danger"}>{t.side}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">{session ?? "—"}</td>
                      <td className="px-4 py-2.5">{formatNumber(t.entry, 5)}</td>
                      <td className="px-4 py-2.5">{formatNumber(t.exit_price, 5)}</td>
                      <td className="px-4 py-2.5">{formatNumber(t.lot_size)}</td>
                      <td className="px-4 py-2.5">{rr === null ? <span className="text-fg-muted">—</span> : `1:${rr.toFixed(2)}`}</td>
                      <td className={`px-4 py-2.5 font-medium ${pnlColor(t.pnl)}`}>{fmt(t.pnl)}</td>
                      <td className="px-4 py-2.5 text-fg-muted">{t.setup_tag ?? "—"}</td>
                      <td className="px-4 py-2.5 text-fg-muted">{t.mistake_tag ?? "—"}</td>
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

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
