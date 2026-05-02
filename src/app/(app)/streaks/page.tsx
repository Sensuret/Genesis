"use client";

import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  applyAllFilters,
  dayStreaks,
  quarterStreaks,
  sessionStreaks,
  totalLotSize,
  weekStreaks,
  yearStreaks,
  type Streak
} from "@/lib/analytics";
import { detectSession } from "@/lib/parser";
import { Camera, Share2, Flame, Filter, X } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";
import { useFilters, useMoney } from "@/lib/filters/store";
import type { TradeRow } from "@/lib/supabase/types";

function resolveSession(t: TradeRow): string | null {
  return t.session ?? detectSession(t.trade_date);
}

export default function StreaksPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const { fmt } = useMoney();
  const captureRef = useRef<HTMLDivElement>(null);

  const allAssets = useMemo(() => {
    const set = new Set<string>();
    for (const t of trades) if (t.pair) set.add(t.pair);
    return [...set].sort();
  }, [trades]);

  const [selectedAssets, setSelectedAssets] = useState<string[] | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  const filtered = useMemo(() => {
    const base = applyAllFilters(trades, filters);
    if (selectedAssets === null) return base;
    if (!selectedAssets.length) return [];
    const set = new Set(selectedAssets);
    return base.filter((t) => t.pair && set.has(t.pair));
  }, [trades, filters, selectedAssets]);

  const days = useMemo(() => dayStreaks(filtered), [filtered]);
  const weeks = useMemo(() => weekStreaks(filtered), [filtered]);
  const quarters = useMemo(() => quarterStreaks(filtered), [filtered]);
  const years = useMemo(() => yearStreaks(filtered), [filtered]);
  const sessions = useMemo(() => sessionStreaks(filtered, resolveSession), [filtered]);
  const lots = useMemo(() => totalLotSize(filtered), [filtered]);

  async function snapshot() {
    if (!captureRef.current) return;
    const html2img = await import("html-to-image");
    const dataUrl = await html2img.toPng(captureRef.current, { backgroundColor: "#0b0912" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `genesis-streaks-${Date.now()}.png`;
    a.click();
  }

  async function share() {
    if (!captureRef.current) return;
    const html2img = await import("html-to-image");
    const blob = await html2img.toBlob(captureRef.current, { backgroundColor: "#0b0912" });
    if (!blob) return;
    if (navigator.share) {
      try {
        await navigator.share({
          files: [new File([blob], "genesis-streaks.png", { type: "image/png" })],
          title: "GƎNƎSIS streaks",
          text: "My current streaks on GƎNƎSIS"
        });
      } catch {
        /* user cancelled */
      }
    } else {
      snapshot();
    }
  }

  function toggleAsset(a: string) {
    const cur = selectedAssets ?? allAssets;
    setSelectedAssets(cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]);
  }

  if (loading) return <div className="text-sm text-fg-muted">Loading streaks…</div>;
  if (!trades.length)
    return (
      <Empty
        title="No streaks yet"
        description="Upload trades to start tracking your day, week, quarter and year streaks."
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Streaks"
        description="Day, week, quarter, year and session streak history. Built-in screenshot share."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={snapshot}
              aria-label="Save streaks as PNG"
              title="Save streaks as PNG"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button onClick={share}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset filter</CardTitle>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span>
              {selectedAssets === null
                ? `All ${allAssets.length}`
                : `${selectedAssets.length} of ${allAssets.length}`}{" "}
              assets
            </span>
            <Button variant="ghost" size="sm" onClick={() => setAssetPickerOpen((o) => !o)}>
              <Filter className="h-3.5 w-3.5" />{" "}
              {assetPickerOpen ? "Hide" : "Adjust"}
            </Button>
            {selectedAssets !== null && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedAssets(null)}>
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        {assetPickerOpen && (
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {allAssets.map((a) => {
                const selected = (selectedAssets ?? allAssets).includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAsset(a)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selected
                        ? "border-brand-400 bg-brand-500/15 text-fg"
                        : "border-line bg-bg-elevated text-fg-subtle hover:text-fg"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </CardBody>
        )}
      </Card>

      <div ref={captureRef} className="space-y-6 rounded-3xl bg-bg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
            <Wordmark size="lg" />
          </div>
          <span className="text-xs text-fg-muted">Streak Card · {new Date().toLocaleDateString()}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            label="Best day streak"
            value={best(days)?.length ?? 0}
            hint={best(days) ? <span className="text-success font-medium">{fmt(best(days)!.pnl)} earned</span> : ""}
          />
          <Stat
            label="Best week streak"
            value={best(weeks)?.length ?? 0}
            hint={best(weeks) ? <span className="text-success font-medium">{fmt(best(weeks)!.pnl)} earned</span> : ""}
          />
          <Stat
            label="Best quarter streak"
            value={best(quarters)?.length ?? 0}
            hint={best(quarters) ? <span className="text-success font-medium">{fmt(best(quarters)!.pnl)} earned</span> : ""}
          />
          <Stat
            label="Best year streak"
            value={best(years)?.length ?? 0}
            hint={best(years) ? <span className="text-success font-medium">{fmt(best(years)!.pnl)} earned</span> : ""}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Stat label="Total lot size traded" value={formatNumber(lots, 2)} format="text" />
          <Stat label="Trades in window" value={filtered.length} format="number" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StreakCard title="Day streaks" data={days} unit="day" fmt={fmt} />
          <StreakCard title="Week streaks" data={weeks} unit="week" fmt={fmt} />
          <StreakCard title="Quarter streaks" data={quarters} unit="quarter" fmt={fmt} />
          <StreakCard title="Year streaks" data={years} unit="year" fmt={fmt} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session streaks</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {["New York", "London", "Asia", "Sydney"].map((s) => {
              const series = sessions[s] ?? [];
              const top = best(series);
              return (
                <div key={s} className="rounded-xl border border-line bg-bg-elevated p-4">
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">{s}</div>
                  <div className="mt-1 text-2xl font-semibold">{top?.length ?? 0}</div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {top ? (
                      <>
                        Best green run ·{" "}
                        <span className="font-medium text-success">{fmt(top.pnl)}</span>
                      </>
                    ) : (
                      "No streaks yet"
                    )}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function best(arr: Streak[]) {
  return arr.filter((s) => s.type === "win").sort((a, b) => b.length - a.length)[0];
}

function StreakCard({
  title,
  data,
  unit,
  fmt
}: {
  title: string;
  data: Streak[];
  unit: string;
  fmt: (usd: number | null | undefined) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <div className="text-sm text-fg-muted">Need more activity to compute.</div>
        ) : (
          <ul className="space-y-2">
            {data
              .slice(-6)
              .reverse()
              .map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-line bg-bg-soft/40 p-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Flame className={`h-4 w-4 ${s.type === "win" ? "text-success" : "text-danger"}`} />
                    <span className="font-medium">
                      {s.length}-{unit} {s.type}
                    </span>
                  </span>
                  <span className={s.type === "win" ? "text-success" : "text-danger"}>
                    {fmt(s.pnl)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
