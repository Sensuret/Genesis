"use client";

import { useState } from "react";
import {
  Banknote,
  Coins,
  History,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Sliders,
  Tag,
  User,
  Wallet
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";
import { AccountsSection } from "@/components/settings/accounts-section";
import { TradeSettingsSection } from "@/components/settings/trade-settings-section";
import { ComingSoonSection } from "@/components/settings/coming-soon-section";
import { cn } from "@/lib/utils";

/**
 * Settings page — TradeZella-style two-column layout. Left rail groups
 * subsections under USERS (Profile / Security / Subscription) and
 * GENERAL (Accounts / Commissions & fees / Trade settings / Global
 * settings / Tags Management / Import history / Log history). Right
 * pane swaps content based on the selected key. Section state is
 * component-local — switching tabs is instant.
 */

type SectionKey =
  | "profile"
  | "security"
  | "subscription"
  | "accounts"
  | "commissions"
  | "trade-settings"
  | "global"
  | "tags"
  | "import-history"
  | "log-history";

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavItem = {
  key: SectionKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavGroup[] = [
  {
    label: "Users",
    items: [
      { key: "profile", label: "Profile", Icon: User },
      { key: "security", label: "Security", Icon: KeyRound },
      { key: "subscription", label: "Subscription", Icon: Wallet }
    ]
  },
  {
    label: "General",
    items: [
      { key: "accounts", label: "Accounts", Icon: Banknote },
      { key: "commissions", label: "Commissions & fees", Icon: Coins },
      { key: "trade-settings", label: "Trade settings", Icon: Sliders },
      { key: "global", label: "Global settings", Icon: LayoutGrid },
      { key: "tags", label: "Tags Management", Icon: Tag },
      { key: "import-history", label: "Import history", Icon: History },
      { key: "log-history", label: "Log history", Icon: ListChecks }
    ]
  }
];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile, security, subscription, and how Genesis processes your trades."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left rail */}
        <aside className="space-y-6">
          {NAV.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-subtle">
                {group.label}
              </div>
              <nav className="rounded-xl border border-line bg-bg-soft/40 p-1">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                      active === item.key
                        ? "bg-brand-500/15 text-fg shadow-sm ring-1 ring-brand-400/40"
                        : "text-fg-muted hover:bg-bg-elevated hover:text-fg"
                    )}
                  >
                    <item.Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active === item.key ? "text-brand-300" : "text-fg-subtle"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        {/* Right pane */}
        <main className="min-w-0">
          <SectionContent section={active} />
        </main>
      </div>
    </div>
  );
}

function SectionContent({ section }: { section: SectionKey }) {
  switch (section) {
    case "profile":
      return <ProfileSection />;
    case "security":
      return <SecuritySection />;
    case "subscription":
      return (
        <ComingSoonSection
          title="Subscription"
          blurb="Plan, billing, invoices and team seats land here. Genesis is currently in active development — every account is on the open beta plan with all features unlocked."
        />
      );
    case "accounts":
      return <AccountsSection />;
    case "commissions":
      return (
        <ComingSoonSection
          title="Commissions & fees"
          blurb="Configure broker-specific commission overrides (per-lot, percentage, fixed) and spreads when the imported statement doesn't carry them. Useful for prop-firm rules or HFM/Exness/JustMarkets accounts where commission is rolled into the spread."
        />
      );
    case "trade-settings":
      return <TradeSettingsSection />;
    case "global":
      return (
        <ComingSoonSection
          title="Global settings"
          blurb="App-wide preferences that don't fit elsewhere — locale, timezone display, weekday-first preferences, default chart units (pips vs points). The session-window Forex/NYSE toggle moved to Trade settings."
        />
      );
    case "tags":
      return (
        <ComingSoonSection
          title="Tags Management"
          blurb="Create, rename and merge custom tags (e.g. 'breakout', 'news-trade', 'A+ setup') so you can label trades from the Trades page and filter Reports/Recaps by them."
        />
      );
    case "import-history":
      return (
        <ComingSoonSection
          title="Import history"
          blurb="Audit log of every statement upload — who uploaded it, when, broker timezone applied, rows parsed and how many were filtered as ghost rows. Helpful for tracing 'why doesn't this trade show?' questions."
        />
      );
    case "log-history":
      return (
        <ComingSoonSection
          title="Log history"
          blurb="Sign-ins, password changes, and account-level events. A full security trail for your records."
        />
      );
    default: {
      const _exhaust: never = section;
      return _exhaust;
    }
  }
}
