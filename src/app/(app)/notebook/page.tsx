"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ExternalLink, Save, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "genesis.notebook.url";

/**
 * Per-user embeddable notebook. Accepts any iframe-friendly URL — Notion,
 * Google Drive, YouTube, Confluence, any public page. Stored on the user's
 * profile (notebook_url) and cached in localStorage so it survives page
 * loads even before the row syncs.
 */
export default function NotebookPage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("notebook_url")
        .eq("id", u.user.id)
        .maybeSingle();
      const synced = (data?.notebook_url ?? "") as string;
      const cached = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_KEY) ?? "" : "";
      const final = synced || cached || "";
      setUrl(final);
      setDraft(final);
      setEditing(!final);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const trimmed = draft.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setError("URL must start with http:// or https://");
      setSaving(false);
      return;
    }
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: u.user.id, notebook_url: trimmed || null });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_KEY, trimmed);
    setUrl(trimmed);
    setEditing(false);
  }

  if (loading) return <div className="text-sm text-fg-muted">Loading notebook…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notebook"
        description="Embed your own journal — Notion, Google Drive, YouTube, Confluence, or any public page that allows iframes."
        actions={
          <div className="flex items-center gap-2">
            {url && (
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="secondary"><ExternalLink className="h-4 w-4" /> Open</Button>
              </a>
            )}
            {url && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Change link
              </Button>
            )}
          </div>
        }
      />

      {(editing || !url) && (
        <Card>
          <CardHeader><CardTitle>Embed URL</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <Label>Public link to embed</Label>
              <Input
                placeholder="https://notion.so/..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <p className="mt-1 text-xs text-fg-subtle">
                Tip: in Notion, click <em>Share → Publish</em> and paste the public link here.
                For Google Drive, use the &ldquo;Anyone with the link&rdquo; share URL.
              </p>
            </div>
            {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
            <div className="flex justify-end gap-2">
              {url && (
                <Button variant="ghost" onClick={() => { setDraft(url); setEditing(false); }}>
                  Cancel
                </Button>
              )}
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {url ? (
        <Card>
          <CardHeader><CardTitle>Your notebook</CardTitle></CardHeader>
          <CardBody>
            <iframe
              src={url}
              title="Genesis Notebook"
              className="h-[calc(100vh-260px)] w-full rounded-xl border border-line bg-white"
            />
          </CardBody>
        </Card>
      ) : (
        <Empty
          title="No notebook configured"
          description="Paste a public Notion / Google Drive / YouTube link above to embed it here."
        />
      )}
    </div>
  );
}
