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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-bg p-8">{children}</main>
        </div>
      </div>
    </FiltersProvider>
  );
}
