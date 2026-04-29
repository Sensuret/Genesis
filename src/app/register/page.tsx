"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("already registered") || m.includes("user already")) {
    return "Account already exists. Sign in instead.";
  }
  if (m.includes("weak") || m.includes("at least")) {
    return "Password too weak. Try at least 4 characters.";
  }
  if (m.includes("invalid email")) {
    return "That email looks invalid.";
  }
  return raw;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password.length < 4) {
      setLoading(false);
      setError("Password must be at least 4 characters.");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined
      }
    });
    setLoading(false);
    if (error) {
      setError(humanizeAuthError(error.message));
      return;
    }
    // Supabase returns identities=[] when the email already has an account but is unconfirmed.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Account already exists. Sign in instead.");
      return;
    }
    if (data.session) router.replace("/dashboard");
    else setSuccess(true);
  }

  async function googleSignUp() {
    setError(null);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
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
          <p className="mt-2 text-sm text-fg-muted">Create your account and start journaling.</p>
        </div>

        {success ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-fg">Check your email to confirm your account.</p>
            <Link href="/login" className="text-sm text-brand-300 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              className="mb-4 w-full justify-center gap-2"
              onClick={googleSignUp}
            >
              <GoogleG className="h-4 w-4" />
              Sign up with Google
            </Button>

            <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-wide text-fg-subtle">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-fg-subtle">Minimum 4 characters.</p>
              </div>

              {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}

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

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#EA4335" d="M12 11v3.4h5.6c-.24 1.6-1.7 4.7-5.6 4.7-3.4 0-6.1-2.8-6.1-6.3S8.6 6.5 12 6.5c1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.8 14.7 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.5-4.8 9.5-7.7 0-.5 0-.9-.1-1.3H12z" />
    </svg>
  );
}
