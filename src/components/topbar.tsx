"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Calendar, Filter, Database, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CURRENCIES, useAppState } from "@/components/app-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { TradeFileRow, ProfileRow } from "@/lib/supabase/types";

/**
 * Top app bar. Tradezella-style:
 *   [Greeting]  [Currency ▾]  [Filters ▾]  [Date range ▾]  [Files ▾]  [Theme]  [Avatar]
 */
export function TopBar() {
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [files, setFiles] = useState<TradeFileRow[]>([]);
  const { currency, setCurrency, selectedFileIds, setSelectedFileIds, dateRange, setDateRange } =
    useAppState();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: profile }, { data: filesData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle<ProfileRow>(),
        supabase.from("trade_files").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false })
      ]);
      const fullName = profile?.full_name || u.user.user_metadata?.full_name || u.user.email?.split("@")[0] || "trader";
      setName(fullName);
      setAvatar(profile?.avatar_url ?? null);
      setFiles((filesData ?? []) as TradeFileRow[]);
    })();
  }, []);

  const greeting = greetingForHour(new Date().getHours());
  const firstName = name.split(/\s+/)[0] || name;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg-soft/85 px-4 backdrop-blur md:px-6">
      <div className="hidden min-w-0 flex-1 truncate text-sm md:block">
        <span className="text-fg-muted">{greeting}, </span>
        <span className="font-medium text-fg">{firstName}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CurrencyMenu value={currency} onChange={setCurrency} />
        <FiltersMenu />
        <DateRangeMenu value={dateRange} onChange={setDateRange} />
        <FilesMenu files={files} value={selectedFileIds} onChange={setSelectedFileIds} />
        <div className="hidden md:block">
          <ThemeToggle size="sm" />
        </div>
        <AvatarMenu name={name} avatar={avatar} />
      </div>
    </header>
  );
}

function greetingForHour(h: number): string {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

// --------------------------------------------------------------------------
// Generic dropdown helper
// --------------------------------------------------------------------------
function Dropdown({
  label,
  icon,
  children,
  width = "w-64"
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 max-h-[60vh] overflow-auto rounded-xl border border-line bg-bg-elevated p-2 shadow-card",
            width
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
function CurrencyMenu({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Dropdown
      label={value}
      icon={<span className="font-mono text-xs">$</span>}
      width="w-44"
    >
      {(close) => (
        <ul className="space-y-0.5 text-sm">
          {CURRENCIES.map((c) => (
            <li key={c}>
              <button
                onClick={() => { onChange(c); close(); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left",
                  value === c ? "bg-bg-soft font-medium text-fg" : "text-fg-muted hover:bg-bg-soft"
                )}
              >
                <span>{c}</span>
                {value === c && <span className="text-accent">●</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  );
}

function FiltersMenu() {
  return (
    <Dropdown label="Filters" icon={<Filter className="h-3.5 w-3.5" />} width="w-72">
      {() => (
        <div className="p-2 text-sm text-fg-muted">
          <p className="mb-2 font-medium text-fg">Quick filters</p>
          <p className="text-xs leading-relaxed">
            Use the toolbar inside Trades / Reports to filter by pair, side, setup,
            mistake or P&amp;L sign. Global persistent filters land here in a future update.
          </p>
        </div>
      )}
    </Dropdown>
  );
}

function DateRangeMenu({
  value,
  onChange
}: {
  value: { from?: string; to?: string };
  onChange: (r: { from?: string; to?: string }) => void;
}) {
  const label = value.from || value.to ? `${value.from ?? "…"} → ${value.to ?? "…"}` : "Date range";
  return (
    <Dropdown label={label} icon={<Calendar className="h-3.5 w-3.5" />} width="w-72">
      {(close) => (
        <div className="space-y-2 p-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              From
              <input
                type="date"
                value={value.from ?? ""}
                onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
                className="rounded-lg border border-line bg-bg-soft px-2 py-1 text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              To
              <input
                type="date"
                value={value.to ?? ""}
                onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
                className="rounded-lg border border-line bg-bg-soft px-2 py-1 text-fg"
              />
            </label>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onChange({}); close(); }}
            >
              Clear
            </Button>
            <Button size="sm" onClick={close}>Apply</Button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

function FilesMenu({
  files,
  value,
  onChange
}: {
  files: TradeFileRow[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const label = value.length === 0 ? "All files" : value.length === 1 ? "1 file" : `${value.length} files`;
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <Dropdown label={label} icon={<Database className="h-3.5 w-3.5" />} width="w-72">
      {() => (
        <div className="space-y-1 p-1 text-sm">
          <button
            onClick={() => onChange([])}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5",
              value.length === 0 ? "bg-bg-soft font-medium text-fg" : "text-fg-muted hover:bg-bg-soft"
            )}
          >
            <span>All files</span>
            {value.length === 0 && <span className="text-accent">●</span>}
          </button>
          {files.length === 0 && (
            <div className="px-2 py-3 text-xs text-fg-subtle">
              No uploaded files yet. Upload trades to see them here.
            </div>
          )}
          {files.map((f) => (
            <label
              key={f.id}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-fg-muted hover:bg-bg-soft"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.includes(f.id)}
                  onChange={() => toggle(f.id)}
                  className="h-3.5 w-3.5"
                />
                <span>{f.name}</span>
              </span>
              <span className="text-xs text-fg-subtle">{f.trade_count ?? 0}</span>
            </label>
          ))}
        </div>
      )}
    </Dropdown>
  );
}

function AvatarMenu({ name, avatar }: { name: string; avatar: string | null }) {
  return (
    <Link href="/account" aria-label="Account" title="Account">
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-elevated text-fg-muted hover:text-fg">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name || "avatar"} className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-4 w-4" />
        )}
      </span>
    </Link>
  );
}
