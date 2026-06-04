import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { FiltersProvider } from "@/lib/filters/store";
import { TradesProvider } from "@/lib/hooks/use-trades";
import { LocaleProvider } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Use getSession() (cookie-only) instead of getUser() (network call to
  // Supabase Auth on every navigation). The /middleware.ts already validates
  // the session and redirects to /login when the cookie is missing or stale,
  // so reading from the cookie here is both safe and dramatically faster —
  // shaving ~300-1500ms off every route change.
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <LocaleProvider>
      <TradesProvider>
        <FiltersProvider>
          {/* h-screen on the outer flex pins the viewport height so only <main>
              scrolls. The sidebar stays static when the page content overflows. */}
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex h-screen min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="flex-1 overflow-y-auto overscroll-contain bg-bg p-5 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </FiltersProvider>
      </TradesProvider>
    </LocaleProvider>
  );
}
