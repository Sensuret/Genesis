"use client";

import { ExternalLink, Lock, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BrokerStatus = "planned" | "beta" | "live";

type SupportedBroker = {
  key: string;
  name: string;
  region: string;
  /** Where the user signs in to manage their account / fund / withdraw. */
  brokerUrl: string;
  /** "live" once we ship a working OAuth/API connector. */
  status: BrokerStatus;
  /** Short note explaining the integration shape (REST / OAuth / FIX). */
  note: string;
};

// Curated list of brokers Jimmie uses + the rest of the major MT-compatible
// brokers users have asked about. Order: primary brokers first, then the
// rest alphabetically.
const BROKERS: SupportedBroker[] = [
  {
    key: "hfm",
    name: "HFM (HF Markets)",
    region: "Global · CY / SC / KE",
    brokerUrl: "https://www.hfm.com",
    status: "planned",
    note: "REST API via partner programme · ETA after partner approval"
  },
  {
    key: "justmarkets",
    name: "JustMarkets",
    region: "Global · SC / SVG",
    brokerUrl: "https://justmarkets.com",
    status: "planned",
    note: "REST API via JustMarkets API · pending API key issuance"
  },
  {
    key: "xm",
    name: "XM",
    region: "Global · CY / AU / BZ",
    brokerUrl: "https://www.xm.com",
    status: "planned",
    note: "MT4/MT5 only — fall back to the Expert Advisor tab"
  },
  {
    key: "exness",
    name: "Exness",
    region: "Global · SC / CY / VC",
    brokerUrl: "https://www.exness.com",
    status: "planned",
    note: "Web-API in private beta · invite-only"
  },
  {
    key: "icmarkets",
    name: "IC Markets",
    region: "Global · AU / SC / CY",
    brokerUrl: "https://www.icmarkets.com",
    status: "planned",
    note: "FIX 4.4 / cTrader Open API · Open API connector planned"
  },
  {
    key: "capitalmarkets",
    name: "Capital Markets",
    region: "Global · varies",
    brokerUrl: "https://www.capital.com",
    status: "planned",
    note: "Capital.com REST API · public docs, OAuth flow on roadmap"
  }
];

const STATUS_TONE: Record<BrokerStatus, string> = {
  planned: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
  beta: "bg-violet-500/15 text-violet-200 border border-violet-400/30",
  live: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
};
const STATUS_LABEL: Record<BrokerStatus, string> = {
  planned: "Planned",
  beta: "Beta",
  live: "Live"
};

/**
 * Direct broker auto-sync — for brokers that expose a partner API,
 * connect once via OAuth/API key and Genesis polls the broker directly.
 * No MetaTrader terminal required, works from any device.
 *
 * Rendered under Settings → Accounts → Synced Brokers. Each broker card
 * is a placeholder with current status; "Connect" wires up once the
 * broker-specific OAuth flow is implemented in a follow-up release.
 */
export function SyncedBrokersCard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-300" />
            Direct broker sync
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-xs text-fg-muted">
          <p>
            For brokers that expose a partner REST / FIX API, Genesis connects directly — no
            MetaTrader terminal, no VPS. Trades stream in from the broker as they execute, on
            any device.
          </p>
          <p>
            Until each broker is wired up, you can use the{" "}
            <span className="font-medium text-fg">MT4 / MT5 Expert Advisor</span> tab to capture
            the same trades via MetaTrader. The EA path works for every broker on this list.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported brokers</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-2 sm:grid-cols-2">
            {BROKERS.map((b) => (
              <li
                key={b.key}
                className="flex flex-col gap-2 rounded-xl border border-line bg-bg-soft/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg">{b.name}</div>
                    <div className="text-[10.5px] text-fg-subtle">{b.region}</div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      STATUS_TONE[b.status]
                    )}
                  >
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <div className="text-[11px] text-fg-muted">{b.note}</div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled
                    title="Connector not yet available — use MT4/MT5 Expert Advisor"
                    className="inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/40 px-2 text-[11px] text-fg-subtle opacity-70"
                  >
                    <Lock className="h-3 w-3" />
                    Connect
                  </button>
                  <a
                    href={b.brokerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-bg-soft px-2 text-[11px] text-fg-muted hover:text-fg"
                  >
                    Broker site
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Don't see your broker?</CardTitle>
        </CardHeader>
        <CardBody className="text-xs text-fg-muted">
          As long as the broker offers MetaTrader 4 or MetaTrader 5, the{" "}
          <span className="font-medium text-fg">MT4 / MT5 Expert Advisor</span> tab works
          regardless of which broker is on this list — it talks to MetaTrader directly. Drop the
          EA on a chart, paste your Genesis API key, and trades flow in.
        </CardBody>
      </Card>
    </div>
  );
}
