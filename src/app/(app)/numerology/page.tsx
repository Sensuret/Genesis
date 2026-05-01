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
import {
  getSignProfile,
  lunarForecast,
  moonPhase,
  moonTradeNote,
  ALL_SIGNS,
  horoscopeFor,
  type HoroscopeTimeframe
} from "@/lib/astrology";
import { westernZodiac, type WesternSign } from "@/lib/numerology";
import type { NumerologyOtherRow, NumerologyProfileRow } from "@/lib/supabase/types";
import { Plus, Sparkles, Trash2 } from "lucide-react";

const TABS = [
  "My Profile",
  "Calculate For Others",
  "Combined",
  "Lunar Cycle",
  "Horoscope",
  "Education Insights",
  "General Knowledge",
  "Advanced Insights"
] as const;
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
      ) : tab === "Horoscope" ? (
        <HoroscopeView profile={my} />
      ) : tab === "Education Insights" ? (
        <Education />
      ) : tab === "General Knowledge" ? (
        <GeneralKnowledge />
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

function HoroscopeView({ profile }: { profile: NumerologyProfileRow | null }) {
  const [tf, setTf] = useState<HoroscopeTimeframe>("daily");
  const defaultSign: WesternSign = profile?.dob ? westernZodiac(profile.dob) : "Aries";
  const [sign, setSign] = useState<WesternSign>(defaultSign);
  const horo = useMemo(() => horoscopeFor(sign, tf, new Date()), [sign, tf]);
  const sp = getSignProfile(`2000-${signMonth(sign)}-15`);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Daily / Weekly / Monthly Horoscope</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-line bg-bg-elevated p-1">
              {(["daily", "weekly", "monthly"] as HoroscopeTimeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    tf === t ? "bg-brand-500 text-white" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {t === "daily" ? "Daily" : t === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
            <Select
              value={sign}
              onChange={(e) => setSign(e.target.value as WesternSign)}
              className="w-44"
            >
              {ALL_SIGNS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{sp.symbol}</div>
              <div>
                <div className="text-lg font-semibold">{sign}</div>
                <div className="text-xs text-fg-subtle">{horo.periodLabel}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Chip label="General" body={horo.general} />
              <Chip label="Trading" body={horo.trade} />
              <Chip label="Love" body={horo.love} />
              <Chip label="Health" body={horo.health} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Chip({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated p-3">
      <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="mt-1 text-sm">{body}</div>
    </div>
  );
}

function Education() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>How to use this page</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Start in <span className="text-fg">My Profile</span> — enter the full name on your birth
            certificate plus your date of birth. Genesis computes your Pythagorean numerology core
            (Life Path, Destiny, Soul Urge, Personality, Birthday) and your Chinese / Western zodiac
            in one pass.
          </p>
          <p>
            <span className="text-fg">Calculate For Others</span> stores the same profile for people
            in your life. Use <span className="text-fg">Combined</span> to see today's stacked
            reading (numerology personal year + sun sign + moon phase) and compatibility scores.
          </p>
          <p>
            <span className="text-fg">Lunar Cycle</span> tracks the moon phase for now and the next
            30 days — pair it with your trade journal to spot lunar patterns in your P&amp;L.
          </p>
          <p>
            <span className="text-fg">Horoscope</span> gives a daily / weekly / monthly outlook by
            sign — its trading line is the only one tied to markets; the rest are general life
            guidance.
          </p>
          <p>
            <span className="text-fg">Advanced Insights</span> applies your numbers to brand / city /
            car suggestions for harmony or friction (lifestyle layer; not investment advice).
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>What each metric means</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm">
          <Def title="Life Path">
            Sum of your full date of birth reduced to one digit (or master 11 / 22 / 33). Your core
            life lesson and natural rhythm.
          </Def>
          <Def title="Destiny / Expression">
            Sum of letters in your full birth name. The blueprint of who you become.
          </Def>
          <Def title="Soul Urge">
            Sum of the vowels in your full name. Your inner motivation — what really drives you.
          </Def>
          <Def title="Personality">
            Sum of the consonants in your name. The mask others see before they know you.
          </Def>
          <Def title="Birthday number">
            Just your day of birth (1–31). A focused gift you carry.
          </Def>
          <Def title="Personal Year">
            Life Path + current calendar year, reduced. Tells you which 1–9 cycle you're in this year.
          </Def>
          <Def title="Western zodiac">
            Sun sign by birth date. Element + modality + planetary ruler shape your default style.
          </Def>
          <Def title="Chinese zodiac">
            Year animal on the lunar calendar. Pairs and conflicts with other animals.
          </Def>
          <Def title="Moon phase">
            Where the moon is in its 29.5-day synodic cycle on a given day. Used here purely as a
            ritual / journaling cue.
          </Def>
        </CardBody>
      </Card>
    </div>
  );
}

function Def({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="text-xs font-medium text-fg">{title}</div>
      <div className="mt-1 text-xs text-fg-muted">{children}</div>
    </div>
  );
}

function GeneralKnowledge() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Pythagorean numerology — the short history</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Pythagoras (c. 570–495 BCE) and his school in Croton taught that{" "}
            <em>“number is the ruler of forms and ideas, and the cause of gods and demons.”</em>{" "}
            Numbers were treated not as quantities but as the underlying language of harmony,
            geometry, and music. The reduction system used here — letters mapped to 1–9, summed
            and reduced — is a Western adaptation of that Pythagorean alphabet.
          </p>
          <p>
            Master numbers <span className="text-fg">11</span>, <span className="text-fg">22</span>,{" "}
            and <span className="text-fg">33</span> are not reduced because they're considered
            higher-octave channels of 2, 4 and 6 respectively.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Astrology fundamentals</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            Western astrology divides the ecliptic into 12 signs of 30° each. A sign's character
            comes from three stacks: <span className="text-fg">element</span> (Fire / Earth / Air /
            Water), <span className="text-fg">modality</span> (Cardinal / Fixed / Mutable), and{" "}
            <span className="text-fg">planetary ruler</span>. Stacking those three is enough for a
            sharp character sketch even before going into a full natal chart.
          </p>
          <p>
            Chinese astrology uses a 12-year animal cycle layered with five elements (Wood, Fire,
            Earth, Metal, Water) and yin/yang polarity, producing a 60-year sexagenary cycle. The
            simplified "year animal" used in this app is the surface layer.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>The lunar synodic cycle</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-fg-muted">
          <p>
            The synodic month — new moon to new moon — averages{" "}
            <span className="text-fg">29.530588 days</span>. Eight named phases divide that cycle:
            New, Waxing Crescent, First Quarter, Waxing Gibbous, Full, Waning Gibbous, Last
            Quarter, Waning Crescent.
          </p>
          <p>
            The phase shown for any given date in this app is computed analytically (Conway / Meeus
            simplified) and is accurate to within ±0.5 days — enough for journaling and ritual,
            not for navigation.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Disclaimer</CardTitle></CardHeader>
        <CardBody className="text-xs text-fg-muted">
          Nothing on this page is financial, medical, legal, or psychological advice. Numerology
          and astrology are interpretive frameworks for self-reflection, not predictive tools.
        </CardBody>
      </Card>
    </div>
  );
}
