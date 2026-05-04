"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Server
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportedFilesCard } from "@/components/settings/imported-files";
import { cn } from "@/lib/utils";

type AccountsSubTab = "manual" | "auto";

const SUPPORTED_BROKERS = [
  "HFM",
  "JustMarkets",
  "XM",
  "Exness",
  "IC Markets",
  "Capital Markets"
] as const;

/**
 * Accounts subsection. Hosts the existing ImportedFilesCard (with
 * broker-timezone auto-detect) under the "Manual Accounts" sub-tab, and
 * the "Automatically Synced Accounts" sub-tab for the MT4/MT5 EA sync.
 */
export function AccountsSection() {
  const [tab, setTab] = useState<AccountsSubTab>("manual");
  const [eaOpen, setEaOpen] = useState(true);
  const [brokerOpen, setBrokerOpen] = useState(true);

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
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatically synced accounts</CardTitle>
            </CardHeader>
            <CardBody className="text-xs text-fg-muted">
              <p>
                Connect MT4 / MT5 terminals so trades stream in automatically — no more
                statement uploads. Each connected terminal can host a real or demo account, and the
                account label / broker / server are auto-detected.
              </p>
            </CardBody>
          </Card>

          {/* MT4/MT5 Expert Advisor section */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setEaOpen((o) => !o)}
                className="flex w-full items-center gap-2 text-left"
              >
                {eaOpen ? (
                  <ChevronDown className="h-4 w-4 text-fg-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-fg-muted" />
                )}
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-brand-300" />
                  MT4 / MT5 Expert Advisor (EA)
                </CardTitle>
              </button>
            </CardHeader>
            {eaOpen && (
              <CardBody className="space-y-4 text-xs text-fg-muted">
                <p>
                  Drop a small EA into your MetaTrader terminal, paste your Genesis API key, and
                  trades push to your account in real time. Works with <strong className="text-fg">any broker</strong>.
                </p>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    How it works
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-5">
                    <li>Download the EA file (MT4 or MT5 version) from the links below.</li>
                    <li>
                      Copy the <code className="rounded bg-bg-soft px-1 py-0.5 text-[10px] text-fg">.mq4</code> /{" "}
                      <code className="rounded bg-bg-soft px-1 py-0.5 text-[10px] text-fg">.mq5</code> file into your
                      MetaTrader{" "}
                      <code className="rounded bg-bg-soft px-1 py-0.5 text-[10px] text-fg">MQL4/Experts</code> or{" "}
                      <code className="rounded bg-bg-soft px-1 py-0.5 text-[10px] text-fg">MQL5/Experts</code> folder.
                    </li>
                    <li>
                      In MetaTrader, go to <strong className="text-fg">Tools → Options → Expert Advisors</strong>, check
                      &quot;Allow WebRequest for listed URL&quot; and add your Genesis endpoint.
                    </li>
                    <li>Attach the EA to any chart, enter your Genesis API key, and it runs 24/7.</li>
                    <li>
                      Run it on an <strong className="text-fg">Oracle Cloud free Windows VPS</strong> to capture trades
                      placed from your phone or any other device.
                    </li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Your API key
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-line bg-bg-soft/40 px-3 py-2 font-mono text-[11px] text-fg-subtle">
                      API key will appear here once generated
                    </div>
                    <Button variant="secondary" disabled title="Coming soon">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Download EA
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled title="Coming soon">
                      <Download className="h-3.5 w-3.5" /> MT4 EA (.mq4)
                    </Button>
                    <Button variant="secondary" disabled title="Coming soon">
                      <Download className="h-3.5 w-3.5" /> MT5 EA (.mq5)
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                  The EA files and API key issuance are being finalized. Once shipped, download
                  buttons and key generation will activate here.
                </div>
              </CardBody>
            )}
          </Card>

          {/* Direct broker sync section */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setBrokerOpen((o) => !o)}
                className="flex w-full items-center gap-2 text-left"
              >
                {brokerOpen ? (
                  <ChevronDown className="h-4 w-4 text-fg-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-fg-muted" />
                )}
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-brand-300" />
                  Direct broker sync
                </CardTitle>
              </button>
            </CardHeader>
            {brokerOpen && (
              <CardBody className="space-y-4 text-xs text-fg-muted">
                <p>
                  For supported brokers, connect once via OAuth / API key and Genesis polls the
                  broker directly. No MetaTrader terminal required.
                </p>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    Supported brokers
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SUPPORTED_BROKERS.map((broker) => (
                      <div
                        key={broker}
                        className="flex items-center justify-between rounded-lg border border-line bg-bg-soft/40 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-fg">{broker}</span>
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-300">
                          Soon
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-bg-soft/30 p-3 text-xs text-fg-subtle">
                  Direct broker integrations require broker-side API partnerships. We are working on
                  connecting HFM and JustMarkets first, with more brokers to follow. In the
                  meantime, use the EA method above — it works with every broker.
                </div>
              </CardBody>
            )}
          </Card>
        </div>
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
