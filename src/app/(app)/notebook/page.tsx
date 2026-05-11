"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Pencil, Plus, Save, StickyNote, Trash2, X } from "lucide-react";
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
  NotebookEmbedFormat,
  NotebookNote,
  Resolution,
  UserSettingsData
} from "@/lib/supabase/types";

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Many sites (YouTube watch pages, Vimeo, Loom, Twitter, Notion public pages,
 * Pinterest pins) refuse to load inside an iframe by default — they set
 * X-Frame-Options or a Content-Security-Policy that the browser silently
 * blocks. So a raw "paste the URL into an iframe" approach renders blank.
 *
 * This helper rewrites known providers to their embeddable URL form so the
 * embed actually shows. For unknown providers we fall back to the original
 * URL and rely on the host allowing iframe embedding.
 */
type EmbedKind = "iframe" | "image" | "blocked";

function resolveEmbed(rawUrl: string): { kind: EmbedKind; src: string; provider: string } {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { kind: "blocked", src: rawUrl, provider: "unknown" };
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube — accept watch?v=, youtu.be/, shorts/, embed/, playlist?list=
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? null;
    const list = u.searchParams.get("list");
    if (list && !id) {
      return { kind: "iframe", src: `https://www.youtube.com/embed/videoseries?list=${list}`, provider: "youtube" };
    }
    if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}`, provider: "youtube" };
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{4,})/)?.[1];
    if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, provider: "vimeo" };
  }

  // Loom
  if (host === "loom.com" || host === "www.loom.com") {
    const m = u.pathname.match(/\/share\/([a-z0-9]+)/i);
    if (m) return { kind: "iframe", src: `https://www.loom.com/embed/${m[1]}`, provider: "loom" };
  }

  // Twitter / X — render via the Twitter embed iframe
  if (host === "twitter.com" || host === "x.com") {
    const m = u.pathname.match(/\/status\/(\d+)/);
    if (m) {
      return {
        kind: "iframe",
        src: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&theme=dark`,
        provider: "twitter"
      };
    }
  }

  // TradingView — full URL matrix:
  //   1. /x/<id>/ snapshots and existing /embed-widget/ URLs allow
  //      iframe directly.
  //   2. /chart/?symbol=NASDAQ%3AAAPL  → rebuild as a widget embed.
  //   3. /chart/<id>/?symbol=…         → same as #2.
  //   4. /symbols/NASDAQ-AAPL/         → derive exchange:symbol and
  //                                       rebuild as a widget embed.
  // Anything else (ideas pages, profile pages, screener) falls through
  // to "blocked" so the helpful CTA explains the share-menu workaround.
  if (host === "tradingview.com" || host.endsWith(".tradingview.com")) {
    if (/^\/x\/[a-zA-Z0-9]+/.test(u.pathname)) {
      return { kind: "iframe", src: u.toString(), provider: "tradingview" };
    }
    if (host.startsWith("s.") || u.pathname.startsWith("/embed-widget/")) {
      return { kind: "iframe", src: u.toString(), provider: "tradingview" };
    }
    // Try to derive a symbol so we can render the official chart widget
    // (which DOES allow iframing — `s.tradingview.com/widgetembed/`).
    let symbol: string | null = u.searchParams.get("symbol");
    if (!symbol) {
      // /symbols/NASDAQ-AAPL/ → NASDAQ:AAPL
      const m = u.pathname.match(/^\/symbols\/([A-Za-z0-9]+)-([A-Za-z0-9._-]+)/);
      if (m) symbol = `${m[1]}:${m[2]}`;
    }
    if (symbol) {
      const params = new URLSearchParams({
        symbol,
        interval: u.searchParams.get("interval") ?? "D",
        theme: "dark",
        style: "1",
        timezone: "Etc/UTC",
        withdateranges: "1",
        hide_side_toolbar: "0",
        allow_symbol_change: "1",
        save_image: "1",
        details: "1"
      });
      return {
        kind: "iframe",
        src: `https://s.tradingview.com/widgetembed/?${params.toString()}`,
        provider: "tradingview"
      };
    }
    return { kind: "blocked", src: u.toString(), provider: "tradingview" };
  }

  // Direct image links (Pinterest pins resolve to a page that *contains* an
  // image; we can only inline the page itself which Pinterest blocks. So if
  // the URL ends with an image extension, render as <img>.)
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(u.pathname)) {
    return { kind: "image", src: u.toString(), provider: "image" };
  }

  // Notion has two URL families:
  //  - notion.so/<workspace>/<page-id>: the private workspace URL.
  //    These are the ones that absolutely refuse iframe — the
  //    fallback CTA explains how to publish-to-web instead.
  //  - <workspace>.notion.site/<slug>: the publish-to-web URL.
  //    Notion's CDN sets X-Frame-Options: SAMEORIGIN on the bare
  //    page, but a `?embed=true` query produces a stripped-down
  //    page without the same restriction so iframe works. We always
  //    append it so users can paste their public URL straight in.
  if (host.endsWith("notion.so")) {
    return { kind: "blocked", src: u.toString(), provider: "notion" };
  }
  if (host.endsWith("notion.site")) {
    if (!u.searchParams.has("embed")) u.searchParams.set("embed", "true");
    return { kind: "iframe", src: u.toString(), provider: "notion" };
  }

  // Pinterest pin pages also refuse iframe.
  if (host.endsWith("pinterest.com") || host.endsWith("pin.it")) {
    return { kind: "blocked", src: u.toString(), provider: "pinterest" };
  }

  // Default: try iframing the URL as-is. If the host allows it, it'll
  // render; if not, the iframe stays blank and the user can use the
  // "Open in new tab" button we always show next to the embed bar.
  return { kind: "iframe", src: u.toString(), provider: host };
}

/**
 * Pull the most embed-worthy URL out of an HTML or JSX snippet. Tries,
 * in order:
 *
 *  1. `<iframe src="...">` — the canonical embed shape.
 *  2. A TradingView `new TradingView.widget({ symbol: "...", ...})`
 *     config block — extract `symbol` and build the widget URL. This
 *     runs *before* the generic `src=` fallback because TradingView's
 *     copy-paste HTML embed is a `<div>` + `<script src="tv.js">` +
 *     `new TradingView.widget({...})` block — if we matched the script
 *     `src=` first we'd resolve to `tv.js` instead of a real widget URL.
 *  3. JSX-style `src={"..."}` or `src='...'` / `src="..."` — when the
 *     user pasted React code with an iframe-like element. We filter out
 *     loader assets (`.js`, `.css`, `.mjs`, `.json`, `.map`) since those
 *     never embed standalone.
 *  4. Any bare http(s) URL in the snippet.
 *
 * Returns null if nothing usable is found, in which case the caller
 * falls back to sandboxed `srcdoc` rendering for the full snippet.
 */
function extractUrlFromSnippet(snippet: string): string | null {
  if (!snippet) return null;
  const trimmed = snippet.trim();

  // 1. <iframe src="..."> — strongest signal.
  const ifr = trimmed.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (ifr && ifr[1]) return ifr[1];

  // 2. TradingView widget config (must run before generic src= so a
  //    pasted div+script+widget block doesn't resolve to tv.js).
  const tvSymbol = trimmed.match(/["']symbol["']\s*:\s*["']([A-Z0-9._:-]+)["']/i)
    ?? trimmed.match(/\bsymbol\s*=\s*["']([A-Z0-9._:-]+)["']/i);
  if (tvSymbol && tvSymbol[1]) {
    const interval = trimmed.match(/["']?interval["']?\s*[:=]\s*["']([A-Za-z0-9]+)["']/i)?.[1] ?? "D";
    const params = new URLSearchParams({
      symbol: tvSymbol[1],
      interval,
      theme: "dark",
      style: "1",
      timezone: "Etc/UTC",
      withdateranges: "1",
      hide_side_toolbar: "0",
      allow_symbol_change: "1",
      save_image: "1",
      details: "1"
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }

  // Helper: skip loader / asset URLs that can never be a standalone
  // embed target (TradingView's tv.js, Twitter's widgets.js, etc.).
  const isLoaderAsset = (url: string) =>
    /\.(?:js|mjs|css|json|map)(?:\?.*)?$/i.test(url);

  // 3. JSX `src=` — but skip <script>/<link>/<img> tags. We do this
  //    by scanning all `src=` matches and rejecting any whose preceding
  //    tag is a loader tag, or whose URL ends in a loader extension.
  const srcRe = /<(\w+)[^>]*?\bsrc\s*=\s*\{?\s*["']([^"']+)["']\s*\}?/gi;
  let m: RegExpExecArray | null;
  while ((m = srcRe.exec(trimmed)) !== null) {
    const tagName = m[1].toLowerCase();
    const url = m[2];
    if (tagName === "script" || tagName === "link" || tagName === "img") continue;
    if (isLoaderAsset(url)) continue;
    return url;
  }
  // Also try a tag-less JSX `src=` form (e.g. `src={"…"}` on the next
  // line of a multi-line JSX element), filtered the same way.
  const bareSrcRe = /\bsrc\s*=\s*\{?\s*["']([^"']+)["']\s*\}?/gi;
  while ((m = bareSrcRe.exec(trimmed)) !== null) {
    const url = m[1];
    if (isLoaderAsset(url)) continue;
    return url;
  }

  // 4. First bare URL found in the snippet — filtered to skip loaders.
  const urlRe = /https?:\/\/[^\s"'<>)]+/gi;
  while ((m = urlRe.exec(trimmed)) !== null) {
    const url = m[0];
    if (isLoaderAsset(url)) continue;
    return url;
  }

  return null;
}

/**
 * Strip JSX-specific bits so a React snippet becomes valid HTML the
 * browser can render inside an iframe `srcdoc`. We do not try to be a
 * full JSX→HTML compiler — that would need a parser. We just handle
 * the simplest common cases:
 *
 *  - `className=` → `class=`
 *  - `htmlFor=`   → `for=`
 *  - boolean / numeric JSX expressions: `{true}` → ``, `{42}` → `42`
 *  - self-closing void elements stay self-closing (HTML tolerates this)
 *
 * For anything more elaborate (state, JSX fragments, function calls)
 * we fall back to the snippet's verbatim text — the iframe will show
 * the literal JSX. The user can switch to URL mode and paste the iframe
 * src directly, which is what extractUrlFromSnippet preferred anyway.
 */
function jsxToHtmlIsh(snippet: string): string {
  return snippet
    .replace(/\bclassName=/g, "class=")
    .replace(/\bhtmlFor=/g, "for=")
    .replace(/=\{["']([^"']+)["']\}/g, '="$1"')
    .replace(/=\{(\d+(?:\.\d+)?)\}/g, '="$1"')
    // Boolean JSX attribute expressions. `{true}` collapses to a bare
    // HTML boolean attribute (`allowFullScreen={true}` → `allowFullScreen`).
    // `{false}` becomes `=""` so it stays present but harmless — the
    // browser ignores the value on boolean attributes either way.
    .replace(/=\{true\}/gi, "")
    .replace(/=\{false\}/gi, '=""');
}

/**
 * Format-aware entry point used by the renderer. Returns either the
 * existing `{ kind, src, provider }` shape (which routes through the
 * standard iframe / image / blocked renderer) or a new "srcdoc" kind
 * that asks the renderer to drop the HTML into a sandboxed iframe so
 * full embed-code blocks (TradingView's div+script HTML, e.g.) render
 * end-to-end without us having to interpret their JavaScript.
 */
type ResolvedFormat =
  | { kind: EmbedKind; src: string; provider: string }
  | { kind: "srcdoc"; html: string; provider: string };

function resolveByFormat(
  format: NotebookEmbedFormat,
  primary: string,
  content?: string
): ResolvedFormat {
  if (format === "url") return resolveEmbed(primary);

  const snippet = (content ?? primary ?? "").trim();
  if (!snippet) return { kind: "blocked", src: snippet, provider: format };

  // Prefer the cleanest extractable URL — it lets us keep all our
  // provider-specific embed treatments (YouTube → /embed/, Notion →
  // ?embed=true, TradingView → widget URL, etc.) regardless of input
  // format. Only fall back to srcdoc rendering when we genuinely
  // can't extract a URL.
  const extracted = extractUrlFromSnippet(snippet);
  if (extracted) {
    return resolveEmbed(extracted);
  }

  // Couldn't extract a URL — render the snippet inside a sandboxed
  // iframe so full embed scripts (TradingView div+script blocks,
  // arbitrary widgets, etc.) execute in isolation from our app.
  const html = format === "react" ? jsxToHtmlIsh(snippet) : snippet;
  return { kind: "srcdoc", html, provider: format };
}

function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readSettings(data: unknown): UserSettingsData {
  if (!isJsonObject(data)) return {};
  const out: UserSettingsData = {};
  if (Array.isArray(data.notebook_embeds)) {
    out.notebook_embeds = data.notebook_embeds
      .filter(
        (x): x is Record<string, unknown> =>
          isJsonObject(x) &&
          typeof x.id === "string" &&
          typeof x.label === "string" &&
          typeof x.url === "string"
      )
      .map((x): NotebookEmbed => {
        const base: NotebookEmbed = {
          id: x.id as string,
          label: x.label as string,
          url: x.url as string
        };
        const fmt = x.format;
        if (fmt === "url" || fmt === "html" || fmt === "react") base.format = fmt;
        if (typeof x.content === "string") base.content = x.content;
        return base;
      });
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

const MAX_EMBEDS = 5;

type DraftEmbed = {
  id: string;
  label: string;
  /** Body the user is typing. Its meaning depends on `format`: a URL
   *  for "url", a snippet for "html" / "react". */
  body: string;
  format: NotebookEmbedFormat;
};

function blankDraft(): DraftEmbed {
  return { id: newId(), label: "", body: "", format: "url" };
}

const FORMAT_TABS: ReadonlyArray<{ value: NotebookEmbedFormat; short: string }> = [
  { value: "url", short: "URL" },
  { value: "html", short: "HTML" },
  { value: "react", short: "React" }
];

const FORMAT_PLACEHOLDER: Record<NotebookEmbedFormat, string> = {
  url: "YouTube / Vimeo / Loom / Notion / TradingView /x/ snapshot / direct image",
  html: 'Paste embed-code HTML — e.g. <iframe src="…"></iframe> or TradingView\'s Embed widget block',
  react: 'Paste JSX — e.g. <iframe src="…" /> or <TradingViewWidget symbol="NASDAQ:AAPL" />'
};

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
  const [drafts, setDrafts] = useState<DraftEmbed[]>(() => [blankDraft()]);
  const [tab, setTab] = useState<TopTab>("general");
  // Profile full_name used as the default owner-name on new resolutions.
  const [profileName, setProfileName] = useState<string>("");

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
      const [{ data, error: err }, { data: profile }] = await Promise.all([
        supabase
          .from("user_settings")
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      ]);
      if (err && err.code !== "PGRST116") setError(err.message);
      const parsed = readSettings(data?.data);
      setEmbeds(parsed.notebook_embeds ?? []);
      setActiveId(parsed.notebook_active_id ?? parsed.notebook_embeds?.[0]?.id ?? null);
      setScratch(parsed.notebook_scratchpad ?? "");
      setNotes(parsed.notebook_notes ?? []);
      setResolutions(parsed.notebook_resolutions ?? []);
      setProfileName(profile?.full_name?.trim() ?? user.email?.split("@")[0] ?? "");
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

  function updateDraft(id: string, patch: Partial<DraftEmbed>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function addDraftRow() {
    setDrafts((prev) =>
      prev.length + embeds.length >= MAX_EMBEDS ? prev : [...prev, blankDraft()]
    );
  }

  function removeDraftRow(id: string) {
    setDrafts((prev) => (prev.length === 1 ? [blankDraft()] : prev.filter((d) => d.id !== id)));
  }

  async function saveDrafts() {
    const valid = drafts
      .map((d) => ({
        id: d.id,
        label: d.label.trim(),
        body: d.body.trim(),
        format: d.format
      }))
      .filter((d) => d.label && d.body);
    if (!valid.length) return;
    const remaining = MAX_EMBEDS - embeds.length;
    const accepted = valid.slice(0, Math.max(0, remaining));
    if (!accepted.length) return;
    const newEntries: NotebookEmbed[] = accepted.map((d) => {
      if (d.format === "url") {
        let url = d.body;
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        return { id: newId(), label: d.label, url, format: "url" };
      }
      // html / react: keep the raw snippet in `content`; also stash an
      // extracted URL (if any) on `url` so the "Open in new tab" link
      // still has something useful to open.
      const fallbackUrl = extractUrlFromSnippet(d.body) ?? "";
      return {
        id: newId(),
        label: d.label,
        url: fallbackUrl,
        format: d.format,
        content: d.body
      };
    });
    const next = [...embeds, ...newEntries];
    setEmbeds(next);
    const newActive = newEntries[0]!.id;
    setActiveId(newActive);
    setDrafts([blankDraft()]);
    setAdderOpen(false);
    await persist({ notebook_embeds: next, notebook_active_id: newActive });
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
    const nextNotes = notes.filter((n) => n.id !== id);
    setNotes(nextNotes);
    if (openNote?.id === id) setOpenNote(null);
    await persist({ notebook_notes: nextNotes });
  }

  // Replace a note in-place (id-matched) and persist. Used by the
  // NoteModal's pencil-edit flow.
  async function updateNote(next: NotebookNote) {
    const nextNotes = notes.map((n) => (n.id === next.id ? next : n));
    setNotes(nextNotes);
    if (openNote?.id === next.id) setOpenNote(next);
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
          tab === "general" && active
            ? (() => {
                const href =
                  active.url ||
                  (active.content ? extractUrlFromSnippet(active.content) : null);
                return href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    <Button variant="secondary">
                      <ExternalLink className="h-4 w-4" /> Open in new tab
                    </Button>
                  </a>
                ) : null;
              })()
            : null
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
        <ResolutionsTab
          resolutions={resolutions}
          onChange={persistResolutions}
          defaultOwnerName={profileName}
        />
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
          <CardTitle>
            Embeds
            <span className="ml-2 text-[11px] font-normal text-fg-subtle">
              {embeds.length}/{MAX_EMBEDS}
            </span>
          </CardTitle>
          <Button
            variant="secondary"
            onClick={() => setAdderOpen((o) => !o)}
            disabled={embeds.length >= MAX_EMBEDS}
          >
            <Plus className="h-4 w-4" /> Add embed
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {adderOpen && (
            <div className="space-y-3 rounded-xl border border-line bg-bg-soft/40 p-4">
              {drafts.map((draft, idx) => {
                const total = embeds.length + idx;
                const remaining = MAX_EMBEDS - total;
                if (remaining <= 0) return null;
                return (
                  <div
                    key={draft.id}
                    className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
                  >
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={draft.label}
                        onChange={(e) => updateDraft(draft.id, { label: e.target.value })}
                        placeholder="My Trade Journal"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>
                          {draft.format === "url"
                            ? "URL"
                            : draft.format === "html"
                              ? "HTML"
                              : "React"}
                        </Label>
                        {/* Format switcher pills, same row as the label so
                          * the input space stays constant — only the
                          * placeholder + parser swap. */}
                        <div
                          role="tablist"
                          aria-label="Embed format"
                          className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-bg p-0.5 text-[10.5px]"
                        >
                          {FORMAT_TABS.map((tab) => (
                            <button
                              key={tab.value}
                              type="button"
                              role="tab"
                              aria-selected={draft.format === tab.value}
                              onClick={() => updateDraft(draft.id, { format: tab.value })}
                              className={cn(
                                "rounded-md px-2 py-0.5 font-medium transition",
                                draft.format === tab.value
                                  ? "bg-brand-500/20 text-brand-200"
                                  : "text-fg-subtle hover:text-fg"
                              )}
                            >
                              {tab.short}
                            </button>
                          ))}
                        </div>
                      </div>
                      {draft.format === "url" ? (
                        <Input
                          value={draft.body}
                          onChange={(e) => updateDraft(draft.id, { body: e.target.value })}
                          placeholder={FORMAT_PLACEHOLDER[draft.format]}
                        />
                      ) : (
                        <Textarea
                          rows={3}
                          value={draft.body}
                          onChange={(e) => updateDraft(draft.id, { body: e.target.value })}
                          placeholder={FORMAT_PLACEHOLDER[draft.format]}
                          className="font-mono text-[11px]"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraftRow(draft.id)}
                      className="inline-flex h-9 w-9 items-center justify-center self-end rounded-xl border border-line bg-bg text-fg-subtle transition hover:border-danger hover:text-danger disabled:opacity-30"
                      disabled={drafts.length === 1 && !draft.label && !draft.body}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-fg-subtle">
                  {embeds.length + drafts.length >= MAX_EMBEDS
                    ? `Limit reached (${MAX_EMBEDS}). Delete an existing embed to add more.`
                    : `Up to ${MAX_EMBEDS} embeds total — add as many rows below as you need.`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={addDraftRow}
                    disabled={embeds.length + drafts.length >= MAX_EMBEDS}
                  >
                    <Plus className="h-4 w-4" /> Another
                  </Button>
                  <Button
                    onClick={saveDrafts}
                    disabled={!drafts.some((d) => d.label.trim() && d.body.trim())}
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAdderOpen(false);
                      setDrafts([blankDraft()]);
                    }}
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
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

          {active && (() => {
            const fmt: NotebookEmbedFormat = active.format ?? "url";
            const resolved = resolveByFormat(fmt, active.url, active.content);
            const isVideo =
              resolved.kind !== "srcdoc" &&
              ["youtube", "vimeo", "loom"].includes(resolved.provider);
            const openHref =
              active.url ||
              (active.content ? extractUrlFromSnippet(active.content) : null) ||
              "";
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-line bg-bg-soft/40 px-3 py-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2 text-fg-muted">
                    <span className="truncate font-medium text-fg">{active.label}</span>
                    <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">
                      {resolved.provider}
                    </span>
                    {fmt !== "url" && (
                      <span className="rounded border border-line bg-bg px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">
                        {fmt}
                      </span>
                    )}
                  </div>
                  {openHref ? (
                    <a
                      href={openHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200"
                    >
                      Open in new tab <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                {resolved.kind === "iframe" && isVideo && (
                  // Video providers (YouTube / Vimeo / Loom) get a fixed
                  // 16:9 aspect ratio so the video shows top-to-bottom in
                  // its natural ratio. Fullscreen toggle is preserved by
                  // `allowFullScreen`.
                  <div
                    className="relative overflow-hidden rounded-xl border border-line bg-black"
                    style={{ aspectRatio: "16 / 9" }}
                  >
                    <iframe
                      src={resolved.src}
                      title={active.label}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )}
                {resolved.kind === "iframe" && !isVideo && (
                  // Documents / TradingView snapshots / generic embeddable
                  // pages get a tall, scrollable iframe so long content
                  // (Google Docs, snapshots) is fully readable.
                  <div className="overflow-hidden rounded-xl border border-line bg-black">
                    <iframe
                      src={resolved.src}
                      title={active.label}
                      className="h-[calc(100vh-300px)] min-h-[480px] w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )}
                {resolved.kind === "image" && (
                  // Direct images sit in a centred container at their
                  // natural size — `object-contain` keeps them un-zoomed
                  // so a Pinterest screenshot reads exactly as it does
                  // on Pinterest.
                  <div className="flex justify-center overflow-hidden rounded-xl border border-line bg-bg-elevated p-2">
                    <img
                      src={resolved.src}
                      alt={active.label}
                      className="max-h-[calc(100vh-320px)] w-auto max-w-full object-contain"
                    />
                  </div>
                )}
                {resolved.kind === "srcdoc" && (
                  // HTML / JSX snippets that we couldn't reduce to a
                  // canonical URL get rendered inside a sandboxed iframe
                  // so embed scripts (TradingView's div+script blocks,
                  // arbitrary widgets) execute in isolation from our
                  // app — no access to cookies, localStorage, or our
                  // top-level DOM.
                  <div className="overflow-hidden rounded-xl border border-line bg-black">
                    <iframe
                      srcDoc={resolved.html}
                      title={active.label}
                      className="h-[calc(100vh-300px)] min-h-[480px] w-full"
                      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )}
                {resolved.kind === "blocked" && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-6 text-center text-sm">
                    <div className="font-medium text-fg">
                      {resolved.provider === "notion"
                        ? "Notion pages can't be embedded directly."
                        : resolved.provider === "pinterest"
                        ? "Pinterest pins can't be embedded directly."
                        : resolved.provider === "tradingview"
                        ? "TradingView chart pages can't be embedded directly."
                        : "This page refuses to load inside an iframe."}
                    </div>
                    <div className="mt-1 text-xs text-fg-muted">
                      {resolved.provider === "pinterest"
                        ? "Right-click the pin → 'Copy image address', save the embed with that direct image URL, and it'll show inline here."
                        : resolved.provider === "tradingview"
                        ? "Use the share menu on a chart → 'Get image link' to publish a snapshot. The snapshot URL (looks like tradingview.com/x/abc123/) embeds inline."
                        : resolved.provider === "notion"
                        ? "This is a private notion.so URL — those refuse iframe. Click Share → 'Publish to web' on the Notion page, then paste the public *.notion.site URL here and it'll embed inline."
                        : "Most modern sites block iframe embedding for security. Use the link below to open it in a new tab, or paste a direct image / video URL instead."}
                    </div>
                    {openHref ? (
                      <a
                        href={openHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-xs text-brand-300 hover:border-brand-400"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })()}
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
          onSave={updateNote}
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
  onDelete,
  onSave
}: {
  note: NotebookNote;
  onClose: () => void;
  onDelete: () => void;
  onSave: (next: NotebookNote) => Promise<void>;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(note.name);
  const [draftBody, setDraftBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const safeName = note.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "note";

  // Prefer the latest edit timestamp over the original created_at when
  // showing "saved X" in the header — tells the user when they last
  // touched the note.
  const savedLabel = note.updated_at ?? note.created_at;
  const hasEdit = Boolean(note.updated_at && note.updated_at !== note.created_at);

  function startEditing() {
    setDraftName(note.name);
    setDraftBody(note.body);
    setEditing(true);
  }

  function cancelEditing() {
    setDraftName(note.name);
    setDraftBody(note.body);
    setEditing(false);
  }

  async function commitEditing() {
    const name = draftName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onSave({
        ...note,
        name,
        body: draftBody,
        updated_at: new Date().toISOString()
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        // Discard unsaved edits rather than silently persist them on
        // background click — matches the header's Cancel button.
        if (editing) return;
        onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-bg-elevated p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Note name"
                className="text-base font-semibold"
              />
            ) : (
              <h3 className="truncate text-base font-semibold">{note.name}</h3>
            )}
            <div className="mt-0.5 text-[11px] text-fg-subtle">
              {hasEdit ? "Edited" : "Saved"} {formatNoteTimestamp(savedLabel)}
            </div>
          </div>
          <div className="flex items-center gap-2" data-screenshot-ignore="true">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-fg-muted hover:border-fg hover:text-fg disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button onClick={commitEditing} disabled={saving || !draftName.trim()}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-fg-muted hover:border-brand-400 hover:text-brand-200"
                  aria-label="Edit note"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
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
              </>
            )}
          </div>
        </div>
        {editing ? (
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="Type your note here…"
              className="min-h-[300px] flex-1 resize-y whitespace-pre-wrap rounded-xl border border-line bg-bg-soft/40 p-4 text-sm text-fg"
            />
            <div className="text-[11px] text-fg-subtle">
              Tip: line breaks are preserved exactly as typed.
            </div>
          </div>
        ) : (
          <div
            ref={captureRef}
            className="overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg-soft/40 p-4 text-sm text-fg"
          >
            <div className="mb-3 border-b border-line pb-2 text-xs text-fg-muted">
              <div className="font-semibold text-fg">{note.name}</div>
              <div className="text-[11px] text-fg-subtle">
                {formatNoteTimestamp(savedLabel)}
              </div>
            </div>
            {note.body || <em className="text-fg-subtle">This note is empty.</em>}
          </div>
        )}
      </div>
    </div>
  );
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}
