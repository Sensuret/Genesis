"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TradeRow, TradeFileRow } from "@/lib/supabase/types";

export function useTrades() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [files, setFiles] = useState<TradeFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const [{ data: trades, error: tradesErr }, { data: files, error: filesErr }] = await Promise.all([
      supabase.from("trades").select("*").order("trade_date", { ascending: true }),
      supabase.from("trade_files").select("*").order("created_at", { ascending: false })
    ]);
    if (tradesErr) setError(tradesErr.message);
    else if (filesErr) setError(filesErr.message);
    else {
      setTrades(trades ?? []);
      setFiles(files ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trades, files, loading, error, refresh };
}
