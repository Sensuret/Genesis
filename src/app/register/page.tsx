"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { GoogleButton } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthMessage } from "@/lib/auth-errors";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !hydrated) return;
    setLoading(true);
    setError(null);

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name }
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

    // If a session was issued immediately (e.g. project has email confirmation
    // disabled), drop straight into the app. Otherwise show the OTP code step.
    if (data.session) {
      window.location.assign("/dashboard");
      return;
    }

    setOtpStep(true);
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (verifying || !hydrated) return;
    const code = otpCode.trim();
    if (code.length < 6) {
      setOtpError("Enter the 6-digit code from the email we just sent you.");
      return;
    }
    setVerifying(true);
    setOtpError(null);

    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "signup"
    });

    if (verifyErr) {
      setOtpError(friendlyAuthMessage(verifyErr.message, "signup"));
      setVerifying(false);
      return;
    }

    // Verified — Supabase has stored the session in the client. Force a full
    // reload so the server picks up the cookie on the next render.
    window.location.assign("/dashboard");
  }

  async function resendOtp() {
    if (verifying) return;
    setOtpError(null);
    const supabase = createClient();
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: email.trim()
    });
    if (resendErr) {
      setOtpError(friendlyAuthMessage(resendErr.message, "signup"));
      return;
    }
    setOtpError("New code sent. Check your email.");
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

        {otpStep ? (
          <form onSubmit={verifyOtp} className="space-y-4" noValidate>
            <p className="text-center text-sm text-fg">
              We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below
              to confirm your account — no need to click any link.
            </p>
            <div>
              <Label>Confirmation code</Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]*"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-[0.4em]"
                required
              />
            </div>

            {otpError && (
              <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{otpError}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={verifying || !hydrated || otpCode.length < 6}
            >
              {!hydrated
                ? "Loading…"
                : verifying
                  ? "Verifying…"
                  : "Confirm & continue"}
            </Button>

            <div className="flex items-center justify-between text-xs text-fg-muted">
              <button
                type="button"
                onClick={resendOtp}
                disabled={verifying}
                className="text-brand-300 hover:underline disabled:opacity-60"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOtpCode("");
                  setOtpError(null);
                }}
                className="text-fg-muted hover:text-fg"
              >
                Use a different email
              </button>
            </div>
          </form>
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

              <Button type="submit" className="w-full" disabled={loading || !hydrated}>
                {!hydrated ? "Loading…" : loading ? "Creating account…" : "Create account"}
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
