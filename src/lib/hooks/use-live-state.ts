"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpenPositionRow, AccountSnapshotRow } from "@/lib/supabase/types";

export type LiveState = {
  positions: OpenPositionRow[];
  snapshot: AccountSnapshotRow | null;
  loading: boolean;
};

export function useLiveState(): LiveState {
  const [positions, setPositions] = useState<OpenPositionRow[]>([]);
  const [snapshot, setSnapshot] = useState<AccountSnapshotRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) {
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      try {
        const [posRes, snapRes] = await Promise.all([
          supabase
            .from("open_positions")
            .select("*")
            .eq("user_id", userId)
            .order("last_tick_at", { ascending: false }),
          supabase
            .from("ea_account_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("captured_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (!cancelled) {
          setPositions((posRes.data as OpenPositionRow[]) ?? []);
          setSnapshot((snapRes.data as AccountSnapshotRow) ?? null);
        }
      } catch {
        // Tables don't exist yet — graceful empty state.
      }

      if (!cancelled) setLoading(false);

      const channel = supabase
        .channel("live-state")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "open_positions",
            filter: `user_id=eq.${userId}`
          },
          () => {
            supabase
              .from("open_positions")
              .select("*")
              .eq("user_id", userId)
              .order("last_tick_at", { ascending: false })
              .then(({ data }: { data: OpenPositionRow[] | null }) => {
                if (!cancelled) setPositions(data ?? []);
              });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ea_account_snapshots",
            filter: `user_id=eq.${userId}`
          },
          (payload: { new: AccountSnapshotRow }) => {
            if (!cancelled) setSnapshot(payload.new as AccountSnapshotRow);
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    const cleanup = init();
    return () => {
      cancelled = true;
      cleanup.then((fn) => fn?.());
    };
  }, []);

  return { positions, snapshot, loading };
}