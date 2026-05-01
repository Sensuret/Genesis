"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useFilters, CURRENCIES, DATE_RANGES, type AppFilters } from "@/lib/filters/store";
import type { PlaybookRow, ProfileRow, TradeFileRow } from "@/lib/supabase/types";

export function TopBar() {
  const { filters, setFilters, reset } = useFilters();
  const [profile, setProfile] = useState<Partial<ProfileRow> | null>(null);
  const [accounts, setAccounts] = useState<TradeFileRow[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const [{ data: prof }, { data: files }, { data: pbs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,avatar_url,email,default_currency")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("trade_files").select("*").order("created_at", { ascending: false }),
        supabase.from("playbooks").select("*").order("name", { ascending: true })
      ]);
      setProfile(prof ?? { email: user.email });
      setAccounts(files ?? []);
      setPlaybooks((pbs ?? []) as PlaybookRow[]);
      // If user has a default currency in their profile and the filter is the
      // initial default, prefer the profile currency.
      if (prof?.default_currency && filters.currency === "USD") {
        setFilters({ currency: prof.default_currency });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the full name when we have one ("Money Khari"), otherwise the
  // local-part of the email so we don't greet someone with their full email.
  const displayName = (profile?.full_name && profile.full_name.trim())
    ? profile.full_name.trim()
    : (profile?.email ?? "").split("@")[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-6 backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-fg">
          {greeting}
          {displayName ? `, ${displayName}` : ""}
        </div>
        <div className="truncate text-xs text-fg-subtle">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </div>
      </div>

      <CurrencyPicker
        value={filters.currency}
        onChange={(v) => setFilters({ currency: v })}
      />
      <DateRangePicker
        value={filters.dateRange}
        onChange={(v) => setFilters({ dateRange: v })}
      />
      <AccountsPicker
        accounts={accounts}
        value={filters.accountIds}
        onChange={(v) => setFilters({ accountIds: v })}
      />
      <PlaybookPicker
        playbooks={playbooks}
        value={filters.playbookId}
        onChange={(v) => setFilters({ playbookId: v })}
      />

      <button
        type="button"
        onClick={reset}
        className="hidden h-9 items-center gap-1 rounded-xl border border-line px-3 text-xs text-fg-muted hover:border-brand-400 hover:text-fg sm:inline-flex"
      >
        <X className="h-3.5 w-3.5" /> Reset
      </button>

      <Link
        href="/account"
        title={profile?.full_name ?? profile?.email ?? "Account"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-bg-elevated text-fg-muted hover:border-brand-400 hover:text-fg"
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </Link>
    </header>
  );
}

// ---------- pickers ----------

function Pop({
  label,
  open,
  onToggle,
  onClose,
  children,
  width = "w-56"
}: {
  label: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 text-xs font-medium text-fg-muted transition hover:border-brand-400 hover:text-fg",
          open && "border-brand-400 text-fg"
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-11 z-40 max-h-80 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-2 shadow-card",
            width
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function CurrencyPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Pop
      label={<>Currency · <span className="text-fg">{value}</span></>}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      width="w-40"
    >
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            onChange(c);
            setOpen(false);
          }}
          className={cn(
            "block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-brand-500/10",
            c === value ? "text-brand-300" : "text-fg-muted"
          )}
        >
          {c}
        </button>
      ))}
    </Pop>
  );
}

function DateRangePicker({
  value,
  onChange
}: {
  value: AppFilters["dateRange"];
  onChange: (v: AppFilters["dateRange"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = DATE_RANGES.find((d) => d.id === value);
  return (
    <Pop
      label={<>Range · <span className="text-fg">{current?.label}</span></>}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
    >
      {DATE_RANGES.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => {
            onChange(d.id);
            setOpen(false);
          }}
          className={cn(
            "block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-brand-500/10",
            d.id === value ? "text-brand-300" : "text-fg-muted"
          )}
        >
          {d.label}
        </button>
      ))}
    </Pop>
  );
}

function PlaybookPicker({
  playbooks,
  value,
  onChange
}: {
  playbooks: PlaybookRow[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? playbooks.find((p) => p.id === value) : null;
  const label = current ? current.name : "All playbooks";
  return (
    <Pop
      label={<>Playbook · <span className="text-fg">{label}</span></>}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      width="w-64"
    >
      <button
        type="button"
        onClick={() => {
          onChange(null);
          setOpen(false);
        }}
        className={cn(
          "block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-brand-500/10",
          value === null ? "text-brand-300" : "text-fg-muted"
        )}
      >
        All playbooks
      </button>
      {playbooks.length === 0 && (
        <p className="px-3 py-2 text-xs text-fg-subtle">
          No playbooks yet — create one in the Playbooks page.
        </p>
      )}
      {playbooks.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            onChange(p.id);
            setOpen(false);
          }}
          className={cn(
            "block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-brand-500/10",
            p.id === value ? "text-brand-300" : "text-fg-muted"
          )}
        >
          {p.name}
        </button>
      ))}
    </Pop>
  );
}

function AccountsPicker({
  accounts,
  value,
  onChange
}: {
  accounts: TradeFileRow[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    accounts.length === 0
      ? "No accounts"
      : value.length === 0
        ? `All accounts (${accounts.length})`
        : value.length === 1
          ? (accounts.find((a) => a.id === value[0])?.name ?? "Account")
          : `${value.length} accounts`;

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <Pop
      label={<>Accounts · <span className="text-fg">{label}</span></>}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      width="w-72"
    >
      <button
        type="button"
        onClick={() => onChange([])}
        className="mb-1 block w-full rounded-lg px-3 py-1.5 text-left text-xs text-brand-300 hover:bg-brand-500/10"
      >
        All accounts
      </button>
      {accounts.length === 0 && (
        <p className="px-3 py-2 text-xs text-fg-subtle">
          No accounts yet — upload a CSV to get started.
        </p>
      )}
      {accounts.map((a) => {
        const selected = value.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggle(a.id)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs hover:bg-brand-500/10"
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                selected ? "border-brand-400 bg-brand-500/30" : "border-line bg-bg"
              )}
            >
              {selected && <span className="h-2 w-2 rounded-sm bg-brand-300" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-fg-muted">
              {a.name}{" "}
              <span className="text-fg-subtle">· {a.trade_count} trades</span>
            </span>
          </button>
        );
      })}
    </Pop>
  );
}
