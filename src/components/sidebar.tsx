"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus, LayoutDashboard, Sun, ListTree, FlaskConical, FileBarChart2,
  CalendarRange, Flame, Calculator, NotebookPen, Sparkles, Settings,
  LogOut, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/components/app-context";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean };

/** 16-item nav. Recaps consolidated into a single page (sub-views via tabs). */
const NAV: Item[] = [
  { href: "/add-trade", label: "Add Trade", icon: Plus, primary: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/day-view", label: "Day View", icon: Sun },
  { href: "/trades", label: "Trades", icon: ListTree },
  { href: "/backtesting", label: "Backtesting", icon: FlaskConical },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/recaps", label: "Recaps", icon: CalendarRange },
  { href: "/streaks", label: "Streaks", icon: Flame },
  { href: "/prop-firm", label: "Prop Firm Calculator", icon: Calculator },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/numerology", label: "Numerology & Astrology", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggleCollapsed } = useAppState();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const width = collapsed ? "w-[68px]" : "w-60";

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-line bg-bg-soft transition-[width] duration-200 ease-out",
        width
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-line px-3">
        <LogoMark className={cn(collapsed ? "mx-auto h-8 w-8 rounded-lg" : "h-8 w-8 rounded-lg")} />
        {!collapsed && <Wordmark className="text-base" />}
      </div>

      {/* Collapse toggle — sits on the right edge so it never covers content */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-elevated text-fg-muted shadow-sm hover:text-fg"
      >
        {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "mb-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-glow hover:bg-brand-400",
                  collapsed ? "px-0" : "px-3"
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
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-bg-elevated text-fg"
                  : "text-fg-muted hover:bg-bg-elevated hover:text-fg"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-accent")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-2 py-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full text-fg-muted hover:text-danger",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={logout}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
