"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-3 h-12 w-12 rounded-2xl" />
          <Wordmark size="xl" />
          <p className="mt-2 text-sm text-fg-muted">Reset your password.</p>
        </div>

        {sent ? (
          <div className="space-y-3 text-center text-sm">
            <p className="text-fg">Check your inbox — we&apos;ve sent a reset link to <span className="font-medium">{email}</span>.</p>
            <p className="text-xs text-fg-subtle">Didn&apos;t get it? Check spam, then try again in a few minutes.</p>
            <Link href="/login" className="text-brand-300 hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-fg-muted">
              <Link href="/login" className="text-brand-300 hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
