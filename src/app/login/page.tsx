"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

/** Map raw Supabase error messages to friendlier copy. */
function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_grant")) {
    return "Wrong email or password. Forgot your password?";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — we sent you a link when you signed up.";
  }
  if (m.includes("user not found") || m.includes("no user")) {
    return "Account does not exist. Sign up first.";
  }
  return raw;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const justReset = params.get("reset") === "1";
  const justDeleted = params.get("deleted") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(humanizeAuthError(error.message));
    else router.replace(next);
  }

  async function googleSignIn() {
    setError(null);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) setError(error.message);
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

        {justReset && (
          <div className="mb-4 rounded-lg bg-success/10 p-3 text-xs text-success">
            Password updated. Sign in with your new password.
          </div>
        )}
        {justDeleted && (
          <div className="mb-4 rounded-lg bg-fg-muted/10 p-3 text-xs text-fg-muted">
            Account scrubbed. We&apos;re sorry to see you go.
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          className="mb-4 w-full justify-center gap-2"
          onClick={googleSignIn}
        >
          <GoogleG className="h-4 w-4" />
          Sign in with Google
        </Button>

        <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-wide text-fg-subtle">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              <Link href="/forgot-password" className="text-xs text-brand-300 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
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

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#EA4335" d="M12 11v3.4h5.6c-.24 1.6-1.7 4.7-5.6 4.7-3.4 0-6.1-2.8-6.1-6.3S8.6 6.5 12 6.5c1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.8 14.7 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.5-4.8 9.5-7.7 0-.5 0-.9-.1-1.3H12z" />
    </svg>
  );
}
