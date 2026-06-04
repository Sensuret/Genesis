/** Shared Supabase env helpers (server + client). */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Supports legacy anon JWT or new `sb_publishable_` keys from the dashboard. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR-PROJECT") &&
      !url.includes("placeholder.supabase.co") &&
      key !== "your-anon-public-key" &&
      key !== "placeholder-anon-key"
  );
}
