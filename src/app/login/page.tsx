"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { GoogleButton } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !hydrated) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInErr) {
      setError(friendlyAuthMessage(signInErr.message, "login"));
      setLoading(false);
      return;
    }

    if (data.session) {
      // Force a full reload so server components pick up the new session cookie.
      window.location.assign(next);
    } else {
      setError("Sign-in succeeded but no session was issued. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-3 h-12 w-12 rounded-2xl" />
          <Wordmark size="xl" />
          <p className="mt-2 text-sm text-fg-muted">Welcome back. Sign in to your edge.</p>
        </div>

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
            <Input
              type="password"
              required
              minLength={4}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link className="text-brand-300 hover:underline" href="/forgot-password">
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
          <Link className="text-brand-300 hover:underline" href="/register">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
