"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  buildNumerologySnapshot, compatibility, advancedInsights,
  type NumerologySnapshot
} from "@/lib/numerology";
import { getSignProfile, lunarForecast, moonPhase, moonTradeNote, ALL_SIGNS } from "@/lib/astrology";
import type { NumerologyOtherRow, NumerologyProfileRow } from "@/lib/supabase/types";
import { Plus, Sparkles, Trash2 } from "lucide-react";

const TABS = ["My Profile", "Calculate For Others", "Combined", "Lunar Cycle", "Advanced Insights"] as const;
type Tab = (typeof TABS)[number];

const RELATIONSHIPS = [
  "Family", "Friend", "Ex", "Potential", "Business", "Partner",
  "Politician", "Forex G", "Crypto G", "Ecom G", "Cousin", "Crush", "Niece", "Nephew"
];

export default function NumerologyPage() {
  const [tab, setTab] = useState<Tab>("My Profile");
  const [my, setMy] = useState<NumerologyProfileRow | null>(null);
  const [others, setOthers] = useState<NumerologyOtherRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const [mineRes, othersRes] = await Promise.all([
        supabase.from("numerology_profiles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("numerology_others").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);
      setMy(mineRes.data ?? null);
      setOthers(othersRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Numerology & Astrology"
        description={
          <>
            <em>“Numbers are the universal language offered by the deity to humans as confirmation of the truth.”</em> — St. Augustine
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "border-brand-400 bg-brand-500/15 text-brand-200" : "border-line bg-bg-soft text-fg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-fg-muted">Loading numerology…</div>
      ) : tab === "My Profile" ? (
        <MyProfile profile={my} onSaved={(p) => setMy(p)} />
      ) : tab === "Calculate For Others" ? (
        <Others rows={others} onChange={setOthers} myProfile={my} />
      ) : tab === "Combined" ? (
        <Combined profile={my} others={others} />
      ) : tab === "Lunar Cycle" ? (
        <Lunar />
      ) : (
        <Insights profile={my} />
      )}
    </div>
  );
}

function MyProfile({
  profile,
  onSaved
}: {
  profile: NumerologyProfileRow | null;
  onSaved: (p: NumerologyProfileRow) => void;
}) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [dob, setDob] = useState(profile?.dob ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshot = useMemo(
    () => (name && dob ? buildNumerologySnapshot(name, dob) : null),
    [name, dob]
  );
  const sign = snapshot ? getSignProfile(dob) : null;

  async function save() {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setError("Not signed in"); setBusy(false); return; }
    const { data, error } = await supabase
      .from("numerology_profiles")
      .upsert({ id: profile?.id, user_id: user.id, full_name: name, dob, data: snapshot })
      .select()
      .single();
    setBusy(false);
    if (error || !data) setError(error?.message ?? "Failed to save");
    else onSaved(data);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Your numerology inputs</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div><Label>Full name (as on birth certificate)</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Date of birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          {error && <div className="md:col-span-2 rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
          <div className="md:col-span-2 flex justify-end">
            <Button disabled={!snapshot || busy} onClick={save}>{busy ? "Saving…" : "Save profile"}</Button>
          </div>
        </CardBody>
      </Card>

      {snapshot && sign && (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Stat label="Life Path" value={snapshot.lifePath} />
            <Stat label="Destiny" value={snapshot.destiny} />
            <Stat label="Soul Urge" value={snapshot.soulUrge} />
            <Stat label="Personality" value={snapshot.personality} />
            <Stat label="Birthday" value={snapshot.birthday} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Western zodiac</CardTitle></CardHeader>
              <CardBody>
                <div className="text-3xl">{sign.symbol} <span className="font-semibold">{sign.sign}</span></div>
                <div className="mt-1 text-xs text-fg-muted">{sign.element} · {sign.modality} · ruled by {sign.ruler}</div>
                <div className="mt-3 rounded-xl border border-line bg-bg-soft/40 p-3 text-xs">
                  <div className="font-medium text-fg">Trade archetype</div>
                  <div className="mt-1 text-fg-muted">{sign.tradeArchetype}</div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Chinese zodiac</CardTitle></CardHeader>
              <CardBody>
                <div className="text-2xl font-semibold">{snapshot.chinese}</div>
                <div className="mt-1 text-xs text-fg-muted">Enemy sign: {snapshot.enemyChinese}</div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Lucky numbers & cycle</CardTitle></CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.lucky.map((n) => <Badge key={n} variant="brand">{n}</Badge>)}
                </div>
                <div className="mt-3 text-sm font-medium">Personal Year {snapshot.personalYear}</div>
                <div className="text-xs text-fg-muted">{snapshot.currentCycle.name}</div>
                <div className="text-xs text-fg-subtle">{snapshot.currentCycle.range}</div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Western enemy sign</CardTitle></CardHeader>
            <CardBody className="text-sm">
              Folklore opposition: <span className="font-medium">{snapshot.enemyWestern}</span>. When trading with or
              against this sign expect extra friction — it just means you have to <em>communicate edge</em> more carefully.
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function Others({
  rows,
  onChange,
  myProfile
}: {
  rows: NumerologyOtherRow[];
  onChange: (rows: NumerologyOtherRow[]) => void;
  myProfile: NumerologyProfileRow | null;
}) {
  const [filter, setFilter] = useState<string>("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: "", nickname: "", dob: "", relationship: "Friend" });

  const filtered = filter === "All" ? rows : rows.filter((r) => r.relationship === filter);
  const myCalc = myProfile ? buildNumerologySnapshot(myProfile.full_name, myProfile.dob) : null;

  async function add() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user || !form.full_name || !form.dob) return;
    const snap = buildNumerologySnapshot(form.full_name, form.dob);
    const { data, error } = await supabase
      .from("numerology_others")
      .insert({ user_id: user.id, ...form, data: snap })
      .select()
      .single();
    if (error || !data) return;
    onChange([data, ...rows]);
    setForm({ full_name: "", nickname: "", dob: "", relationship: "Friend" });
    setAdding(false);
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("numerology_others").delete().eq("id", id);
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>People in your orbit</CardTitle>
          <Button onClick={() => setAdding((s) => !s)} variant="secondary"><Plus className="h-4 w-4" /> Add</Button>
        </CardHeader>
        {adding && (
          <CardBody className="grid gap-3 md:grid-cols-4 border-t border-line pt-5">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Nickname</Label><Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></div>
            <div><Label>DOB</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div>
              <Label>Relationship</Label>
              <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button onClick={add}>Save person</Button>
            </div>
          </CardBody>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {["All", ...RELATIONSHIPS].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === r ? "border-brand-400 bg-brand-500/15 text-brand-200" : "border-line bg-bg-soft text-fg-muted"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty title="No people yet" description="Add family, friends, business partners and crushes — Genesis computes compatibility on the fly." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => {
            const snap = buildNumerologySnapshot(r.full_name, r.dob);
            const compat = myCalc ? compatibility(myCalc, snap) : null;
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle>
                    {r.full_name}
                    {r.nickname ? <span className="ml-2 text-xs text-fg-subtle">aka {r.nickname}</span> : null}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{r.relationship}</Badge>
                    <Badge variant="brand">Life path {snap.lifePath}</Badge>
                    <Badge variant="brand">{snap.western}</Badge>
                    <Badge variant="brand">{snap.chinese}</Badge>
                  </div>
                  {compat && (
                    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
                      <div className="text-xs text-fg-muted">Compatibility with you</div>
                      <div className="mt-1 text-2xl font-semibold text-brand-300">{compat.overall}<span className="text-sm text-fg-subtle">/100</span></div>
                      <div className="mt-2 text-xs text-fg-muted">
                        Life path {compat.breakdown.lifePath} · Destiny {compat.breakdown.destiny} · Soul {compat.breakdown.soulUrge} · Western {compat.breakdown.western} · Chinese {compat.breakdown.chinese}
                      </div>
                      {compat.notes.length > 0 && (
                        <div className="mt-2 text-xs text-warn">{compat.notes.join(" · ")}</div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Combined({
  profile,
  others
}: {
  profile: NumerologyProfileRow | null;
  others: NumerologyOtherRow[];
}) {
  if (!profile) return <Empty title="Save your profile first" description="Add your name and DOB on the My Profile tab to unlock combined readings." />;
  const me = buildNumerologySnapshot(profile.full_name, profile.dob);
  const sign = getSignProfile(profile.dob);
  const moon = moonPhase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Today's combined reading</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs text-fg-muted">Numerology</div>
            <div className="mt-1 text-lg font-semibold">Personal Year {me.personalYear}</div>
            <div className="text-xs text-fg-subtle">{me.currentCycle.name}</div>
          </div>
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs text-fg-muted">Astrology</div>
            <div className="mt-1 text-lg font-semibold">{sign.symbol} {sign.sign}</div>
            <div className="text-xs text-fg-subtle">{sign.element} · {sign.modality}</div>
          </div>
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs text-fg-muted">Lunar</div>
            <div className="mt-1 text-lg font-semibold">{moon.emoji} {moon.phase}</div>
            <div className="text-xs text-fg-subtle">{(moon.illumination * 100).toFixed(0)}% lit</div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trading posture for you, today</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p>{moonTradeNote(moon.phase)}</p>
          <p className="text-fg-muted">
            Layer your archetype: <em>{sign.tradeArchetype}</em>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top compatibility this cycle</CardTitle></CardHeader>
        <CardBody>
          {others.length === 0 ? (
            <div className="text-sm text-fg-muted">Add people on the &quot;Calculate For Others&quot; tab.</div>
          ) : (
            <ul className="space-y-2">
              {others
                .map((r) => ({ row: r, snap: buildNumerologySnapshot(r.full_name, r.dob) }))
                .map(({ row, snap }) => ({ row, score: compatibility(me, snap).overall }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(({ row, score }) => (
                  <li key={row.id} className="flex items-center justify-between rounded-xl border border-line bg-bg-soft/40 p-3 text-sm">
                    <span className="font-medium">{row.full_name} <span className="ml-1 text-xs text-fg-subtle">{row.relationship}</span></span>
                    <span className="text-brand-300">{score}/100</span>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Lunar() {
  const today = moonPhase();
  const month = lunarForecast(30);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Right now</CardTitle></CardHeader>
        <CardBody className="flex items-center gap-6">
          <div className="text-7xl">{today.emoji}</div>
          <div>
            <div className="text-2xl font-semibold">{today.phase}</div>
            <div className="text-sm text-fg-muted">{(today.illumination * 100).toFixed(0)}% illumination</div>
            <div className="mt-3 max-w-xl rounded-xl border border-line bg-bg-soft/40 p-3 text-sm text-fg-muted">
              {moonTradeNote(today.phase)}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Next 30 days</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-5 gap-3 md:grid-cols-10">
            {month.map((d) => (
              <div key={d.date} className="rounded-xl border border-line bg-bg-soft/40 p-2 text-center">
                <div className="text-xl">{d.emoji}</div>
                <div className="mt-1 text-[10px] text-fg-subtle">{d.date.slice(5)}</div>
                <div className="text-[9px] text-fg-muted">{d.phase}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>All 12 signs at a glance</CardTitle></CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {ALL_SIGNS.map((s) => {
            const fakeDob = `2000-${signMonth(s)}-15`;
            const profile = getSignProfile(fakeDob);
            return (
              <div key={s} className="rounded-xl border border-line bg-bg-soft/40 p-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{profile.symbol}</div>
                  <div>
                    <div className="font-medium">{profile.sign}</div>
                    <div className="text-xs text-fg-subtle">{profile.element} · {profile.modality}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-fg-muted">{profile.tradeArchetype}</div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function signMonth(sign: string): string {
  // Approximate month for sample-only DOB (day 15 falls inside the sign).
  const map: Record<string, string> = {
    Aries: "04", Taurus: "05", Gemini: "06", Cancer: "07", Leo: "08", Virgo: "09",
    Libra: "10", Scorpio: "11", Sagittarius: "12", Capricorn: "01", Aquarius: "02", Pisces: "03"
  };
  return map[sign] ?? "01";
}

function Insights({ profile }: { profile: NumerologyProfileRow | null }) {
  if (!profile) return <Empty title="Save your profile first" description="Save your numerology profile to see personalized advanced insights." />;
  const snap = buildNumerologySnapshot(profile.full_name, profile.dob);
  const ins = advancedInsights(snap);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Insights</CardTitle>
          <Sparkles className="h-4 w-4 text-brand-300" />
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <Block title="Cities to use" items={ins.useCities} variant="success" />
          <Block title="Cities to avoid" items={ins.avoidCities} variant="danger" />
          <Block title="Brands to use" items={ins.useBrands} variant="success" />
          <Block title="Brands to avoid" items={ins.avoidBrands} variant="danger" />
          <Block title="Cars to use" items={ins.useCars} variant="success" />
          <Block title="Cars to avoid" items={ins.avoidCars} variant="danger" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reflection prompts</CardTitle></CardHeader>
        <CardBody>
          <Textarea placeholder="Write what came up reading the above…" rows={6} />
          <div className="mt-2 text-xs text-fg-subtle">
            Reflections are a free-form notebook entry and are not stored server-side yet.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Block({ title, items, variant }: { title: string; items: string[]; variant: "success" | "danger" }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-fg-muted">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => <Badge key={i} variant={variant}>{i}</Badge>)}
      </div>
    </div>
  );
}
