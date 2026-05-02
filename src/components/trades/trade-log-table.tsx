"use client";

import { Badge } from "@/components/ui/badge";
import { useMoney } from "@/lib/filters/store";
import { realisedRR } from "@/lib/analytics";
import { computePips, detectSession } from "@/lib/parser";
import { cn, formatNumber, pnlColor, shortDate } from "@/lib/utils";
import type { TradeRow } from "@/lib/supabase/types";

/** Format trade duration (seconds) compactly: 12s · 4m · 1h 12m · 1d 4h. */
function formatDuration(secs: number | null | undefined): string {
  if (secs == null || !Number.isFinite(secs) || secs < 0) return "—";
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86_400) {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs - h * 3600) / 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const d = Math.floor(secs / 86_400);
  const h = Math.round((secs - d * 86_400) / 3600);
  return h === 0 ? `${d}d` : `${d}d ${h}h`;
}

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

export function StatusPill({ status }: { status: Status }) {
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
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-soft/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
      BE
    </span>
  );
}

type TradeLogTableProps = {
  trades: TradeRow[];
  /** When set, used as fallback account balance for ROI when a trade has none. */
  balanceFallback?: number | null;
  /** Hide Open Date column (e.g. when the table is already scoped to one day). */
  hideOpenDate?: boolean;
  className?: string;
};

/**
 * Trade Log table shared across the Trades page, Day View page and Day View
 * modal so every "list of trades" surface has the same columns: Open Date,
 * Symbol, Side, Status, Session, Entry, Exit, Lot, R:R, Net P&L, Net ROI,
 * Setup, Mistake.
 */
export function TradeLogTable({
  trades,
  balanceFallback = null,
  hideOpenDate = false,
  className
}: TradeLogTableProps) {
  const { fmt } = useMoney();
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-bg-soft/40 text-[11px] uppercase tracking-wide text-fg-subtle">
          <tr>
            {!hideOpenDate && <th className="px-3 py-3 font-medium">Open Date</th>}
            <th className="px-3 py-3 font-medium">Symbol</th>
            <th className="px-3 py-3 font-medium">Side</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Session</th>
            <th className="px-3 py-3 font-medium text-right">Entry</th>
            <th className="px-3 py-3 font-medium text-right">Exit</th>
            <th className="px-3 py-3 font-medium text-right">Lot</th>
            <th className="px-3 py-3 font-medium text-right">R:R</th>
            <th className="px-3 py-3 font-medium text-right">Pips</th>
            <th className="px-3 py-3 font-medium text-right">Duration</th>
            <th className="px-3 py-3 font-medium text-right">Net P&amp;L</th>
            <th className="px-3 py-3 font-medium text-right">Net ROI</th>
            <th className="px-3 py-3 font-medium">Setup</th>
            <th className="px-3 py-3 font-medium">Mistake</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const rr = realisedRR(t);
            const session = t.session ?? detectSession(t.open_time ?? t.trade_date);
            const status = rowStatus(t);
            const roi = tradeRoi(t, balanceFallback);
            const pips =
              t.pips ??
              computePips({ pair: t.pair, entry: t.entry, exit_price: t.exit_price, side: t.side });
            return (
              <tr
                key={t.id}
                className="border-b border-line/50 transition last:border-0 hover:bg-bg-soft/30"
              >
                {!hideOpenDate && (
                  <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
                    {shortDate(t.trade_date)}
                  </td>
                )}
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
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(t.entry, 5)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(t.exit_price, 5)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(t.lot_size)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {rr === null ? <span className="text-fg-muted">—</span> : `1:${rr.toFixed(2)}`}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right tabular-nums",
                    pips == null
                      ? "text-fg-muted"
                      : pips > 0
                        ? "text-success"
                        : pips < 0
                          ? "text-danger"
                          : "text-fg-muted"
                  )}
                >
                  {pips == null
                    ? "—"
                    : `${pips > 0 ? "+" : ""}${pips.toFixed(1)}`}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">
                  {formatDuration(t.duration_seconds)}
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
  );
}
