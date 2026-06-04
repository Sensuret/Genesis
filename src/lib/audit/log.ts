import { createClient } from "@/lib/supabase/client";

/**
 * Log a structured event into `public.audit_log` for the signed-in user.
 *
 * Failures are swallowed and logged to the console — auditing must never
 * block the actual user action (importing a file, signing in, etc).
 *
 * The schema migration (PR S) adds the `audit_log` table and the
 * `log_audit_event` SECURITY DEFINER RPC. If the migration hasn't been
 * applied yet, this becomes a no-op on the client.
 */
export async function logAuditEvent(
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("log_audit_event", {
      p_event_type: eventType,
      p_summary: summary,
      p_metadata: metadata
    });
    if (error) {
      // Don't surface to the user — this is best-effort telemetry.
      console.warn("audit_log: rpc failed", error.message);
    }
  } catch (err) {
    console.warn("audit_log: unexpected", err);
  }
}

/**
 * Stable event type taxonomy. Adding new types is fine — these are the
 * ones the existing UI knows how to label nicely. Anything outside this
 * list still renders, just with the raw string.
 */
export const AUDIT_EVENT = {
  SIGN_IN: "auth.sign_in",
  SIGN_OUT: "auth.sign_out",
  PASSWORD_CHANGED: "auth.password_changed",
  PROFILE_UPDATED: "profile.updated",
  GLOBAL_SETTINGS_UPDATED: "settings.global_updated",
  TRADE_FILE_IMPORTED: "trade_file.imported",
  TRADE_FILE_REFRESHED: "trade_file.refreshed",
  TRADE_FILE_DELETED: "trade_file.deleted",
  TRADE_FILE_TZ_UPDATED: "trade_file.timezone_updated",
  API_KEY_CREATED: "api_key.created",
  API_KEY_REVOKED: "api_key.revoked",
  API_KEY_DELETED: "api_key.deleted"
} as const;

export type AuditEventType = (typeof AUDIT_EVENT)[keyof typeof AUDIT_EVENT];
