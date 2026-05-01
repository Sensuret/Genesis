"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthMessage } from "@/lib/auth-errors";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // When Supabase redirects to this page, it includes a recovery `code` (PKCE)
  // or a hashed access_token (legacy). Either way we need an authenticated
  // session before we can call updateUser. We listen for the recovery event;
  // if a valid recovery session is present we mark the form as `ready`.
  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    async function init() {
      if (code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) {
          setError(friendlyAuthMessage(exchErr.message, "reset"));
        }
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
      }
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(friendlyAuthMessage(updErr.message, "reset"));
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-3 h-12 w-12 rounded-2xl" />
          <Wordmark size="xl" />
          <p className="mt-2 text-sm text-fg-muted">Set a new password.</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-fg">Password updated. You can now sign in.</p>
            <Link href="/login" className="text-sm text-brand-300 hover:underline">
              Continue to sign in
            </Link>
          </div>
        ) : !ready ? (
          <div className="space-y-3 text-center text-sm text-fg-muted">
            {error ? (
              <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>
            ) : (
              <p>Verifying your reset link…</p>
            )}
            <Link href="/forgot-password" className="text-brand-300 hover:underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <Label>New password (min 4 characters)</Label>
              <Input
                type="password"
                minLength={4}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                minLength={4}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
