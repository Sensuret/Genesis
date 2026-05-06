"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { MoonWidget } from "@/components/moon-widget";
import { IntradayEquityChart } from "@/components/charts/intraday-equity";
import { TradeLogTable } from "@/components/trades/trade-log-table";
import {
  totalPnl,
  winRate,
  profitFactor,
  totalCommissions,
  totalSpread,
  realisedRR
} from "@/lib/analytics";
import type { TradeRow } from "@/lib/supabase/types";
import { formatNumber, shortDate } from "@/lib/utils";

type DayViewModalProps = {
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Already-filtered trades for the user's view; the modal extracts this day. */
  trades: TradeRow[];
  /**
   * Most recent observed account balance, used as Net ROI fallback when a
   * trade row has no balance of its own.
   */
  balanceFallback?: number | null;
  onClose: () => void;
};

/**
 * Centered modal that renders the same layout as `/day-view` for a single
 * date. Reused by the Dashboard trade calendar and the Reports calendar
 * mini-month grids.
 */
export function DayViewModal({ date, trades, balanceFallback = null, onClose }: DayViewModalProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => trades.filter((t) => t.trade_date === date), [trades, date]);
  const moonDate = useMemo(() => new Date(`${date}T12:00:00Z`), [date]);

  const rrStats = useMemo(() => {
    const rrs = today
      .map(realisedRR)
      .filter((x): x is number => x !== null && Number.isFinite(x));
    if (!rrs.length) {
      return { count: 0, avg: null as number | null, total: null as number | null, best: null as number | null };
    }
    const total = rrs.reduce((s, r) => s + r, 0);
    const avg = total / rrs.length;
    const best = Math.max(...rrs);
    return { count: rrs.length, avg, total, best };
  }, [today]);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const friendlyDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Day view for ${friendlyDate}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl">
        {/* Header — title + (camera, X) in the top-right. */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-fg-subtle">Day View</div>
            <div className="truncate text-base font-semibold text-fg">{friendlyDate}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2" data-screenshot-ignore="true">
            <ScreenshotButton
              targetRef={captureRef}
              filename={`day-view-${date}`}
              label="Save day snapshot as PNG"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close day view"
              title="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:border-danger/60 hover:text-danger focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body — captured into the screenshot. */}
        <div ref={captureRef} className="flex-1 space-y-5 overflow-y-auto bg-bg p-5">
          {today.length === 0 ? (
            <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-center text-sm text-fg-muted">
              No trades on {shortDate(date)}.
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <MoonWidget date={moonDate} />
                <Card className="flex flex-col p-5 lg:col-span-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-medium">Day&apos;s equity curve</div>
                    <div className="text-xs text-fg-muted">{shortDate(date)}</div>
                  </div>
                  <div className="mt-3 flex-1">
                    <IntradayEquityChart trades={today} />
                  </div>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <Stat label="Trades" value={today.length} />
                <Stat
                  label="Net P&L"
                  value={totalPnl(today)}
                  format="currency"
                  positive={totalPnl(today) >= 0}
                />
                <Stat label="Win rate" value={winRate(today)} format="percent" />
                <Stat label="Profit factor" value={profitFactor(today)} format="number" />
                <Stat
                  label="Costs"
                  value={totalCommissions(today) + totalSpread(today)}
                  format="currency"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Trades</CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <TradeLogTable trades={today} balanceFallback={balanceFallback} hideOpenDate pageSize={null} />
                </CardBody>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs">
                  <div className="text-fg-muted">
                    Average risk-to-reward for the day, calculated from each trade&apos;s entry,
                    stop-loss and exit prices. Reads as &ldquo;risking $1 to make $X&rdquo;.
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Avg R:R</div>
                      <div className="text-sm font-semibold">
                        {rrStats.avg === null ? "—" : `1:${formatNumber(rrStats.avg, 2)}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Best R:R</div>
                      <div className="text-sm font-semibold">
                        {rrStats.best === null ? "—" : `1:${formatNumber(rrStats.best, 2)}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Total R:R</div>
                      <div className="text-sm font-semibold">
                        {rrStats.total === null ? "—" : `${formatNumber(rrStats.total, 2)}R`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Trades w/ R:R</div>
                      <div className="text-sm font-semibold">
                        {rrStats.count} / {today.length}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
