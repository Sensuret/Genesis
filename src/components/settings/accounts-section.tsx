"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportedFilesCard } from "@/components/settings/imported-files";
import { EaSyncCard } from "@/components/settings/ea-sync-card";
import { cn } from "@/lib/utils";

type AccountsSubTab = "manual" | "auto";

/**
 * Accounts subsection. Hosts the existing ImportedFilesCard under the
 * "Manual Accounts" sub-tab, and the live EA-sync flow (API key issuance
 * + connected terminals) under "Automatically Synced Accounts".
 */
export function AccountsSection() {
  const [tab, setTab] = useState<AccountsSubTab>("manual");
  // The Supabase URL is public and shown on the EA-sync card so the user
  // can copy/paste it into MetaTrader's WebRequest whitelist.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

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

      {tab === "auto" && <EaSyncCard supabaseUrl={supabaseUrl} />}
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
