"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useTrades() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [files, setFiles] = useState<TradeFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const [allTrades, { data: files, error: filesErr }] = await Promise.all([
        fetchAllTrades(),
        supabase.from("trade_files").select("*").order("created_at", { ascending: false })
      ]);
      if (filesErr) throw filesErr;
      setTrades(allTrades);
      setFiles(files ?? []);
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

  return { trades, files, loading, error, refresh };
}
