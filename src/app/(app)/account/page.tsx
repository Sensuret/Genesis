"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { AlertTriangle, Settings as SettingsIcon, User } from "lucide-react";

/**
 * /account — personal-info hub. Distinct from /settings (which holds app-wide
 * preferences). Lets the user edit profile, change password, and permanently
 * delete the account.
 */
export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Partial<ProfileRow>>({});
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

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
    const { error: upErr } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      dob: profile.dob ?? null,
      default_currency: profile.default_currency ?? "USD",
      starting_balance: profile.starting_balance ?? 0
    });
    setSaving(false);
    if (upErr) setError(upErr.message);
    else setSuccess("Account details saved.");
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
    if (!newPassword || newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (pwErr) setError(pwErr.message);
    else {
      setSuccess("Password changed.");
      setNewPassword("");
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setError('Type DELETE in the confirmation box to permanently remove your account.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to delete account.");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-fg-muted">Loading account…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Personal details, security, and account-level controls."
        actions={
          <Link href="/settings">
            <Button variant="secondary">
              <SettingsIcon className="h-4 w-4" /> Open Settings
            </Button>
          </Link>
        }
      />

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
      {success && <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">{success}</div>}

      <form onSubmit={saveProfile}>
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-16 w-16 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                  <User className="h-6 w-6" />
                </div>
              )}
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
            <div>
              <Label>Full name</Label>
              <Input
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={profile.dob ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, dob: e.target.value }))}
              />
            </div>
            <div>
              <Label>Default currency</Label>
              <Input
                value={profile.default_currency ?? "USD"}
                onChange={(e) => setProfile((p) => ({ ...p, default_currency: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save details"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label>New password (min 4 characters)</Label>
            <Input
              type="password"
              minLength={4}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button onClick={changePassword} disabled={saving || newPassword.length < 4}>
            Change password
          </Button>
        </CardBody>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-4 w-4" /> Delete account
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-muted">
            Permanently erase your account, profile, all uploaded trade files, every trade row, numerology
            data and notebook embeds. This action <span className="font-semibold text-fg">cannot be undone</span>.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label>Type DELETE to confirm</Label>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            </div>
            <Button variant="danger" onClick={deleteAccount} disabled={saving || deleteConfirm !== "DELETE"}>
              Delete my account
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
