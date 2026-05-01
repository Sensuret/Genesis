"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { GoogleButton } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthMessage } from "@/lib/auth-errors";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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

    const supabase = createClient();
    const siteUrl =
      (typeof window !== "undefined" ? window.location.origin : "") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`
      }
    });

    if (signUpErr) {
      setError(friendlyAuthMessage(signUpErr.message, "signup"));
      setLoading(false);
      return;
    }

    // Supabase returns a non-error response with `data.user.identities = []`
    // when an account with this email already exists (to prevent enumeration).
    // We surface the friendlier "account already exists" message in that case.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError(
        "An account with this email already exists. Sign in or use Forgot password."
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.assign("/dashboard");
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-3 h-12 w-12 rounded-2xl" />
          <Wordmark size="xl" />
          <p className="mt-2 text-sm text-fg-muted">Create your account and start journaling.</p>
        </div>

        {success ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-fg">
              Check your email to confirm your account, then come back here to sign in.
            </p>
            <Link href="/login" className="text-sm text-brand-300 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <GoogleButton mode="signup" />

            <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
              <div className="h-px flex-1 bg-line" />
              or
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Password (min 4 characters)</Label>
                <Input
                  type="password"
                  minLength={4}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-fg-muted">
          Already have an account?{" "}
          <Link className="text-brand-300 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
