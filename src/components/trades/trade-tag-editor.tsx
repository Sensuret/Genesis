"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBrowserUser } from "@/lib/supabase/session-user";
import type { EmotionRow, SetupTagRow, TradeRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Inline setup tag picker — options from Settings → Tags Management.
 */
export function TradeTagSelect({
  trade,
  onUpdated,
  className
}: {
  trade: TradeRow;
  onUpdated?: (patch: Pick<TradeRow, "setup_tag">) => void;
  className?: string;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [value, setValue] = useState(trade.setup_tag ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(trade.setup_tag ?? "");
  }, [trade.id, trade.setup_tag]);

  const loadTags = useCallback(async () => {
    const user = await getBrowserUser();
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase.from("setups").select("name").eq("user_id", user.id).order("name");
    setOptions((data as SetupTagRow[] | null)?.map((r) => r.name) ?? []);
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  async function save(next: string) {
    setSaving(true);
    const supabase = createClient();
    const trimmed = next.trim() || null;
    const { error } = await supabase.from("trades").update({ setup_tag: trimmed }).eq("id", trade.id);
    setSaving(false);
    if (!error) onUpdated?.({ setup_tag: trimmed });
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => {
        setValue(e.target.value);
        void save(e.target.value);
      }}
      className={cn(
        "w-full min-w-[120px] rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs text-fg focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500/30",
        className
      )}
    >
      <option value="">—</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}

/**
 * Inline emotion tag picker — options from Settings → Tags Management (emotions table).
 */
export function TradeEmotionSelect({
  trade,
  onUpdated,
  className
}: {
  trade: TradeRow;
  onUpdated?: (patch: Pick<TradeRow, "emotions">) => void;
  className?: string;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [value, setValue] = useState(trade.emotions?.[0] ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(trade.emotions?.[0] ?? "");
  }, [trade.id, trade.emotions]);

  const loadTags = useCallback(async () => {
    const user = await getBrowserUser();
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase.from("emotions").select("name").eq("user_id", user.id).order("name");
    setOptions((data as EmotionRow[] | null)?.map((r) => r.name) ?? []);
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  async function save(next: string) {
    setSaving(true);
    const supabase = createClient();
    const trimmed = next.trim();
    const emotions = trimmed ? [trimmed] : null;
    const { error } = await supabase.from("trades").update({ emotions }).eq("id", trade.id);
    setSaving(false);
    if (!error) onUpdated?.({ emotions });
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => {
        setValue(e.target.value);
        void save(e.target.value);
      }}
      className={cn(
        "w-full min-w-[120px] rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs text-fg focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500/30",
        className
      )}
    >
      <option value="">—</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}
