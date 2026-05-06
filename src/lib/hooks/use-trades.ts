"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TradeRow, TradeFileRow } from "@/lib/supabase/types";

const PAGE_SIZE = 1000;

// When the realtime channel fires a burst of row-level events (e.g. during a
// manual XLSX import that inserts hundreds of trades in a second), we coalesce
// them into one background refetch instead of one refetch per row. 1s is long
// enough to absorb an entire import burst but short enough that a lone cross-
// tab insert still lands on the screen quickly.
const REALTIME_DEBOUNCE_MS = 1000;

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
 * Cheap equality check for the two payload sets. If neither the count nor the
 * latest updated_at changed, we can skip the setState and avoid re-rendering
 * the 18+ pages that read `useTrades()`. This is what stops the whole app
 * flashing every second during a bulk MT5 XLSX import.
 */
function sameTradeSet(a: TradeRow[], b: TradeRow[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  // Both arrays are PostgREST-sorted by trade_date asc so the positions line
  // up. Compare the max updated_at so arbitrary mid-list edits (notes edit,
  // setup_tag change, etc.) are still detected. O(n) but n is a few thousand
  // at most and this only runs on realtime events, which are debounced above.
  let maxA = "";
  let maxB = "";
  for (let i = 0; i < a.length; i++) {
    if (a[i].updated_at > maxA) maxA = a[i].updated_at;
    if (b[i].updated_at > maxB) maxB = b[i].updated_at;
  }
  return maxA === maxB;
}

/**
 * TradeFileRow has no single `updated_at` timestamp to diff against, and we
 * update individual fields (broker tz override, account metadata, trade
 * counts, last-synced timestamps, balances…) from multiple code paths — so
 * a narrow per-field list would silently drop any future editable column
 * and reintroduce the "stale dropdown reverts" class of bugs. JSON.stringify
 * on a small list (typically < 20 files per user) is cheap and catches every
 * possible mutation, including future schema additions.
 */
function sameFileSet(a: TradeFileRow[], b: TradeFileRow[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  // PostgREST returns files sorted by created_at desc, so positions align.
  return JSON.stringify(a) === JSON.stringify(b);
}

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
  // Refs so the realtime listener closure can compare/skip without causing a
  // re-subscribe whenever the cached data changes.
  const tradesRef = useRef<TradeRow[]>([]);
  const filesRef = useRef<TradeFileRow[]>([]);

  /**
   * Refetch everything. `quiet=true` skips the `loading` / `error` flag flips
   * so background (realtime-triggered) syncs don't make the whole app flash a
   * loading state. Only the first mount should flip `loading`.
   */
  const doRefresh = useCallback(async (quiet: boolean) => {
    const supabase = createClient();
    if (!quiet) setLoading(true);
    try {
      const [allTrades, { data: filesData, error: filesErr }] = await Promise.all([
        fetchAllTrades(),
        supabase.from("trade_files").select("*").order("created_at", { ascending: false })
      ]);
      if (filesErr) throw filesErr;
      const nextFiles = (filesData ?? []) as TradeFileRow[];
      // Only setState if something actually changed — saves a re-render wave
      // through every page reading `useTrades()`.
      if (!sameTradeSet(tradesRef.current, allTrades)) {
        tradesRef.current = allTrades;
        setTrades(allTrades);
      }
      if (!sameFileSet(filesRef.current, nextFiles)) {
        filesRef.current = nextFiles;
        setFiles(nextFiles);
      }
      if (!quiet) setError(null);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Failed to load trades.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => doRefresh(false), [doRefresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live-refresh the cache whenever the user inserts / updates / deletes a
  // trade or imports a new file in another tab (or the upload form on
  // /add-trade). Without this the Imported-files card in Settings, the
  // accounts dropdown filter, and the Trades page would hold a stale copy
  // of `files` until the next manual reload. We only subscribe once we
  // know who the signed-in user is so the filter clause is scoped tightly.
  //
  // IMPORTANT: the callback is debounced so a bulk import that emits 500
  // INSERT events in a burst triggers ONE background refetch, not 500. And
  // the refetch is "quiet" — no `loading=true` flip, so the dashboard
  // doesn't flicker every second while rows are streaming in.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let cleanup: (() => void) | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleQuietRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void doRefresh(true);
      }, REALTIME_DEBOUNCE_MS);
    };

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
            scheduleQuietRefresh();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${userId}` },
          () => {
            scheduleQuietRefresh();
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      cleanup?.();
    };
  }, [doRefresh]);

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
