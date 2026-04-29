"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase delivers the reset link with a session embedded in the URL
 * fragment. The browser SDK auto-consumes it, so we just need to call
 * updateUser with the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/login?reset=1");
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

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>New password</Label>
            <Input type="password" minLength={4} required value={pw} onChange={(e) => setPw(e.target.value)} />
            <p className="mt-1 text-xs text-fg-subtle">Minimum 4 characters.</p>
          </div>
          <div>
            <Label>Confirm</Label>
            <Input type="password" minLength={4} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Save new password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          <Link href="/login" className="text-brand-300 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
