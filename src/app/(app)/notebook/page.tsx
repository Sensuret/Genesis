"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Plus, Save, StickyNote, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { ResolutionsTab } from "@/components/notebook/resolutions-tab";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  NotebookEmbed,
  NotebookNote,
  Resolution,
  UserSettingsData
} from "@/lib/supabase/types";

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
  if (Array.isArray(data.notebook_notes)) {
    out.notebook_notes = data.notebook_notes.filter(
      (x): x is NotebookNote =>
        isJsonObject(x) &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        typeof x.body === "string" &&
        typeof x.created_at === "string"
    );
  }
  if (Array.isArray(data.notebook_resolutions)) {
    out.notebook_resolutions = data.notebook_resolutions.filter(
      (x): x is Resolution =>
        isJsonObject(x) &&
        typeof x.id === "string" &&
        typeof x.year === "number" &&
        typeof x.created_at === "string" &&
        Array.isArray((x as Record<string, unknown>).sections)
    );
  }
  return out;
}

type TopTab = "general" | "resolutions";

export default function NotebookPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [embeds, setEmbeds] = useState<NotebookEmbed[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scratch, setScratch] = useState("");
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [savingScratch, setSavingScratch] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [openNote, setOpenNote] = useState<NotebookNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adderOpen, setAdderOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [tab, setTab] = useState<TopTab>("general");

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
      setNotes(parsed.notebook_notes ?? []);
      setResolutions(parsed.notebook_resolutions ?? []);
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

  function openSavePrompt() {
    if (!scratch.trim()) return;
    setPendingName(`Note · ${new Date().toLocaleDateString()}`);
    setNamePromptOpen(true);
  }

  async function confirmSaveNote() {
    const name = pendingName.trim();
    if (!name || !scratch.trim()) return;
    setSavingScratch(true);
    const note: NotebookNote = {
      id: newId(),
      name,
      body: scratch,
      created_at: new Date().toISOString()
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    setScratch("");
    setNamePromptOpen(false);
    setPendingName("");
    await persist({ notebook_notes: nextNotes, notebook_scratchpad: "" });
    setSavingScratch(false);
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    const nextNotes = notes.filter((n) => n.id !== id);
    setNotes(nextNotes);
    if (openNote?.id === id) setOpenNote(null);
    await persist({ notebook_notes: nextNotes });
  }

  async function persistResolutions(next: Resolution[]) {
    setResolutions(next);
    await persist({ notebook_resolutions: next });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notebook"
        description={
          tab === "general"
            ? "Embed any Notion / Coda / Google Doc URL, jot quick scratchpad notes, and save them to your personal Notes library."
            : "Define yearly resolutions in the Genesis template — section headers, sub-sections and bullets render as a printable card with the year's Chinese-zodiac figure."
        }
        actions={
          tab === "general" && active ? (
            <a href={active.url} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" /> Open in new tab
              </Button>
            </a>
          ) : null
        }
      />

      <div className="rounded-xl border border-line bg-bg-soft p-1 inline-flex">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            tab === "general"
              ? "bg-bg-elevated text-fg shadow-sm"
              : "text-fg-muted hover:text-fg"
          )}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setTab("resolutions")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            tab === "resolutions"
              ? "bg-bg-elevated text-fg shadow-sm"
              : "text-fg-muted hover:text-fg"
          )}
        >
          Resolutions
          {resolutions.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-200">
              {resolutions.length}
            </span>
          )}
        </button>
      </div>

      {tab === "resolutions" && (
        <ResolutionsTab resolutions={resolutions} onChange={persistResolutions} />
      )}

      {tab === "general" && (
        <>
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
              description="Click 'Add embed' and paste any shareable URL (Notion, Coda, Google Doc, etc.). Your embeds, scratchpad and notes live in your account, so they follow you across devices."
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
            onClick={openSavePrompt}
            disabled={!scratch.trim() || savingScratch}
          >
            <Save className="h-4 w-4" /> {savingScratch ? "Saving…" : "Save as note"}
          </Button>
        </CardHeader>
        <CardBody>
          <Textarea
            rows={10}
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder="Quick notes, plays for the day, post-session thoughts…  Click 'Save as note' and give it a name to file it in your Notes below."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notes</CardTitle>
          <span className="text-xs text-fg-subtle">
            {notes.length} saved {notes.length === 1 ? "note" : "notes"}
          </span>
        </CardHeader>
        <CardBody>
          {notes.length === 0 ? (
            <div className="text-sm text-fg-muted">
              Notes you save from the scratchpad will appear here. Click any to open it
              full-screen.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="group flex flex-col rounded-xl border border-line bg-bg-soft/40 p-3 transition hover:border-brand-400 hover:bg-bg-soft/70"
                >
                  <button
                    type="button"
                    onClick={() => setOpenNote(n)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <div className="flex w-full items-center gap-2">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                      <span className="truncate text-sm font-medium text-fg">{n.name}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-fg-muted">
                      {n.body || <em className="text-fg-subtle">empty</em>}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-fg-subtle">
                    <span>{formatNoteTimestamp(n.created_at)}</span>
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {namePromptOpen && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !savingScratch && setNamePromptOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Name this note</h3>
              <button
                type="button"
                onClick={() => !savingScratch && setNamePromptOpen(false)}
                className="text-fg-subtle hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Label>Note name</Label>
            <Input
              autoFocus
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSaveNote();
              }}
              placeholder="e.g. Pre-NFP plan"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setNamePromptOpen(false)}
                disabled={savingScratch}
              >
                Cancel
              </Button>
              <Button onClick={confirmSaveNote} disabled={!pendingName.trim() || savingScratch}>
                {savingScratch ? "Saving…" : "Save note"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {openNote && (
        <NoteModal
          note={openNote}
          onClose={() => setOpenNote(null)}
          onDelete={() => deleteNote(openNote.id)}
        />
      )}
        </>
      )}
    </div>
  );
}

function NoteModal({
  note,
  onClose,
  onDelete
}: {
  note: NotebookNote;
  onClose: () => void;
  onDelete: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const safeName = note.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "note";
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-bg-elevated p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{note.name}</h3>
            <div className="mt-0.5 text-[11px] text-fg-subtle">
              Saved {formatNoteTimestamp(note.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-2" data-screenshot-ignore="true">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-fg-muted hover:border-danger hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <ScreenshotButton
              targetRef={captureRef}
              filename={`note-${safeName}`}
              label="Save note as PNG"
            />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:border-danger hover:text-danger"
              aria-label="Close note"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          ref={captureRef}
          className="overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg-soft/40 p-4 text-sm text-fg"
        >
          <div className="mb-3 border-b border-line pb-2 text-xs text-fg-muted">
            <div className="font-semibold text-fg">{note.name}</div>
            <div className="text-[11px] text-fg-subtle">
              {formatNoteTimestamp(note.created_at)}
            </div>
          </div>
          {note.body || <em className="text-fg-subtle">This note is empty.</em>}
        </div>
      </div>
    </div>
  );
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
