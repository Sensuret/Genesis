"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { EmotionRow, SetupTagRow } from "@/lib/supabase/types";

/**
 * Setup and emotion catalogs for trade tagging and dashboard/report breakdowns.
 */
export function TagsManagementSection() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [setups, setSetups] = useState<SetupTagRow[]>([]);
  const [emotions, setEmotions] = useState<EmotionRow[]>([]);
  const [newSetup, setNewSetup] = useState("");
  const [newEmotion, setNewEmotion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    setUserId(user.id);
    const [setupRes, emotionRes] = await Promise.all([
      supabase.from("setups").select("*").eq("user_id", user.id).order("name"),
      supabase.from("emotions").select("*").eq("user_id", user.id).order("name")
    ]);
    if (setupRes.error) setError(setupRes.error.message);
    else setSetups(setupRes.data ?? []);
    if (emotionRes.error) setError(emotionRes.error.message);
    else setEmotions(emotionRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSetup() {
    const name = newSetup.trim();
    if (!name || !userId) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("setups").insert({ user_id: userId, name });
    if (err) {
      setError(err.message);
      return;
    }
    setNewSetup("");
    await load();
  }

  async function addEmotion() {
    const name = newEmotion.trim();
    if (!name || !userId) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("emotions").insert({ user_id: userId, name });
    if (err) {
      setError(err.message);
      return;
    }
    setNewEmotion("");
    await load();
  }

  async function removeSetup(id: string) {
    const supabase = createClient();
    await supabase.from("setups").delete().eq("id", id);
    await load();
  }

  async function removeEmotion(id: string) {
    const supabase = createClient();
    await supabase.from("emotions").delete().eq("id", id);
    await load();
  }

  if (loading) {
    return <p className="text-sm text-fg-muted">Loading tags…</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Create setup and emotion tags here. Use them on the Trades page and Day View so Reports can
        break down performance by setup and emotion.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <TagListCard
        title="Setup tags"
        description="Strategy or playbook name for a trade (e.g. London breakout, NY continuation)."
        items={setups.map((s) => ({ id: s.id, name: s.name }))}
        value={newSetup}
        onChange={setNewSetup}
        onAdd={addSetup}
        onRemove={removeSetup}
        placeholder="Add setup tag"
      />

      <TagListCard
        title="Emotion tags"
        description="How you felt during the trade (e.g. calm, FOMO, revenge)."
        items={emotions.map((m) => ({ id: m.id, name: m.name }))}
        value={newEmotion}
        onChange={setNewEmotion}
        onAdd={addEmotion}
        onRemove={removeEmotion}
        placeholder="Add emotion tag"
      />
    </div>
  );
}

function TagListCard({
  title,
  description,
  items,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder
}: {
  title: string;
  description: string;
  items: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-fg-muted">{description}</p>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 ? (
            <span className="text-xs text-fg-subtle">No tags yet.</span>
          ) : (
            items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-soft px-2.5 py-1 text-xs text-fg"
              >
                {item.name}
                <button
                  type="button"
                  className="text-fg-subtle hover:text-danger"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Label className="sr-only">{placeholder}</Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
            />
          </div>
          <Button type="button" size="sm" onClick={onAdd} disabled={!value.trim()}>
            Add
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
