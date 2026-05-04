"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TradeRow, TradeFileRow } from "@/lib/supabase/types";

const PAGE_SIZE = 1000;

/**
 * Fetch every trade for the signed-in user. Supabase / PostgREST caps a single
 * `.select("*")` at 1000 rows by default — this paginates with `.range()` so
 * users with thousands of imported trades don't see a silent truncation on
 * the dashboard.
 */
async function fetchAllTrades() {
  const supabase = createClient();
  const out: TradeRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("trade_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as TradeRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

type TradesContextValue = {
  trades: TradeRow[];
  files: TradeFileRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const TradesContext = createContext<TradesContextValue | null>(null);

/**
 * Session-level trades cache. Mounted once in the (app) layout so trades + the
 * file list are fetched a single time per signed-in session and reused across
 * page navigations — eliminates the multi-second reload that used to happen
 * on every route change.
 */
export function TradesProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [files, setFiles] = useState<TradeFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const [allTrades, { data: filesData, error: filesErr }] = await Promise.all([
        fetchAllTrades(),
        supabase.from("trade_files").select("*").order("created_at", { ascending: false })
      ]);
      if (filesErr) throw filesErr;
      setTrades(allTrades);
      setFiles((filesData ?? []) as TradeFileRow[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live-refresh the cache whenever the user inserts / updates / deletes a
  // trade or imports a new file in another tab (or the upload form on
  // /add-trade). Without this the Imported-files card in Settings, the
  // accounts dropdown filter, and the Trades page would hold a stale copy
  // of `files` until the next manual reload. We only subscribe once we
  // know who the signed-in user is so the filter clause is scoped tightly.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let cleanup: (() => void) | null = null;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled || !userData.user) return;
      const userId = userData.user.id;
      const channel = supabase
        .channel(`trades-cache-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trade_files", filter: `user_id=eq.${userId}` },
          () => {
            refresh();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${userId}` },
          () => {
            refresh();
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [refresh]);

  const value = useMemo<TradesContextValue>(
    () => ({ trades, files, loading, error, refresh }),
    [trades, files, loading, error, refresh]
  );

  return createElement(TradesContext.Provider, { value }, children);
}

/**
 * Read the session-cached trades + files. The `(app)` layout mounts a
 * `<TradesProvider>` once per signed-in session, so every page using this
 * hook reads the same in-memory copy — no Supabase round trip on each route
 * change.
 */
export function useTrades(): TradesContextValue {
  const ctx = useContext(TradesContext);
  if (!ctx) {
    throw new Error("useTrades() must be used inside a <TradesProvider>");
  }
  return ctx;
}
