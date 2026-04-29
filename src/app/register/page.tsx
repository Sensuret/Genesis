"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LogoMark, Wordmark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

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
      setError(error.message);
      return;
    }
    if (data.session) router.replace("/dashboard");
    else setSuccess(true);
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
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
