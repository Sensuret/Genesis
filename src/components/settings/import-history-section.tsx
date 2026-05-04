"use client";

import { useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { TradeFileRow } from "@/lib/supabase/types";

/**
 * Import history — lists every statement upload with metadata.
 */
export function ImportHistorySection() {
  const [files, setFiles] = useState<TradeFileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("trade_files")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      setFiles(data ?? []);
      setLoading(false);
    })();
  }, []);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatTz(offset: number | null): string {
    if (offset == null) return "Auto-detected";
    const sign = offset >= 0 ? "+" : "-";
    const hrs = Math.floor(Math.abs(offset) / 60);
    const mins = Math.abs(offset) % 60;
    return `UTC${sign}${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-300" />
            Import history
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            Audit log of every statement upload — file name, when it was imported, broker timezone
            applied, and how many trades were parsed.
          </div>

          {loading ? (
            <div className="text-xs text-fg-subtle">Loading imports…</div>
          ) : files.length === 0 ? (
            <div className="rounded-lg border border-line bg-bg-soft/40 p-4 text-center text-xs text-fg-muted">
              No files imported yet. Upload a broker statement from the{" "}
              <strong className="text-fg">Add Trade</strong> page or the{" "}
              <strong className="text-fg">Accounts</strong> section.
            </div>
          ) : (
            <div className="divide-y divide-line rounded-xl border border-line">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 text-xs"
                >
                  <FileText className="h-4 w-4 shrink-0 text-fg-subtle" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-fg">{f.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-fg-subtle">
                      <span>Imported {formatDate(f.created_at)}</span>
                      <span>{f.trade_count} trade{f.trade_count !== 1 ? "s" : ""}</span>
                      <span>Timezone: {formatTz(f.broker_tz_offset_minutes)}</span>
                      {f.source && <span>Source: {f.source}</span>}
                    </div>
                  </div>
                  {f.account_balance != null && (
                    <div className="text-right">
                      <div className="text-[10px] text-fg-subtle">Balance</div>
                      <div className="text-xs font-medium text-fg">
                        ${f.account_balance.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
