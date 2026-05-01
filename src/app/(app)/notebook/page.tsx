"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { NotebookEmbed, UserSettingsData } from "@/lib/supabase/types";

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readSettings(data: unknown): UserSettingsData {
  if (!isJsonObject(data)) return {};
  const out: UserSettingsData = {};
  if (Array.isArray(data.notebook_embeds)) {
    out.notebook_embeds = data.notebook_embeds.filter(
      (x): x is NotebookEmbed =>
        isJsonObject(x) &&
        typeof x.id === "string" &&
        typeof x.label === "string" &&
        typeof x.url === "string"
    );
  }
  if (typeof data.notebook_active_id === "string" || data.notebook_active_id === null) {
    out.notebook_active_id = data.notebook_active_id ?? null;
  }
  if (typeof data.notebook_scratchpad === "string") {
    out.notebook_scratchpad = data.notebook_scratchpad;
  }
  return out;
}

export default function NotebookPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [embeds, setEmbeds] = useState<NotebookEmbed[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scratch, setScratch] = useState("");
  const [scratchDirty, setScratchDirty] = useState(false);
  const [savingScratch, setSavingScratch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adderOpen, setAdderOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data, error: err } = await supabase
        .from("user_settings")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (err && err.code !== "PGRST116") setError(err.message);
      const parsed = readSettings(data?.data);
      setEmbeds(parsed.notebook_embeds ?? []);
      setActiveId(parsed.notebook_active_id ?? parsed.notebook_embeds?.[0]?.id ?? null);
      setScratch(parsed.notebook_scratchpad ?? "");
      setLoading(false);
    })();
  }, []);

  const active = useMemo(
    () => embeds.find((e) => e.id === activeId) ?? embeds[0] ?? null,
    [embeds, activeId]
  );

  async function persist(next: UserSettingsData) {
    if (!userId) return;
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("user_settings")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    const current = readSettings(existing?.data);
    const merged = { ...current, ...next };
    const { error: err } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, data: merged });
    if (err) setError(err.message);
  }

  async function addEmbed() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const e: NotebookEmbed = { id: newId(), label: newLabel.trim(), url };
    const next = [...embeds, e];
    setEmbeds(next);
    setActiveId(e.id);
    setNewLabel("");
    setNewUrl("");
    setAdderOpen(false);
    await persist({ notebook_embeds: next, notebook_active_id: e.id });
  }

  async function removeEmbed(id: string) {
    const next = embeds.filter((e) => e.id !== id);
    setEmbeds(next);
    const nextActive = activeId === id ? (next[0]?.id ?? null) : activeId;
    setActiveId(nextActive);
    await persist({ notebook_embeds: next, notebook_active_id: nextActive });
  }

  async function selectEmbed(id: string) {
    setActiveId(id);
    await persist({ notebook_active_id: id });
  }

  async function saveScratch() {
    setSavingScratch(true);
    await persist({ notebook_scratchpad: scratch });
    setSavingScratch(false);
    setScratchDirty(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notebook"
        description="Embed any Notion / Coda / Google Doc / Docs URL and keep a quick scratchpad for in-session notes."
        actions={
          active ? (
            <a href={active.url} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" /> Open in new tab
              </Button>
            </a>
          ) : null
        }
      />

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Embeds</CardTitle>
          <Button variant="secondary" onClick={() => setAdderOpen((o) => !o)}>
            <Plus className="h-4 w-4" /> Add embed
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {adderOpen && (
            <div className="grid gap-3 rounded-xl border border-line bg-bg-soft/40 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <div>
                <Label>Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="My Trade Journal"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://www.notion.so/your-shared-page"
                />
              </div>
              <Button onClick={addEmbed} disabled={!newLabel.trim() || !newUrl.trim()}>
                Save
              </Button>
            </div>
          )}

          {!loading && embeds.length === 0 && !adderOpen && (
            <Empty
              title="No embeds yet"
              description="Click 'Add embed' and paste any shareable URL (Notion, Coda, Google Doc, etc.). Your embeds and scratchpad live in your account, so they follow you across devices."
            />
          )}

          {embeds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {embeds.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => selectEmbed(e.id)}
                  className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition ${
                    e.id === active?.id
                      ? "border-brand-400 bg-brand-500/10 text-fg"
                      : "border-line bg-bg-elevated text-fg-muted hover:border-brand-400 hover:text-fg"
                  }`}
                >
                  <span className="max-w-[12rem] truncate">{e.label}</span>
                  <span
                    role="button"
                    aria-label={`Remove ${e.label}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeEmbed(e.id);
                    }}
                    className="text-fg-subtle hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {active && (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <iframe
                src={active.url}
                title={active.label}
                className="h-[calc(100vh-360px)] w-full"
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scratchpad</CardTitle>
          <Button
            variant="secondary"
            onClick={saveScratch}
            disabled={!scratchDirty || savingScratch}
          >
            <Save className="h-4 w-4" /> {savingScratch ? "Saving…" : scratchDirty ? "Save" : "Saved"}
          </Button>
        </CardHeader>
        <CardBody>
          <Textarea
            rows={10}
            value={scratch}
            onChange={(e) => {
              setScratch(e.target.value);
              setScratchDirty(true);
            }}
            placeholder="Quick notes, plays for the day, post-session thoughts…"
          />
        </CardBody>
      </Card>
    </div>
  );
}
