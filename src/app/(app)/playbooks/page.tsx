"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Stat } from "@/components/ui/stat";
import { useTrades } from "@/lib/hooks/use-trades";
import { useFilters } from "@/lib/filters/store";
import { applyAllFilters } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import type { PlaybookRow } from "@/lib/supabase/types";
import { readRules, reportAdherence, type PlaybookRules, type Session } from "@/lib/playbooks";
import { formatPercent } from "@/lib/utils";

const SESSIONS: Session[] = ["New York", "London", "Asia", "Sydney"];

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { trades } = useTrades();
  const { filters } = useFilters();

  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("playbooks")
      .select("*")
      .order("created_at", { ascending: true });
    if (err) setError(err.message);
    setPlaybooks((data ?? []) as PlaybookRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPlaybook() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error: err } = await supabase.from("playbooks").insert({
      user_id: userData.user.id,
      name: "New Playbook",
      description: "",
      rules: {},
      symbol_aliases: []
    });
    if (err) setError(err.message);
    else load();
  }

  async function deletePlaybook(id: string) {
    // one-click delete for playbooks
    const supabase = createClient();
    await supabase.from("playbooks").delete().eq("id", id);
    load();
  }

  function toggle(id: string) {
    setOpenIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks"
        description="Define each trading model — definition, rules, asset focus, target RR. We score every trade against its playbook on Streaks / Reports / Recaps."
        actions={
          <Button onClick={createPlaybook}>
            <Plus className="h-4 w-4" /> New playbook
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-fg-muted">Loading playbooks…</div>
      ) : playbooks.length === 0 ? (
        <Empty
          title="No playbooks yet"
          description="Create one to start scoring rule-adherence on every trade."
          action={<Button onClick={createPlaybook}>Create your first playbook</Button>}
        />
      ) : (
        <div className="space-y-4">
          {playbooks.map((pb) => (
            <PlaybookCard
              key={pb.id}
              pb={pb}
              open={openIds.has(pb.id)}
              onToggle={() => toggle(pb.id)}
              onDelete={() => deletePlaybook(pb.id)}
              onSaved={load}
              tradesForReport={filtered.filter((t) => t.playbook_id === pb.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaybookCard({
  pb,
  open,
  onToggle,
  onDelete,
  onSaved,
  tradesForReport
}: {
  pb: PlaybookRow;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => void;
  tradesForReport: ReturnType<typeof applyAllFilters>;
}) {
  const [name, setName] = useState(pb.name);
  const [description, setDescription] = useState(pb.description ?? "");
  const [rules, setRules] = useState<PlaybookRules>(readRules(pb.rules));
  const [aliasesText, setAliasesText] = useState(pb.symbol_aliases.join(", "));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(pb.name);
    setDescription(pb.description ?? "");
    setRules(readRules(pb.rules));
    setAliasesText(pb.symbol_aliases.join(", "));
    setDirty(false);
  }, [pb]);

  function patchRules(p: Partial<PlaybookRules>) {
    setRules((r) => ({ ...r, ...p }));
    setDirty(true);
  }

  function toggleSession(s: Session) {
    const cur = rules.sessions ?? [];
    patchRules({ sessions: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const aliases = aliasesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const rulesJson = { ...rules } as Record<string, unknown>;
    const { error: err } = await supabase
      .from("playbooks")
      .update({
        name,
        description: description || null,
        rules: rulesJson,
        symbol_aliases: aliases
      })
      .eq("id", pb.id);
    setSaving(false);
    if (!err) {
      setDirty(false);
      onSaved();
    }
  }

  const adherence = useMemo(
    () => reportAdherence(tradesForReport, { ...pb, symbol_aliases: aliasesText.split(",").map((s) => s.trim()).filter(Boolean) }),
    [tradesForReport, pb, aliasesText]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CardTitle>{name || "Untitled playbook"}</CardTitle>
          {tradesForReport.length > 0 && (
            <Badge variant="brand">{tradesForReport.length} trades</Badge>
          )}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={save} disabled={!dirty || saving}>
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      </CardHeader>

      {open && (
        <CardBody className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div>
              <Label>Symbol aliases (comma-separated)</Label>
              <Input
                value={aliasesText}
                onChange={(e) => {
                  setAliasesText(e.target.value);
                  setDirty(true);
                }}
                placeholder="NAS100, USA100, Nas100.f, NQ"
              />
            </div>
          </div>

          <div>
            <Label>Description / definition</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDirty(true);
              }}
              placeholder="What makes a valid setup for this model?"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-bg-elevated p-4">
            <div className="text-sm font-medium">Rules</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Trade time window (24h, broker time)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="HH:MM"
                    value={
                      rules.timeWindow
                        ? `${pad(rules.timeWindow.startHour)}:${pad(rules.timeWindow.startMinute)}`
                        : ""
                    }
                    onChange={(e) => {
                      const tw = parseHHMM(e.target.value);
                      if (tw)
                        patchRules({
                          timeWindow: {
                            startHour: tw.h,
                            startMinute: tw.m,
                            endHour: rules.timeWindow?.endHour ?? 23,
                            endMinute: rules.timeWindow?.endMinute ?? 59
                          }
                        });
                    }}
                  />
                  <span className="text-fg-subtle">→</span>
                  <Input
                    placeholder="HH:MM"
                    value={
                      rules.timeWindow
                        ? `${pad(rules.timeWindow.endHour)}:${pad(rules.timeWindow.endMinute)}`
                        : ""
                    }
                    onChange={(e) => {
                      const tw = parseHHMM(e.target.value);
                      if (tw)
                        patchRules({
                          timeWindow: {
                            startHour: rules.timeWindow?.startHour ?? 0,
                            startMinute: rules.timeWindow?.startMinute ?? 0,
                            endHour: tw.h,
                            endMinute: tw.m
                          }
                        });
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Allowed sessions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SESSIONS.map((s) => {
                    const selected = rules.sessions?.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSession(s)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          selected
                            ? "border-brand-400 bg-brand-500/15 text-fg"
                            : "border-line bg-bg-elevated text-fg-subtle"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Asset focus (canonical names)</Label>
                <Input
                  value={(rules.assetFocus ?? []).join(", ")}
                  onChange={(e) =>
                    patchRules({
                      assetFocus: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    })
                  }
                  placeholder="NAS100, US30, EURUSD"
                />
              </div>
              <div>
                <Label>Max trades per session</Label>
                <Input
                  type="number"
                  value={rules.maxTradesPerSession ?? ""}
                  onChange={(e) =>
                    patchRules({
                      maxTradesPerSession: e.target.value ? Number(e.target.value) : undefined
                    })
                  }
                />
              </div>
              <div>
                <Label>Target RR (reward / risk)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.rrTarget ?? ""}
                  onChange={(e) =>
                    patchRules({ rrTarget: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>

            <div>
              <Label>General rules / notes</Label>
              <Textarea
                rows={2}
                value={rules.notes ?? ""}
                onChange={(e) => patchRules({ notes: e.target.value })}
                placeholder="Any free-form rule reminders…"
              />
            </div>
          </div>

          {tradesForReport.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-line bg-bg-elevated p-4">
              <div className="text-sm font-medium">Rule-adherence report (current filters)</div>
              <div className="grid gap-3 md:grid-cols-3">
                <Stat
                  label="Trades on this playbook"
                  value={adherence.totalTrades}
                  format="number"
                />
                <Stat
                  label="Followed all rules"
                  value={adherence.followedRules}
                  format="number"
                />
                <Stat
                  label="Adherence %"
                  value={adherence.adherencePct}
                  format="percent"
                  positive={adherence.adherencePct >= 80}
                />
              </div>
              {adherence.issues.length > 0 && (
                <div className="text-xs text-fg-muted">
                  {countIssues(adherence.issues, "outside-time-window")} outside time window ·{" "}
                  {countIssues(adherence.issues, "wrong-session")} wrong session ·{" "}
                  {countIssues(adherence.issues, "wrong-asset")} wrong asset ·{" "}
                  {countIssues(adherence.issues, "below-rr-target")} below RR target
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-bg-soft/40 p-3 text-xs text-fg-muted">
              No trades tagged with this playbook yet. Tag trades with this playbook from the Trades page (coming Phase 6) to see adherence scores.
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function countIssues<T extends { kind: string }>(arr: T[], k: string): number {
  return arr.filter((x) => x.kind === k).length;
}
