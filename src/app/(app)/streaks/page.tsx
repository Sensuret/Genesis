"use client";

import { useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { useTrades } from "@/lib/hooks/use-trades";
import { dayStreaks, weekStreaks, quarterStreaks, yearStreaks, type Streak } from "@/lib/analytics";
import { Camera, Share2, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";

export default function StreaksPage() {
  const { trades, loading } = useTrades();
  const captureRef = useRef<HTMLDivElement>(null);

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
      } catch { /* user cancelled */ }
    } else {
      snapshot();
    }
  }

  if (loading) return <div className="text-sm text-fg-muted">Loading streaks…</div>;
  if (!trades.length) return <Empty title="No streaks yet" description="Upload trades to start tracking your day, week, quarter and year streaks." />;

  const days = dayStreaks(trades);
  const weeks = weekStreaks(trades);
  const quarters = quarterStreaks(trades);
  const years = yearStreaks(trades);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Streaks"
        description="Your day, week, quarter and year green-streak history. Built-in screenshot share."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={snapshot}><Camera className="h-4 w-4" /> Screenshot</Button>
            <Button onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
          </div>
        }
      />

      <div ref={captureRef} className="space-y-6 rounded-3xl bg-bg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
            <Wordmark size="lg" />
          </div>
          <span className="text-xs text-fg-muted">Streak Card · {new Date().toLocaleDateString()}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Best day streak" value={best(days)?.length ?? 0} hint={best(days) ? `${formatCurrency(best(days)!.pnl)} earned` : ""} />
          <Stat label="Best week streak" value={best(weeks)?.length ?? 0} hint={best(weeks) ? `${formatCurrency(best(weeks)!.pnl)} earned` : ""} />
          <Stat label="Best quarter streak" value={best(quarters)?.length ?? 0} hint={best(quarters) ? `${formatCurrency(best(quarters)!.pnl)} earned` : ""} />
          <Stat label="Best year streak" value={best(years)?.length ?? 0} hint={best(years) ? `${formatCurrency(best(years)!.pnl)} earned` : ""} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StreakCard title="Day streaks" data={days} />
          <StreakCard title="Week streaks" data={weeks} />
          <StreakCard title="Quarter streaks" data={quarters} />
          <StreakCard title="Year streaks" data={years} />
        </div>
      </div>
    </div>
  );
}

function best(arr: Streak[]) {
  return arr.filter((s) => s.type === "win").sort((a, b) => b.length - a.length)[0];
}

function StreakCard({ title, data }: { title: string; data: Streak[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <div className="text-sm text-fg-muted">Need more activity to compute.</div>
        ) : (
          <ul className="space-y-2">
            {data.slice(-6).reverse().map((s, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-line bg-bg-soft/40 p-3 text-sm">
                <span className="flex items-center gap-2">
                  <Flame className={`h-4 w-4 ${s.type === "win" ? "text-success" : "text-danger"}`} />
                  <span className="font-medium">{s.length}-{title.split(" ")[0].toLowerCase()} {s.type}</span>
                </span>
                <span className={s.type === "win" ? "text-success" : "text-danger"}>{formatCurrency(s.pnl)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
