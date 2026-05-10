"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RotateCcw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useFilters, CURRENCIES, DATE_RANGES, type AppFilters } from "@/lib/filters/store";
import { useTrades } from "@/lib/hooks/use-trades";
import type { PlaybookRow, ProfileRow, TradeFileRow } from "@/lib/supabase/types";
import { useT } from "@/lib/i18n/context";
import type { TranslateValues } from "@/lib/i18n/translate";
import {
  accountSourceLabel,
  accountSourceChipClass
} from "@/lib/accounts/source-label";

/** Maps the filter-store DateRange ids to topbar.range_* translation keys.
 *  Keeps the canonical id list as the source of truth while still letting
 *  every visible label flip language with the active locale. */
const RANGE_KEY: Record<AppFilters["dateRange"], string> = {
  all: "topbar.range_all",
  "7d": "topbar.range_7d",
  "30d": "topbar.range_30d",
  "90d": "topbar.range_90d",
  ytd: "topbar.range_ytd",
  "1y": "topbar.range_1y"
};

export function TopBar() {
  const t = useT();
  const { filters, setFilters, reset } = useFilters();
  // Accounts come from the shared TradesProvider cache rather than a
  // duplicate query — eliminates the dropdown briefly going empty when
  // a file is imported or deleted, since the provider holds onto the
  // last good list while it refreshes in the background.
  const { files: accounts } = useTrades();
  const [profile, setProfile] = useState<Partial<ProfileRow> | null>(null);
  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12
        ? t("topbar.greeting_morning")
        : h < 18
          ? t("topbar.greeting_afternoon")
          : t("topbar.greeting_evening")
    );
    // Re-runs when the active locale changes so the greeting flips
    // language live without waiting for the next page load.
  }, [t]);

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;
    let unsubPlaybooks: (() => void) | null = null;

    async function refreshPlaybooks() {
      const { data } = await supabase
        .from("playbooks")
        .select("*")
        .order("name", { ascending: true });
      setPlaybooks((data ?? []) as PlaybookRow[]);
    }

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      userId = user.id;
      const [{ data: prof }, { data: pbs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,avatar_url,email,default_currency")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("playbooks").select("*").order("name", { ascending: true })
      ]);
      setProfile(prof ?? { email: user.email });
      setPlaybooks((pbs ?? []) as PlaybookRow[]);
      if (prof?.default_currency && filters.currency === "USD") {
        setFilters({ currency: prof.default_currency });
      }

      // Playbooks are still subscribed to here — accounts/trades are
      // owned by TradesProvider and updated centrally there, so we don't
      // duplicate that channel.
      const playbooksChannel = supabase
        .channel(`topbar-playbooks-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "playbooks", filter: `user_id=eq.${userId}` },
          () => {
            refreshPlaybooks();
          }
        )
        .subscribe();
      unsubPlaybooks = () => {
        supabase.removeChannel(playbooksChannel);
      };
    })();

    // Belt-and-braces: also refresh when the tab regains focus, in case
    // the realtime channel missed an event (network blip, etc.).
    function onFocus() {
      if (!userId) return;
      refreshPlaybooks();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      unsubPlaybooks?.();
    };
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
        title={t("topbar.reset_title")}
        aria-label={t("topbar.reset_title")}
        className="hidden h-9 items-center gap-1.5 rounded-xl border border-line bg-bg-elevated pl-2 pr-2.5 text-fg-muted hover:border-brand-400 hover:text-fg sm:inline-flex"
      >
        <RotateCcw className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wide">
          {t("topbar.reset_label")}
        </span>
      </button>

      <Link
        href="/account"
        title={profile?.full_name ?? profile?.email ?? t("topbar.account_label")}
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "₣",
  NZD: "NZ$",
  ZAR: "R",
  KES: "KSh"
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

function CurrencyPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const sym = currencySymbol(value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t("topbar.currency_title", { code: value })}
        aria-label={t("topbar.currency_aria", { code: value })}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg-elevated text-fg transition hover:border-brand-400 hover:text-brand-300",
          open && "border-brand-400 text-brand-200",
          // Compact symbols (1 char) get larger type than multi-char ones (KSh, NZ$).
          sym.length <= 1 ? "text-[15px] font-semibold" : "text-[10px] font-bold leading-none"
        )}
      >
        {sym}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 max-h-80 w-44 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-2 shadow-card">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-brand-500/10",
                c === value ? "text-brand-300" : "text-fg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-line bg-bg px-1 text-[11px] font-semibold text-fg",
                  c === value && "border-brand-400 text-brand-200"
                )}
              >
                {currencySymbol(c)}
              </span>
              <span className="font-medium">{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRangePicker({
  value,
  onChange
}: {
  value: AppFilters["dateRange"];
  onChange: (v: AppFilters["dateRange"]) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const currentLabel = t(RANGE_KEY[value]);
  return (
    <Pop
      label={<>{t("topbar.range_label")} · <span className="text-fg">{currentLabel}</span></>}
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
          {t(RANGE_KEY[d.id])}
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = value ? playbooks.find((p) => p.id === value) : null;
  // Playbook names are user-authored strings, so they're rendered
  // verbatim. Only the "All playbooks" placeholder is translated.
  const label = current ? current.name : t("topbar.playbook_all");
  return (
    <Pop
      label={<>{t("topbar.playbook_label")} · <span className="text-fg">{label}</span></>}
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
        {t("topbar.playbook_all")}
      </button>
      {playbooks.length === 0 && (
        <p className="px-3 py-2 text-xs text-fg-subtle">
          {t("topbar.playbook_empty_hint")}
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
  const t = useT();
  const [open, setOpen] = useState(false);
  // Defensive: dedupe the live selection against the actual account IDs so a
  // stale ID left over from a deleted file (or a duplicate accidentally
  // pushed into the filter store) can't make the count read as N+1.
  const validSelectedIds = useMemo(() => {
    const known = new Set(accounts.map((a) => a.id));
    return Array.from(new Set(value.filter((id) => known.has(id))));
  }, [accounts, value]);
  const selectedCount = validSelectedIds.length;
  const label =
    accounts.length === 0
      ? t("topbar.accounts_none")
      : selectedCount === 0
        ? t("topbar.accounts_all_count", { count: accounts.length } satisfies TranslateValues)
        : selectedCount === 1
          ? (accounts.find((a) => a.id === validSelectedIds[0])?.name ?? t("topbar.account_label"))
          : t("topbar.accounts_count_of", {
              count: selectedCount,
              total: accounts.length
            } satisfies TranslateValues);

  // Once we know the live filter has stale IDs (e.g. the user deleted a file
  // somewhere else), self-heal by writing the cleaned list back. Without
  // this the chip would keep reporting a phantom count after deletes.
  useEffect(() => {
    if (validSelectedIds.length !== value.length) {
      onChange(validSelectedIds);
    }
  }, [validSelectedIds, value, onChange]);

  function toggle(id: string) {
    if (validSelectedIds.includes(id)) {
      onChange(validSelectedIds.filter((x) => x !== id));
    } else {
      onChange([...validSelectedIds, id]);
    }
  }

  return (
    <Pop
      label={<>{t("topbar.accounts_label")} · <span className="text-fg">{label}</span></>}
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
        {t("topbar.accounts_all")}
      </button>
      {accounts.length === 0 && (
        <p className="px-3 py-2 text-xs text-fg-subtle">
          {t("topbar.accounts_empty_hint")}
        </p>
      )}
      {accounts.map((a) => {
        const selected = value.includes(a.id);
        const source = accountSourceLabel(a);
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
              <span className="text-fg-subtle">
                {t("topbar.accounts_trades_suffix", { count: a.trade_count })}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                accountSourceChipClass(source.tone)
              )}
              title={source.description}
              aria-label={source.description}
            >
              {source.text}
            </span>
          </button>
        );
      })}
    </Pop>
  );
}
