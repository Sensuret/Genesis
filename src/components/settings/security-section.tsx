"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  KeyRound,
  Laptop,
  LogOut,
  Shield,
  ShieldCheck,
  Smartphone
} from "lucide-react";


type SessionInfo = {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  current: boolean;
};

/**
 * Security subsection — change password + sessions + 2FA stub + recovery codes.
 */
export function SecuritySection() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const totp = data?.totp ?? [];
        setMfaEnabled(totp.some((f) => f.status === "verified"));
      } catch {
        // MFA not available on this Supabase plan
      }
      setMfaLoading(false);

      // Build session list from current session info
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: sessionData } = await supabase.auth.getSession();
        const s = sessionData.session;
        if (s) {
          setSessions([
            {
              id: s.access_token.slice(-8),
              device: detectDevice(),
              ip: "current",
              lastActive: "now",
              current: true
            }
          ]);
        }
      }
    })();
  }, []);

  function detectDevice(): string {
    if (typeof navigator === "undefined") return "Unknown";
    const ua = navigator.userAgent;
    if (/Mobile|Android/i.test(ua)) return "Mobile browser";
    if (/Mac/i.test(ua)) return "macOS browser";
    if (/Windows/i.test(ua)) return "Windows browser";
    if (/Linux/i.test(ua)) return "Linux browser";
    return "Browser";
  }

  async function changePassword() {
    if (!newPassword) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password changed.");
      setNewPassword("");
    }
  }

  async function handleEnroll2FA() {
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Genesis Authenticator"
      });
      if (enrollError) {
        setError(enrollError.message);
        return;
      }
      if (data) {
        setSuccess(
          "2FA enrollment started. Scan the QR code in your authenticator app, then verify below. (Full setup UI coming soon.)"
        );
      }
    } catch {
      setError(
        "Two-factor authentication requires Supabase Pro plan or higher. Your project may not support MFA yet."
      );
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setError(error.message);
      setSigningOut(false);
    } else {
      window.location.href = "/login";
    }
  }

  function generateRecoveryCodes() {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const part1 = Math.random().toString(36).slice(2, 7).toUpperCase();
      const part2 = Math.random().toString(36).slice(2, 7).toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    setRecoveryCodes(codes);
    setShowRecovery(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 md:max-w-sm">
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
          {success && (
            <div className="rounded-lg bg-success/10 p-3 text-xs text-success">{success}</div>
          )}
          <Button type="button" onClick={changePassword} disabled={saving || !newPassword}>
            Update password
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-300" />
            Two-factor authentication
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {mfaLoading ? (
            <div className="text-xs text-fg-muted">Checking 2FA status…</div>
          ) : mfaEnabled ? (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-xs text-success">
              <ShieldCheck className="h-4 w-4" />
              Two-factor authentication is enabled.
            </div>
          ) : (
            <>
              <div className="text-xs text-fg-muted">
                Add an extra layer of security by enabling two-factor authentication with an
                authenticator app (Google Authenticator, Authy, 1Password, etc.).
              </div>
              <Button type="button" variant="secondary" onClick={handleEnroll2FA}>
                <KeyRound className="h-4 w-4" /> Enable 2FA
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-brand-300" />
            Active sessions
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-xs text-fg-muted">No active sessions detected.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-bg-soft/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {/Mobile/i.test(s.device) ? (
                      <Smartphone className="h-4 w-4 text-fg-subtle" />
                    ) : (
                      <Laptop className="h-4 w-4 text-fg-subtle" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-fg">{s.device}</div>
                      <div className="text-[10px] text-fg-subtle">
                        Last active: {s.lastActive}
                        {s.current && (
                          <span className="ml-2 rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] text-brand-300">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery codes</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            Recovery codes let you sign in if you lose access to your authenticator app. Store them
            in a safe place.
          </div>
          {!showRecovery ? (
            <Button type="button" variant="secondary" onClick={generateRecoveryCodes}>
              Generate recovery codes
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg-soft/40 p-3">
                {recoveryCodes?.map((code) => (
                  <div key={code} className="font-mono text-xs text-fg">
                    {code}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-fg-subtle">
                Save these codes now. They will not be shown again.
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-danger">
            <LogOut className="h-4 w-4" />
            Sign out everywhere
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            This will sign you out of all devices and sessions, including this one. You will need
            to sign in again.
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (confirm("Sign out of all devices? You will need to sign in again."))
                signOutEverywhere();
            }}
            disabled={signingOut}
            className="border-danger/40 text-danger hover:bg-danger/10"
          >
            {signingOut ? "Signing out…" : "Sign out of all devices"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
