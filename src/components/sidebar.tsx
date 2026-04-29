"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus, LayoutDashboard, Sun, ListTree, FlaskConical, FileBarChart2,
  CalendarRange, CalendarDays, CalendarClock, CalendarCheck2, Flame,
  Calculator, NotebookPen, Sparkles, Settings, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean };

const NAV: Item[] = [
  { href: "/add-trade", label: "Add Trade", icon: Plus, primary: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/day-view", label: "Day View", icon: Sun },
  { href: "/trades", label: "Trades", icon: ListTree },
  { href: "/backtesting", label: "Backtesting", icon: FlaskConical },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/recap/weekly", label: "Weekly Recap", icon: CalendarRange },
  { href: "/recap/monthly", label: "Monthly Recap", icon: CalendarDays },
  { href: "/recap/quarterly", label: "Quarterly Recap", icon: CalendarClock },
  { href: "/recap/annual", label: "Annual Recap", icon: CalendarCheck2 },
  { href: "/streaks", label: "Streaks", icon: Flame },
  { href: "/prop-firm", label: "Prop Firm Calculator", icon: Calculator },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/numerology", label: "Numerology & Astrology", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-bg-soft">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <LogoMark />
        <Wordmark className="text-base" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-glow hover:bg-brand-400"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-500/15 text-brand-300"
                  : "text-fg-muted hover:bg-bg-elevated hover:text-fg"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-2 text-xs text-fg-subtle">
          <span>Theme</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-fg-muted hover:text-danger"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </aside>
  );
}
