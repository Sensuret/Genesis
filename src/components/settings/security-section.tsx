"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/**
 * Security subsection — change password + (later) recovery options. Pulls
 * its own auth client; doesn't need any shared profile state.
 */
export function SecuritySection() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          <CardTitle>Sessions & sign-in</CardTitle>
        </CardHeader>
        <CardBody className="text-xs text-fg-muted">
          More options (active sessions, two-factor authentication, recovery codes, sign-out
          everywhere) are on the way. For now, password changes above invalidate other sessions
          automatically.
        </CardBody>
      </Card>
    </div>
  );
}
