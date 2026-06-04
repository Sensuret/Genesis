"use client";

import { useState } from "react";
import { Cable, FileSpreadsheet, Workflow } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportedFilesCard } from "@/components/settings/imported-files";
import { EaSyncCard } from "@/components/settings/ea-sync-card";
import { SyncedBrokersCard } from "@/components/settings/synced-brokers-card";
import { cn } from "@/lib/utils";

type AccountsSubTab = "manual" | "ea" | "broker";

const TABS: { key: AccountsSubTab; label: string; Icon: typeof Cable }[] = [
  { key: "manual", label: "Manual Accounts", Icon: FileSpreadsheet },
  { key: "ea", label: "MT4 / MT5 Expert Advisor", Icon: Workflow },
  { key: "broker", label: "Synced Brokers", Icon: Cable }
];

/**
 * Accounts subsection. Three sub-tabs:
 *   - Manual Accounts        — CSV / XLSX broker statement uploads (live)
 *   - MT4 / MT5 Expert Advisor — EA → Edge Function auto-sync (live)
 *   - Synced Brokers          — direct broker partner-API sync (placeholder
 *     until each broker's API integration is plumbed in)
 */
export function AccountsSection() {
  const [tab, setTab] = useState<AccountsSubTab>("manual");
  // The Supabase URL is public and shown on the EA-sync card so the user
  // can copy/paste it into MetaTrader's WebRequest whitelist.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-xl border border-line bg-bg-soft p-1">
        {TABS.map(({ key, label, Icon }) => (
          <SubTab key={key} active={tab === key} onClick={() => setTab(key)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </SubTab>
        ))}
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

      {tab === "ea" && <EaSyncCard supabaseUrl={supabaseUrl} />}

      {tab === "broker" && <SyncedBrokersCard />}
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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}
