import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /auth/callback
 *
 * Handles the redirect from Supabase OAuth (Google) and from
 * email-confirmation links. Exchanges the `code` parameter for a session
 * cookie, then forwards to `next` (defaults to /dashboard).
 *
 * Configure this URL in:
 *   Supabase Dashboard → Auth → URL Configuration → Redirect URLs
 *   e.g. https://your-app.netlify.app/auth/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", errorDescription);
    return NextResponse.redirect(back);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const back = new URL("/login", url.origin);
      back.searchParams.set("error", error.message);
      return NextResponse.redirect(back);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
