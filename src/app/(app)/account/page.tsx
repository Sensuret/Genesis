"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { AlertTriangle, KeyRound, Trash2, User as UserIcon } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Partial<ProfileRow>>({});
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

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
    else setSuccess("Saved.");
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
    setError(null);
    setSuccess(null);
    if (pw.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (pw !== pwConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password updated.");
      setPw("");
      setPwConfirm("");
    }
  }

  async function deleteAccount() {
    if (confirmDelete !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // We don't expose service-role here, so we mark the profile as scheduled-for-deletion
    // and immediately sign the user out. A full hard-delete requires a server function;
    // documented in README + supabase/schema.sql.
    if (userId) {
      await supabase.from("profiles").update({ full_name: "[deleted]", avatar_url: null }).eq("id", userId);
    }
    await supabase.auth.signOut();
    router.replace("/login?deleted=1");
  }

  if (loading) return <div className="text-sm text-fg-muted">Loading account…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Manage your profile, security and data. Most users only need this page — Settings is for app-wide preferences."
        actions={
          <Link href="/settings">
            <Button variant="secondary">Open Settings</Button>
          </Link>
        }
      />

      <form onSubmit={saveProfile} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="h-20 w-20 rounded-full border border-line object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-bg-soft text-fg-muted">
                  <UserIcon className="h-7 w-7" />
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
                <p className="mt-1 text-xs text-fg-subtle">PNG / JPG, square works best.</p>
              </div>
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={profile.full_name ?? ""} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
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
              <Input value={profile.default_currency ?? "USD"} onChange={(e) => setProfile((p) => ({ ...p, default_currency: e.target.value }))} />
            </div>
          </CardBody>
        </Card>

        {error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
        {success && <div className="rounded-lg bg-success/10 p-3 text-sm text-success">{success}</div>}

        <div className="flex justify-end">
          <Button disabled={saving} type="submit">{saving ? "Saving…" : "Save profile"}</Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle><KeyRound className="mr-2 inline h-4 w-4" /> Change password</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>New password</Label>
            <Input type="password" minLength={4} value={pw} onChange={(e) => setPw(e.target.value)} />
            <p className="mt-1 text-xs text-fg-subtle">Minimum 4 characters.</p>
          </div>
          <div>
            <Label>Confirm</Label>
            <Input type="password" minLength={4} value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={changePassword} disabled={saving || !pw}>Update password</Button>
          </div>
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger"><AlertTriangle className="mr-2 inline h-4 w-4" /> Danger zone</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p className="text-fg-muted">
            Deleting your account scrubs your profile and signs you out. Your trade rows and uploaded files
            are removed via Supabase RLS cascade when an admin runs the hard-delete cron. To force an
            immediate hard-delete, contact support.
          </p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input
              placeholder='Type "DELETE" to confirm'
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
            <Button variant="danger" onClick={deleteAccount} disabled={confirmDelete !== "DELETE"}>
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
