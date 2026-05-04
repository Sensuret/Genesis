"use client";

import { useEffect, useState } from "react";
import { Clock, KeyRound, LogIn, UserCheck } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type LogEvent = {
  id: string;
  type: "sign_in" | "password_change" | "profile_update" | "account_created";
  description: string;
  timestamp: string;
};

/**
 * Log history — sign-ins, password changes, and account-level events.
 */
export function LogHistorySection() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const user = userData.user;
      const logs: LogEvent[] = [];

      // Account creation
      if (user.created_at) {
        logs.push({
          id: "created",
          type: "account_created",
          description: "Account created",
          timestamp: user.created_at
        });
      }

      // Last sign-in
      if (user.last_sign_in_at) {
        logs.push({
          id: "last-signin",
          type: "sign_in",
          description: `Signed in via ${user.app_metadata?.provider ?? "email"}`,
          timestamp: user.last_sign_in_at
        });
      }

      // Password last updated (from user metadata if available)
      if (user.updated_at && user.updated_at !== user.created_at) {
        logs.push({
          id: "updated",
          type: "profile_update",
          description: "Account or profile updated",
          timestamp: user.updated_at
        });
      }

      // Email confirmation
      if (user.email_confirmed_at) {
        logs.push({
          id: "email-confirmed",
          type: "profile_update",
          description: "Email confirmed",
          timestamp: user.email_confirmed_at
        });
      }

      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(logs);
      setLoading(false);
    })();
  }, []);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const iconMap: Record<LogEvent["type"], React.ReactNode> = {
    sign_in: <LogIn className="h-3.5 w-3.5 text-brand-300" />,
    password_change: <KeyRound className="h-3.5 w-3.5 text-amber-400" />,
    profile_update: <UserCheck className="h-3.5 w-3.5 text-emerald-400" />,
    account_created: <UserCheck className="h-3.5 w-3.5 text-sky-400" />
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-300" />
            Log history
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs text-fg-muted">
            Sign-ins, password changes, and account-level events. A security trail for your records.
          </div>

          {loading ? (
            <div className="text-xs text-fg-subtle">Loading activity…</div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-line bg-bg-soft/40 p-4 text-center text-xs text-fg-muted">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-line rounded-xl border border-line">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-4 py-3 text-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-soft/40">
                    {iconMap[event.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg">{event.description}</div>
                    <div className="mt-0.5 text-[10px] text-fg-subtle">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
