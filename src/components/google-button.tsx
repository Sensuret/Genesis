"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Google OAuth button (sign-in / sign-up — Supabase treats them the same way).
 * Requires the Google provider to be configured in
 * Supabase Dashboard → Authentication → Providers → Google.
 */
export function GoogleButton({ mode }: { mode: "signin" | "signup" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const siteUrl =
      (typeof window !== "undefined" ? window.location.origin : "") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
        queryParams: { prompt: "select_account" }
      }
    });
    if (oauthErr) {
      setError(oauthErr.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="flex h-10 w-full items-center justify-center gap-3 rounded-xl border border-line bg-bg-elevated text-sm font-medium text-fg transition hover:border-brand-400 hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleGlyph />
        {loading ? "Redirecting…" : mode === "signin" ? "Sign in with Google" : "Sign up with Google"}
      </button>
      {error && <div className="rounded-lg bg-danger/10 p-2 text-xs text-danger">{error}</div>}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.6 12.227c0-.682-.061-1.364-.184-2.045H12v3.858h5.396a4.59 4.59 0 0 1-2.005 3.022v2.5h3.246c1.9-1.747 2.964-4.318 2.964-7.335Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.972-.886 6.637-2.438l-3.246-2.5c-.9.6-2.058.954-3.391.954-2.605 0-4.811-1.755-5.6-4.114H3.043v2.582A9.998 9.998 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.902a5.985 5.985 0 0 1 0-3.804V7.516H3.044a10.011 10.011 0 0 0 0 8.968l3.355-2.582Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.984c1.466 0 2.781.504 3.815 1.493l2.864-2.864C16.972 3.052 14.7 2 12 2 7.998 2 4.535 4.293 3.044 7.516L6.4 10.098C7.188 7.74 9.395 5.984 12 5.984Z"
        fill="#EA4335"
      />
    </svg>
  );
}
