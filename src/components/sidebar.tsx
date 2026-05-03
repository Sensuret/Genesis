"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus, LayoutDashboard, Sun, ListTree, FileBarChart2, CalendarRange,
  Flame, Calculator, NotebookPen, Sparkles, Settings, LogOut,
  ChevronLeft, ChevronRight, BookOpen, BarChart3, User
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean };

/**
 * Single canonical nav order. The four recap pages collapse to a single
 * /recaps entry once Phase 3 lands; until then we point at /recap/weekly so
 * the existing pages stay reachable.
 */
const NAV: Item[] = [
  { href: "/add-trade", label: "Add Trade", icon: Plus, primary: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/day-view", label: "Day View", icon: Sun },
  { href: "/trades", label: "Trades", icon: ListTree },
  { href: "/gs-insights", label: "GS Insights", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/recaps", label: "Recaps", icon: CalendarRange },
  { href: "/streaks", label: "Streaks", icon: Flame },
  { href: "/prop-firm", label: "Prop Firm Calculator", icon: Calculator },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/numerology", label: "Numerology & Astrology", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings }
];

const STORAGE_KEY = "gs.sidebar.collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Partial<ProfileRow> | null>(null);
  // Optimistic pending-route state: highlight the target link the moment the
  // user clicks, even before the new page's data has resolved. Cleared once
  // the pathname catches up. Prevents the "two highlighted items" effect
  // during slow navigations.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => {
    if (pendingHref && (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`))) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (v === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name,avatar_url,email")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data ?? { email: user.email });
    })();
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-line bg-bg-soft transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      data-collapsed={collapsed}
    >
      {/* Header */}
      <div className={cn("flex h-16 items-center gap-3 border-b border-line", collapsed ? "justify-center px-0" : "px-5")}>
        <LogoMark />
        {!collapsed && <Wordmark className="text-base" />}
      </div>

      {/* Collapse toggle (TradeZella-style chevron). */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-elevated text-fg-muted shadow-card hover:text-brand-300"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {NAV.map((item) => {
          const Icon = item.icon;
          // Prefer the optimistic pending highlight so the clicked link
          // becomes the only "active" item the instant the user clicks.
          const matchesPath = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const active = pendingHref ? pendingHref === item.href : matchesPath;
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  setPendingHref(item.href);
                  startTransition(() => {});
                }}
                className={cn(
                  "mb-3 flex h-10 items-center gap-2 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-glow hover:bg-brand-400",
                  collapsed ? "justify-center px-0" : "justify-center"
                )}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => {
                setPendingHref(item.href);
                startTransition(() => {});
              }}
              className={cn(
                "nav-item-hover flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                active ? "bg-brand-500/15 text-brand-300" : "text-fg-muted hover:text-fg"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: profile chip + theme + logout */}
      <div className={cn("border-t border-line py-3", collapsed ? "px-1" : "px-3")}>
        <Link
          href="/account"
          title={collapsed ? (profile?.full_name ?? profile?.email ?? "Account") : undefined}
          className={cn(
            "mb-2 flex items-center rounded-xl border border-transparent hover:border-line hover:bg-bg-elevated",
            collapsed ? "justify-center p-1.5" : "gap-3 p-2"
          )}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="avatar"
              className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <User className="h-4 w-4" />
            </span>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-fg">
                {profile?.full_name ?? "Your account"}
              </div>
              <div className="truncate text-xs text-fg-subtle">{profile?.email ?? ""}</div>
            </div>
          )}
        </Link>

        <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between px-2 text-xs text-fg-subtle")}>
          {!collapsed && <span>Theme</span>}
          <ThemeToggle />
        </div>

        <Button
          variant="ghost"
          className={cn("w-full text-fg-muted hover:text-danger", collapsed ? "justify-center px-0" : "justify-start")}
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
