"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { BrandLockup } from "@/components/logo";
import { GoogleButton } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { friendlyAuthMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

const SIGN_IN_TIMEOUT_MS = 25_000;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hydrated = useHydrated();
  const supabaseReady = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !hydrated) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Sign-in timed out. Check your connection and try again.")),
          SIGN_IN_TIMEOUT_MS
        );
      });

      const { data, error: signInErr } = await Promise.race([signInPromise, timeoutPromise]);

      if (signInErr) {
        setError(friendlyAuthMessage(signInErr.message, "login"));
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("Sign-in succeeded but no session was issued. Try again.");
        setLoading(false);
        return;
      }

      // Ensure auth cookies are flushed before navigating into (app) routes.
      await supabase.auth.getSession();
      router.refresh();
      router.push(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign in. Try again.";
      setError(friendlyAuthMessage(msg, "login"));
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLockup wordmarkSize="xl" markClassName="h-14" />
          <p className="mt-4 text-sm text-fg-muted">Welcome back. Sign in to your edge.</p>
        </div>

        {!supabaseReady && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            Supabase env vars are missing or the dev server was started before <code>.env.local</code>{" "}
            existed. Add your keys, stop the server (Ctrl+C), run <code>npm run dev</code> again, and open
            the URL shown in the terminal.
          </div>
        )}

        <GoogleButton mode="signin" />

        <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Password</Label>
            <PasswordInput
              required
              minLength={4}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link className="text-sky-400 hover:text-violet-300 hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          </div>

          {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
          {info && <div className="rounded-lg bg-success/10 p-3 text-xs text-success">{info}</div>}

          <Button type="submit" className="w-full" disabled={loading || !hydrated}>
            {!hydrated ? "Loading…" : loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Don&apos;t have an account?{" "}
          <Link className="text-sky-400 hover:text-violet-300 hover:underline" href="/register">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
