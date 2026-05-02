import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { FiltersProvider } from "@/lib/filters/store";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
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
  );
}
