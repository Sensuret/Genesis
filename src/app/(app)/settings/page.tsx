"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { ThemePicker } from "@/components/theme-picker";
import { ImportedFilesCard } from "@/components/settings/imported-files";
import { useSessionWindowStyle } from "@/lib/preferences/session-window";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Partial<ProfileRow>>({});
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data);
      setLoading(false);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      dob: profile.dob ?? null,
      default_currency: profile.default_currency ?? "USD",
      starting_balance: profile.starting_balance ?? 0
    });
    setSaving(false);
    if (error) setError(error.message);
    else setSuccess("Profile saved.");
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));
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

  if (loading) return <div className="text-sm text-fg-muted">Loading settings…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Profile, account, and security." />

      <form onSubmit={saveProfile}>
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="h-16 w-16 rounded-full border border-line object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-2xl text-brand-300">
                  {profile.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                  className="text-xs text-fg-muted"
                />
              </div>
            </div>
            <div><Label>Full name</Label><Input value={profile.full_name ?? ""} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={email} disabled /></div>
            <div><Label>Date of birth</Label><Input type="date" value={profile.dob ?? ""} onChange={(e) => setProfile((p) => ({ ...p, dob: e.target.value }))} /></div>
            <div><Label>Default currency</Label><Input value={profile.default_currency ?? "USD"} onChange={(e) => setProfile((p) => ({ ...p, default_currency: e.target.value }))} /></div>
            <div><Label>Starting balance</Label><Input type="number" step="0.01" value={profile.starting_balance ?? 0} onChange={(e) => setProfile((p) => ({ ...p, starting_balance: Number(e.target.value) }))} /></div>

            {error && <div className="md:col-span-2 rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
            {success && <div className="md:col-span-2 rounded-lg bg-success/10 p-3 text-xs text-success">{success}</div>}

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            </div>
          </CardBody>
        </Card>
      </form>

      <ImportedFilesCard />

      <SessionWindowsCard />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-fg-muted">
            The Sun/Moon toggle in the sidebar flips between Pure White and the original Purple. Pick
            Pure Black or Grey here for the full TradeZella-style charcoal experience.
          </p>
          <ThemePicker />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardBody className="grid gap-3 md:max-w-sm">
          <div>
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
          </div>
          <Button type="button" onClick={changePassword} disabled={saving || !newPassword}>
            Update password
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Session windows preference. Controls how the Streaks page brackets the
 * four trading sessions:
 *   - "forex" (default): when each region's interbank desks are open and
 *     FX prices are most liquid. Matches detectSession() in the parser.
 *   - "nyse":  when the major stock exchanges in each region are open.
 *     Useful for index / equity CFD traders.
 * The selection is stored in localStorage (no DB column needed) so it
 * applies per-device — flips immediately on the Streaks page via a
 * `genesis-session-style-change` event.
 */
function SessionWindowsCard() {
  const [style, setStyle] = useSessionWindowStyle();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session windows</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Controls the time ranges shown in the Streaks page session brackets
          (NEWYORK / LONDON / ASIA / SYDNEY). Forex hours reflect when
          interbank desks are open and FX prices move; NYSE hours reflect the
          underlying stock exchanges.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
              style === "forex"
                ? "border-brand-400 bg-brand-500/10 text-fg"
                : "border-line bg-bg-soft text-fg-muted hover:text-fg"
            }`}
          >
            <input
              type="radio"
              name="session-style"
              checked={style === "forex"}
              onChange={() => setStyle("forex")}
              className="mr-2"
            />
            <span className="font-medium">Forex hours</span>
            <span className="ml-2 text-fg-subtle">
              NY 12:00–21:00 UTC · London 07:00–12:00 · Asia 00:00–07:00 · Sydney 21:00–24:00
            </span>
          </label>
          <label
            className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
              style === "nyse"
                ? "border-brand-400 bg-brand-500/10 text-fg"
                : "border-line bg-bg-soft text-fg-muted hover:text-fg"
            }`}
          >
            <input
              type="radio"
              name="session-style"
              checked={style === "nyse"}
              onChange={() => setStyle("nyse")}
              className="mr-2"
            />
            <span className="font-medium">NYSE hours</span>
            <span className="ml-2 text-fg-subtle">
              NYSE 13:30–20:00 UTC · LSE 07:00–15:30 · Tokyo/ASX 00:00–06:00
            </span>
          </label>
        </div>
      </CardBody>
    </Card>
  );
}
