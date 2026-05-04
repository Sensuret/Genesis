"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportedFilesCard } from "@/components/settings/imported-files";
import { cn } from "@/lib/utils";

type AccountsSubTab = "manual" | "auto";

/**
 * Accounts subsection. Hosts the existing ImportedFilesCard (with
 * broker-timezone auto-detect) under the "Manual Accounts" sub-tab, and
 * stubs the "Automatically Synced Accounts" sub-tab for the upcoming
 * MT4/MT5 EA sync work.
 */
export function AccountsSection() {
  const [tab, setTab] = useState<AccountsSubTab>("manual");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-line bg-bg-soft p-1">
        <SubTab active={tab === "manual"} onClick={() => setTab("manual")}>
          Manual Accounts
        </SubTab>
        <SubTab active={tab === "auto"} onClick={() => setTab("auto")}>
          Automatically Synced Accounts
        </SubTab>
      </div>

      {tab === "manual" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual accounts</CardTitle>
            </CardHeader>
            <CardBody className="text-xs text-fg-muted">
              Upload broker statements (CSV / XLSX from MT4, MT5, HFM, etc.) to back-fill an
              account. Each upload appears below — you can rename it, set the broker timezone the
              statement uses, or delete it. Account info shown across the app (top-bar selector,
              Trades, Reports, Streaks) reflects the files you have imported here.
            </CardBody>
          </Card>
          <ImportedFilesCard />
        </div>
      )}

      {tab === "auto" && (
        <Card>
          <CardHeader>
            <CardTitle>Automatically synced accounts</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs text-fg-muted">
            <p>
              Connect MT4 / MT5 terminals so trades stream in automatically — no more
              statement uploads. Each connected terminal can host a real or demo account, and the
              account label / broker / server are auto-detected and shown in the top-bar selector
              alongside your manual accounts.
            </p>
            <p>
              Two setup paths are coming:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <span className="font-medium text-fg">MT4 / MT5 Expert Advisor (EA)</span> — drop
                a small EA into your MetaTrader terminal, paste your Genesis API key, and trades
                push to your account in real time. Works with any broker. Run it on Oracle's free
                Windows VPS to capture trades placed from your phone too.
              </li>
              <li>
                <span className="font-medium text-fg">Direct broker auto-sync</span> — for
                supported brokers, connect once via OAuth / API key and Genesis polls the broker
                directly. No terminal required.
              </li>
            </ul>
            <p className="text-fg-subtle">
              Reserved · the EA flow is the next big release. The detailed integration guide,
              EA download, and key issuance show up here once it ships.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SubTab({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}
