import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Reads the signed-in user from the local session without a network refresh.
 * Prefer this over `auth.getUser()` in client components to avoid Supabase
 * auth storage lock contention when many hooks mount at once.
 */
export async function getBrowserUser(): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user ?? null;
}
