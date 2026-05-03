import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { FiltersProvider } from "@/lib/filters/store";
import { TradesProvider } from "@/lib/hooks/use-trades";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // getSession() is a cookie-only read; getUser() makes an auth-server round
  // trip on every page navigation (300–1500ms). The client-side refresh
  // catches any expired sessions.
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
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
  );
}
