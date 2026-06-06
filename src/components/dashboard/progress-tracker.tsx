"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getBrowserUser } from "@/lib/supabase/session-user";
import type { PlaybookRow, TradeRow } from "@/lib/supabase/types";
import { readRules, reportAdherence } from "@/lib/playbooks";
import { formatNumber, formatPercent } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  trades: TradeRow[];
};

export function ProgressTracker({ trades }: Props) {
  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const user = await getBrowserUser();
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase.from("playbooks").select("*").eq("user_id", user.id);
      setPlaybooks((data ?? []) as PlaybookRow[]);
    })();
  }, []);

  const summary = useMemo(() => {
    if (!playbooks.length || !trades.length) {
      return { pct: 0, followed: 0, total: 0, byPlaybook: [] as Array<{ name: string; pct: number; followed: number; total: number }> };
    }

    const byPlaybook = playbooks.map((pb) => {
      const rules = readRules(pb.rules);
      const linked = rules.linkedAccounts ?? [];
      const subset = trades.filter(
        (t) =>
          t.playbook_id === pb.id ||
          (t.file_id != null && linked.includes(t.file_id))
      );
      const report = reportAdherence(subset, pb);
      return {
        name: pb.name,
        pct: report.adherencePct,
        followed: report.followedRules,
        total: report.totalTrades
      };
    });

    const withTrades = byPlaybook.filter((b) => b.total > 0);
    const followed = withTrades.reduce((s, b) => s + b.followed, 0);
    const total = withTrades.reduce((s, b) => s + b.total, 0);
    const pct = total ? (followed / total) * 100 : 0;

    return { pct, followed, total, byPlaybook: withTrades };
  }, [playbooks, trades]);

  const issueCounts = useMemo(() => {
    const counts = {
      session: 0,
      asset: 0,
      rr: 0,
      time: 0
    };
    for (const pb of playbooks) {
      const rules = readRules(pb.rules);
      const linked = rules.linkedAccounts ?? [];
      const subset = trades.filter(
        (t) =>
          t.playbook_id === pb.id ||
          (t.file_id != null && linked.includes(t.file_id))
      );
      const report = reportAdherence(subset, pb);
      for (const issue of report.issues) {
        if (issue.kind === "wrong-session") counts.session += 1;
        if (issue.kind === "wrong-asset") counts.asset += 1;
        if (issue.kind === "below-rr-target") counts.rr += 1;
        if (issue.kind === "outside-time-window") counts.time += 1;
      }
    }
    return counts;
  }, [playbooks, trades]);

  return (
    <>
      <Card
        className="cursor-pointer transition hover:border-brand-400/40"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progress Tracker</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div className="text-3xl font-bold text-brand-300">
              {formatNumber(summary.pct, 1)}%
            </div>
            <div className="text-xs text-fg-muted">Playbook rule adherence</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{ width: `${Math.min(100, summary.pct)}%` }}
            />
          </div>
          <p className="text-xs text-fg-muted">
            {summary.followed} of {summary.total} trades followed all linked playbook rules
          </p>
        </CardBody>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Progress Tracker</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="rounded-xl border border-line bg-bg-soft/50 p-4 text-center">
                <div className="text-4xl font-bold text-brand-300">
                  {formatPercent(summary.pct, 1)}
                </div>
                <div className="mt-1 text-sm text-fg-muted">Overall rule adherence</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <IssuePill label="Wrong session" count={issueCounts.session} />
                <IssuePill label="Wrong asset" count={issueCounts.asset} />
                <IssuePill label="Below R:R target" count={issueCounts.rr} />
                <IssuePill label="Outside time window" count={issueCounts.time} />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  By playbook
                </div>
                {summary.byPlaybook.length === 0 ? (
                  <p className="text-sm text-fg-muted">
                    Link accounts to playbooks and tag trades to see adherence breakdown.
                  </p>
                ) : (
                  summary.byPlaybook.map((pb) => (
                    <div
                      key={pb.name}
                      className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium">{pb.name}</span>
                      <span className="text-fg-muted">
                        {formatPercent(pb.pct, 0)} · {pb.followed}/{pb.total}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

function IssuePill({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elevated px-3 py-2">
      <div className="text-fg-subtle">{label}</div>
      <div className="font-semibold text-fg">{count}</div>
    </div>
  );
}
