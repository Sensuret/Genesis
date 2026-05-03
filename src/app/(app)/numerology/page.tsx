"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { createClient } from "@/lib/supabase/client";
import {
  buildNumerologySnapshot, compatibility, advancedInsights,
  chineseZodiacForYear, chineseEmoji, yearOutlookFor, yearOutlookReason,
  chinesePersonalityNote,
  NUMBER_VIBRATIONS, femaleCycleReading,
  personalYearTheme, PERSONAL_YEAR_CYCLE,
  UNIVERSAL_LAWS, MARITIME_LAWS,
  destinyNumber, soulUrge, personality,
  type NumerologySnapshot, type ChineseSign, type YearCycleOutlook,
  type LawEntry
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
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  applyFilters,
  buildCombinedProfiles,
  type NumFilters
} from "@/lib/numerology/filters";
import { FilterBar } from "@/components/numerology/filter-bar";
import { NumDatabase } from "@/components/numerology/num-database";
import { NumOverview } from "@/components/numerology/num-overview";

type Gender = "male" | "female" | "prefer_not_to_say";

function genderFromData(data: unknown): Gender | "" {
  if (!data || typeof data !== "object") return "";
  const g = (data as { gender?: unknown }).gender;
  return g === "male" || g === "female" || g === "prefer_not_to_say" ? g : "";
}

function lastPeriodFromData(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const v = (data as { lastPeriod?: unknown }).lastPeriod;
  return typeof v === "string" ? v : "";
}

function cycleLengthFromData(data: unknown): number {
  if (!data || typeof data !== "object") return 28;
  const v = (data as { cycleLength?: unknown }).cycleLength;
  return typeof v === "number" && v >= 20 && v <= 40 ? v : 28;
}

const MAX_NICKNAMES = 3;

function nicknamesFromData(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const v = (data as { nicknames?: unknown }).nicknames;
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .slice(0, MAX_NICKNAMES);
}

function padNicknames(arr: string[]): string[] {
  const out = [...arr];
  while (out.length < MAX_NICKNAMES) out.push("");
  return out.slice(0, MAX_NICKNAMES);
}

/**
 * Inputs (up to 3) for an optional set of nicknames. Used in My Profile
 * and Calculate For Others — sits directly under "Full name".
 */
function NicknameInputs({
  values,
  onChange,
  compact = false
}: {
  values: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const padded = padNicknames(values);
  return (
    <div className="space-y-1.5">
      <Label>Nicknames (up to 3 — optional)</Label>
      <div className={compact ? "grid gap-2 md:grid-cols-3" : "grid gap-2 sm:grid-cols-3"}>
        {padded.map((v, i) => (
          <Input
            key={i}
            value={v}
            placeholder={`Nickname ${i + 1}`}
            onChange={(e) => {
              const next = [...padded];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        ))}
      </div>
      <div className="text-[11px] text-fg-subtle">
        Each filled nickname gets its own bonus reading (Expression / Soul Urge / Personality) shown alongside the legal-name numbers.
      </div>
    </div>
  );
}

/**
 * Computes Expression / Soul Urge / Personality numbers for each non-empty
 * nickname and renders them as bonus readings.
 */
function NicknameReadings({ nicknames }: { nicknames: string[] }) {
  const filled = nicknames.map((s) => s.trim()).filter(Boolean);
  if (!filled.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nickname readings (bonus)</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Numerology readings derived from each nickname. The legal-name numbers above remain the primary signal — these are an additional layer of how the world responds to the name they actually call you.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filled.map((nick) => {
            const dn = destinyNumber(nick);
            const su = soulUrge(nick);
            const pn = personality(nick);
            return (
              <div
                key={nick}
                className="rounded-xl border border-line bg-bg-soft/40 p-3"
              >
                <div className="text-xs uppercase tracking-wide text-fg-subtle">
                  Nickname
                </div>
                <div className="text-sm font-semibold text-fg">{nick}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-fg-subtle">Expression</div>
                    <div className="text-base font-semibold text-brand-200">{dn}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-fg-subtle">Soul Urge</div>
                    <div className="text-base font-semibold text-brand-200">{su}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-fg-subtle">Personality</div>
                    <div className="text-base font-semibold text-brand-200">{pn}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

const OUTLOOK_BADGE: Record<YearCycleOutlook, { label: string; cls: string }> = {
  great: { label: "Great year", cls: "bg-success/15 text-success border-success/40" },
  good: { label: "Good year", cls: "bg-success/10 text-success border-success/30" },
  average: { label: "Average", cls: "bg-bg-soft text-fg-muted border-line" },
  tough: { label: "Tough year", cls: "bg-warn/15 text-warn border-warn/40" },
  challenging: { label: "Challenging", cls: "bg-danger/15 text-danger border-danger/40" }
};

const ALL_CHINESE: ChineseSign[] = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

const TABS = [
  "My Profile",
  "Calculate For Others",
  "Combined",
  "Lunar Cycle",
  "Year Cycle",
  "Horoscope",
  "Laws",
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

  const currentYear = new Date().getUTCFullYear();
  const yearSign = chineseZodiacForYear(currentYear);
  const yearOutlook = my ? yearOutlookFor(buildNumerologySnapshot(my.full_name, my.dob).chinese, yearSign) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Numerology & Astrology"
        extra={
          <button
            type="button"
            onClick={() => setTab("Year Cycle")}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition hover:brightness-110 ${
              yearOutlook ? OUTLOOK_BADGE[yearOutlook].cls : "border-line bg-bg-soft text-fg-muted"
            }`}
            title="Open the Year Cycle tab"
          >
            <span className="text-base leading-none">{chineseEmoji(yearSign)}</span>
            <span>Year of the {yearSign}</span>
            <span className="text-fg-subtle">· {currentYear}</span>
            {yearOutlook ? <span className="font-semibold">· {OUTLOOK_BADGE[yearOutlook].label}</span> : null}
          </button>
        }
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
      ) : tab === "Year Cycle" ? (
        <YearCycle profile={my} />
      ) : tab === "Horoscope" ? (
        <HoroscopeView profile={my} />
      ) : tab === "Laws" ? (
        <LawsView />
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
  const [gender, setGender] = useState<Gender | "">(genderFromData(profile?.data) || "");
  const [lastPeriod, setLastPeriod] = useState<string>(lastPeriodFromData(profile?.data));
  const [cycleLength, setCycleLength] = useState<number>(cycleLengthFromData(profile?.data));
  const [nicknames, setNicknames] = useState<string[]>(() =>
    padNicknames(nicknamesFromData(profile?.data))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshot = useMemo(
    () => (name && dob ? buildNumerologySnapshot(name, dob) : null),
    [name, dob]
  );
  const sign = snapshot ? getSignProfile(dob) : null;
  const cycleReading = useMemo(
    () => (gender === "female" && lastPeriod ? femaleCycleReading(lastPeriod, cycleLength) : null),
    [gender, lastPeriod, cycleLength]
  );
  const captureRef = useRef<HTMLDivElement>(null);

  async function save() {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setError("Not signed in"); setBusy(false); return; }
    const cleanNicknames = nicknames.map((n) => n.trim()).filter(Boolean);
    const dataPayload = {
      ...snapshot,
      gender: gender || undefined,
      lastPeriod: gender === "female" ? lastPeriod : undefined,
      cycleLength: gender === "female" ? cycleLength : undefined,
      nicknames: cleanNicknames
    };
    const { data, error } = await supabase
      .from("numerology_profiles")
      .upsert({ id: profile?.id, user_id: user.id, full_name: name, dob, data: dataPayload })
      .select()
      .single();
    setBusy(false);
    if (error || !data) setError(error?.message ?? "Failed to save");
    else onSaved(data);
  }

  return (
    <div ref={captureRef} className="space-y-6">
      <div className="flex justify-end" data-screenshot-ignore="true">
        <ScreenshotButton
          targetRef={captureRef}
          filename={`numerology-profile-${dob || "snapshot"}`}
          label="Save My Profile snapshot as PNG"
        />
      </div>
      <Card>
        <CardHeader><CardTitle>Your numerology inputs</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:items-start">
            <div className="space-y-4">
              <div>
                <Label>Full name (as on birth certificate)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <NicknameInputs values={nicknames} onChange={setNicknames} />
              <div className="flex flex-wrap gap-3">
                <div className="w-44">
                  <Label>Date of birth</Label>
                  <DatePicker
                    value={dob}
                    onChange={(next) => setDob(next)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full"
                    inputClassName="flex-1"
                  />
                </div>
                <div className="w-48">
                  <Label>Gender</Label>
                  <Select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </Select>
                </div>
                {gender === "female" && (
                  <>
                    <div className="w-44">
                      <Label>Last period start</Label>
                      <DatePicker
                        value={lastPeriod}
                        onChange={(next) => setLastPeriod(next)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full"
                        inputClassName="flex-1"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Cycle (days)</Label>
                      <Input
                        type="number"
                        min={20}
                        max={40}
                        value={cycleLength}
                        onChange={(e) => setCycleLength(Math.max(20, Math.min(40, Number(e.target.value) || 28)))}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="text-[11px] text-fg-subtle">
                Gender is used to layer cycle-aware notes on your reading; it stays in your profile only.
              </div>
              {error && <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger">{error}</div>}
              <div className="flex justify-end">
                <Button disabled={!snapshot || busy} onClick={save}>{busy ? "Saving…" : "Save profile"}</Button>
              </div>
            </div>
            <GalaxyVisual className="hidden md:flex" />
          </div>
        </CardBody>
      </Card>

      {cycleReading && (
        <Card>
          <CardHeader><CardTitle>Today's cycle awareness</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <div className="text-xs uppercase tracking-wide text-fg-subtle">Phase</div>
              <div className="mt-1 text-lg font-semibold capitalize">{cycleReading.phase}</div>
              <div className="text-xs text-fg-muted">
                Day {cycleReading.dayInCycle} of {cycleReading.cycleLength}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <div className="text-xs uppercase tracking-wide text-fg-subtle">Energy</div>
              <div className="mt-1 text-sm">{cycleReading.energy}</div>
            </div>
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <div className="text-xs uppercase tracking-wide text-fg-subtle">Trading note</div>
              <div className="mt-1 text-sm">{cycleReading.trade}</div>
            </div>
          </CardBody>
        </Card>
      )}

      {snapshot && sign && (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Stat label="Life Path" value={snapshot.lifePath} />
            <Stat label="Destiny" value={snapshot.destiny} />
            <Stat label="Soul Urge" value={snapshot.soulUrge} />
            <Stat label="Personality" value={snapshot.personality} />
            <Stat label="Birthday" value={snapshot.birthday} />
          </div>

          <NicknameReadings nicknames={nicknames} />

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Western zodiac</CardTitle></CardHeader>
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold">{sign.sign}</div>
                    <div className="mt-1 text-xs text-fg-muted">
                      {sign.element} · {sign.modality} · ruled by {sign.ruler}
                    </div>
                  </div>
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-4xl"
                    aria-hidden
                  >
                    {sign.symbol}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-bg-soft/40 p-3 text-xs">
                  <div className="font-medium text-fg">Trade archetype</div>
                  <div className="mt-1 text-fg-muted">{sign.tradeArchetype}</div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Chinese zodiac</CardTitle></CardHeader>
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold">{snapshot.chinese}</div>
                    <div className="mt-1 text-xs text-fg-muted">Enemy sign: {snapshot.enemyChinese}</div>
                  </div>
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-warn/25 to-warn/5 text-4xl"
                    aria-hidden
                  >
                    {chineseEmoji(snapshot.chinese)}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-bg-soft/40 p-3 text-xs">
                  <div className="font-medium text-fg">Personality</div>
                  <div className="mt-1 text-fg-muted">{chinesePersonalityNote(snapshot.chinese)}</div>
                </div>
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
  const [form, setForm] = useState<{
    full_name: string;
    nicknames: string[];
    dob: string;
    relationship: string;
    gender: Gender | "";
    lastPeriod: string;
    cycleLength: number;
  }>({
    full_name: "",
    nicknames: padNicknames([]),
    dob: "",
    relationship: "Friend",
    gender: "",
    lastPeriod: "",
    cycleLength: 28
  });
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = filter === "All" ? rows : rows.filter((r) => r.relationship === filter);
  const myCalc = myProfile ? buildNumerologySnapshot(myProfile.full_name, myProfile.dob) : null;

  async function add() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user || !form.full_name || !form.dob) return;
    const snap = buildNumerologySnapshot(form.full_name, form.dob);
    const cleanNicks = form.nicknames.map((n) => n.trim()).filter(Boolean);
    const dataPayload = {
      ...snap,
      gender: form.gender || undefined,
      lastPeriod: form.gender === "female" ? form.lastPeriod : undefined,
      cycleLength: form.gender === "female" ? form.cycleLength : undefined,
      nicknames: cleanNicks
    };
    const { data, error } = await supabase
      .from("numerology_others")
      .insert({
        user_id: user.id,
        full_name: form.full_name,
        nickname: cleanNicks[0] ?? "",
        dob: form.dob,
        relationship: form.relationship,
        data: dataPayload
      })
      .select()
      .single();
    if (error || !data) return;
    onChange([data, ...rows]);
    setForm({
      full_name: "",
      nicknames: padNicknames([]),
      dob: "",
      relationship: "Friend",
      gender: "",
      lastPeriod: "",
      cycleLength: 28
    });
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
          <CardBody className="border-t border-line pt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Full name (as on birth certificate)</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div><Label>DOB</Label><DatePicker value={form.dob} onChange={(next) => setForm({ ...form, dob: next })} max={new Date().toISOString().slice(0, 10)} className="w-full" inputClassName="flex-1" /></div>
              <div>
                <Label>Relationship</Label>
                <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                  {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </div>
            </div>
            <NicknameInputs
              values={form.nicknames}
              onChange={(next) => setForm({ ...form, nicknames: next })}
              compact
            />
            <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as Gender | "" })}
              >
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </Select>
            </div>
            {form.gender === "female" && (
              <>
                <div>
                  <Label>Last period start</Label>
                  <DatePicker
                    value={form.lastPeriod}
                    onChange={(next) => setForm({ ...form, lastPeriod: next })}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full"
                    inputClassName="flex-1"
                  />
                </div>
                <div>
                  <Label>Cycle length</Label>
                  <Input
                    type="number"
                    min={20}
                    max={40}
                    value={form.cycleLength}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cycleLength: Math.max(20, Math.min(40, Number(e.target.value) || 28))
                      })
                    }
                  />
                </div>
              </>
            )}
            <div className="md:col-span-4 flex justify-end">
              <Button onClick={add}>Save person</Button>
            </div>
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
              <Card
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="cursor-pointer transition hover:border-brand-400/60 hover:bg-bg-soft/40"
              >
                <CardHeader>
                  <CardTitle>
                    {r.full_name}
                    {r.nickname ? <span className="ml-2 text-xs text-fg-subtle">aka {r.nickname}</span> : null}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(r.id);
                    }}
                  >
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

      {openId ? (
        <OtherDetailModal
          row={rows.find((r) => r.id === openId) ?? null}
          myProfile={myProfile}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function OtherDetailModal({
  row,
  myProfile,
  onClose
}: {
  row: NumerologyOtherRow | null;
  myProfile: NumerologyProfileRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const snap = buildNumerologySnapshot(row.full_name, row.dob);
  const sign = getSignProfile(row.dob);
  const myCalc = myProfile ? buildNumerologySnapshot(myProfile.full_name, myProfile.dob) : null;
  const compat = myCalc ? compatibility(myCalc, snap) : null;
  const ins = advancedInsights(snap);
  const gender = genderFromData(row.data);
  const lastPeriod = lastPeriodFromData(row.data);
  const cycleLength = cycleLengthFromData(row.data);
  const cycle =
    gender === "female" && lastPeriod ? femaleCycleReading(lastPeriod, cycleLength) : null;
  const yearSign = chineseZodiacForYear();
  const yearOutlook = yearOutlookFor(snap.chinese, yearSign);

  return <OtherDetailModalContent
    row={row}
    snap={snap}
    sign={sign}
    compat={compat}
    ins={ins}
    gender={gender}
    cycle={cycle}
    yearOutlook={yearOutlook}
    yearSign={yearSign}
    onClose={onClose}
  />;
}

function OtherDetailModalContent({
  row,
  snap,
  sign,
  compat,
  ins,
  gender,
  cycle,
  yearOutlook,
  yearSign,
  onClose
}: {
  row: NumerologyOtherRow;
  snap: NumerologySnapshot;
  sign: ReturnType<typeof getSignProfile>;
  compat: ReturnType<typeof compatibility> | null;
  ins: ReturnType<typeof advancedInsights>;
  gender: Gender | "";
  cycle: ReturnType<typeof femaleCycleReading> | null;
  yearOutlook: YearCycleOutlook;
  yearSign: ChineseSign;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4 flex items-center gap-2" data-screenshot-ignore="true">
          <ScreenshotButton
            targetRef={modalRef}
            filename={`numerology-${row.full_name.replace(/\s+/g, "-").toLowerCase()}`}
            label="Save profile snapshot as PNG"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:text-fg"
            aria-label="Close detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{row.full_name}</h2>
          {row.nickname ? (
            <span className="text-xs text-fg-subtle">aka {row.nickname}</span>
          ) : null}
          <Badge>{row.relationship}</Badge>
          {gender ? (
            <Badge variant="brand">
              {gender === "prefer_not_to_say"
                ? "Prefer not to say"
                : gender === "male"
                ? "Male"
                : "Female"}
            </Badge>
          ) : null}
        </div>
        <div className="mb-5 text-xs text-fg-muted">
          Born {new Date(row.dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Western</div>
            <div className="mt-1 text-2xl">{sign.symbol} {sign.sign}</div>
            <div className="mt-1 text-xs text-fg-muted">{sign.element} · {sign.modality} · ruled by {sign.ruler}</div>
            <div className="mt-2 text-xs">{sign.tradeArchetype}</div>
          </div>
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Chinese</div>
            <div className="mt-1 text-2xl">{chineseEmoji(snap.chinese)} {snap.chinese}</div>
            <div className="mt-1 text-xs text-fg-muted">Enemy: {snap.enemyChinese}</div>
            <div className="mt-2 text-xs">{chinesePersonalityNote(snap.chinese)}</div>
          </div>
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Numerology core</div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center text-sm">
              <div><div className="text-fg-subtle text-[10px]">Life</div><div className="font-semibold">{snap.lifePath}</div></div>
              <div><div className="text-fg-subtle text-[10px]">Destiny</div><div className="font-semibold">{snap.destiny}</div></div>
              <div><div className="text-fg-subtle text-[10px]">Soul</div><div className="font-semibold">{snap.soulUrge}</div></div>
              <div><div className="text-fg-subtle text-[10px]">Personality</div><div className="font-semibold">{snap.personality}</div></div>
              <div><div className="text-fg-subtle text-[10px]">Birthday</div><div className="font-semibold">{snap.birthday}</div></div>
              <div><div className="text-fg-subtle text-[10px]">PY</div><div className="font-semibold">{snap.personalYear}</div></div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <NicknameReadings nicknames={nicknamesFromData(row.data)} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">This year ({new Date().getUTCFullYear()})</div>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${OUTLOOK_BADGE[yearOutlook].cls}`}>
              <span>{chineseEmoji(yearSign)}</span>
              <span>Year of the {yearSign}</span>
              <span>· {OUTLOOK_BADGE[yearOutlook].label}</span>
            </div>
            <div className="mt-2 text-xs text-fg-muted">
              {yearOutlook === "great"
                ? `${snap.chinese} is in a trine year — momentum on their side; lean in.`
                : yearOutlook === "good"
                ? `${snap.chinese}'s own year — solid presence; consolidate wins.`
                : yearOutlook === "challenging"
                ? `${snap.chinese} sits opposite the year — protect downside, scale slow.`
                : yearOutlook === "tough"
                ? `${snap.chinese} clashes with the year's trine — expect friction.`
                : `Average year — neither tailwind nor headwind; stay neutral.`}
            </div>
          </div>

          {compat ? (
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <div className="text-xs uppercase tracking-wide text-fg-subtle">Compatibility with you</div>
              <div className="mt-1 text-3xl font-semibold text-brand-300">
                {compat.overall}<span className="text-sm text-fg-subtle">/100</span>
              </div>
              <div className="mt-1 text-xs text-fg-muted">
                LP {compat.breakdown.lifePath} · D {compat.breakdown.destiny} · S {compat.breakdown.soulUrge} · W {compat.breakdown.western} · C {compat.breakdown.chinese}
              </div>
              {compat.notes.length > 0 && (
                <div className="mt-2 text-xs text-warn">{compat.notes.join(" · ")}</div>
              )}
            </div>
          ) : null}
        </div>

        {cycle ? (
          <div className="mt-4 rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Cycle awareness</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold capitalize">{cycle.phase}</span>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-muted">Day {cycle.dayInCycle} of {cycle.cycleLength}</span>
            </div>
            <div className="mt-2 text-xs text-fg-muted">{cycle.energy}</div>
            <div className="mt-1 text-xs">{cycle.trade}</div>
            <div className="mt-2 text-[10px] text-fg-subtle">
              Self-reflection cue only — not medical advice.
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Lifestyle harmony</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ins.useCities.map((c) => <Badge key={c} variant="success">{c}</Badge>)}
              {ins.useBrands.map((b) => <Badge key={b} variant="success">{b}</Badge>)}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Friction</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ins.avoidCities.map((c) => <Badge key={c} variant="danger">{c}</Badge>)}
              {ins.avoidBrands.map((b) => <Badge key={b} variant="danger">{b}</Badge>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type CombinedSubTab = "Today" | "General Num Database" | "Overview";

function Combined({
  profile,
  others
}: {
  profile: NumerologyProfileRow | null;
  others: NumerologyOtherRow[];
}) {
  const [sub, setSub] = useState<CombinedSubTab>("Today");
  const [filters, setFilters] = useState<NumFilters>({});

  const me = useMemo(
    () => (profile ? buildNumerologySnapshot(profile.full_name, profile.dob) : null),
    [profile]
  );
  const all = useMemo(
    () => buildCombinedProfiles(profile, others),
    [profile, others]
  );
  const filtered = useMemo(
    () => applyFilters(all, filters, me),
    [all, filters, me]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["Today", "General Num Database", "Overview"] as CombinedSubTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSub(t)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              sub === t
                ? "border-brand-400 bg-brand-500/15 text-brand-200"
                : "border-line bg-bg-soft text-fg-muted hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {sub === "Today" ? (
        <CombinedToday profile={profile} others={others} />
      ) : (
        <>
          <FilterBar filters={filters} onChange={setFilters} selfSnap={me} />
          {sub === "General Num Database" ? (
            <NumDatabase rows={filtered} selfSnap={me} />
          ) : (
            <NumOverview rows={filtered} selfSnap={me} />
          )}
        </>
      )}
    </div>
  );
}

function CombinedToday({
  profile,
  others
}: {
  profile: NumerologyProfileRow | null;
  others: NumerologyOtherRow[];
}) {
  if (!profile) {
    return (
      <Empty
        title="Save your profile first"
        description="Add your name and DOB on the My Profile tab to unlock combined readings."
      />
    );
  }
  const me = buildNumerologySnapshot(profile.full_name, profile.dob);
  const sign = getSignProfile(profile.dob);
  const moon = moonPhase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Today&apos;s combined reading</CardTitle></CardHeader>
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

function YearCycle({ profile }: { profile: NumerologyProfileRow | null }) {
  const currentYear = new Date().getUTCFullYear();
  const yearSign = chineseZodiacForYear(currentYear);
  const lastYearSign = chineseZodiacForYear(currentYear - 1);
  const nextYearSign = chineseZodiacForYear(currentYear + 1);

  const mySnap = profile ? buildNumerologySnapshot(profile.full_name, profile.dob) : null;
  const myOutlook = mySnap ? yearOutlookFor(mySnap.chinese, yearSign) : null;
  const personalTheme = mySnap ? personalYearTheme(mySnap.personalYear) : null;

  const grouped: Record<YearCycleOutlook, ChineseSign[]> = {
    great: [], good: [], average: [], tough: [], challenging: []
  };
  for (const s of ALL_CHINESE) {
    grouped[yearOutlookFor(s, yearSign)].push(s);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>This year — {yearSign}</CardTitle>
          <Sparkles className="h-4 w-4 text-brand-300" />
        </CardHeader>
        <CardBody className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
          <div className="text-center">
            <div className="text-7xl">{chineseEmoji(yearSign)}</div>
            <div className="mt-2 text-sm font-semibold">Year of the {yearSign}</div>
            <div className="text-xs text-fg-subtle">{currentYear}</div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-fg-muted">{chinesePersonalityNote(yearSign)}</p>
            {mySnap && myOutlook ? (
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${OUTLOOK_BADGE[myOutlook].cls}`}
              >
                <span className="text-base leading-none">{chineseEmoji(mySnap.chinese)}</span>
                <span>You are {mySnap.chinese}</span>
                <span>· {OUTLOOK_BADGE[myOutlook].label}</span>
              </div>
            ) : (
              <div className="text-xs text-fg-subtle">
                Save your profile on <span className="text-fg">My Profile</span> to see your outlook
                this year.
              </div>
            )}
            {mySnap ? (
              <p className="text-xs text-fg-muted">{yearOutlookReason(mySnap.chinese, yearSign)}</p>
            ) : null}
            {mySnap && personalTheme ? (
              <div className="flex items-center gap-3 rounded-lg border border-brand-400/40 bg-gradient-to-br from-brand-500/15 to-transparent p-3 text-xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-400/40 bg-brand-500/15 text-base font-semibold text-brand-200">
                  {personalTheme.number}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-fg">
                    Personal Year {personalTheme.number} · {personalTheme.title}
                  </div>
                  <div className="text-[11px] text-fg-muted">{personalTheme.focus}</div>
                </div>
              </div>
            ) : null}
            <div className="rounded-lg bg-bg-soft/40 p-3 text-[11px] text-fg-subtle">
              <span className="text-fg">Two cycles run in parallel:</span> the 12-year Chinese
              animal cycle (Rat → Pig) and the 1–9 numerology Personal Year cycle. The animal
              describes the world's energy this year; your Personal Year describes the chapter
              <em> you</em> are on inside that world.
            </div>
          </div>
        </CardBody>
      </Card>

      {personalTheme && (
        <Card>
          <CardHeader>
            <CardTitle>Your Personal Year — {personalTheme.number} · {personalTheme.title}</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-[auto,1fr] md:items-start">
            <div className="text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-400/40 bg-gradient-to-br from-brand-500/30 to-brand-500/5 text-4xl font-semibold text-brand-200">
                {personalTheme.number}
              </div>
              <div className="mt-2 text-xs text-fg-subtle">Cycle 1 → 9 → repeat</div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-fg-muted"><span className="text-fg">Vibration: </span>{personalTheme.vibration}</p>
              <p className="text-fg-muted"><span className="text-fg">Focus this year: </span>{personalTheme.focus}</p>
              <p className="text-fg-muted"><span className="text-fg">Trading lens: </span>{personalTheme.trade}</p>
              <p className="text-fg-muted"><span className="text-warn">Watch out for: </span>{personalTheme.caution}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>The 1 → 9 Personal Year cycle</CardTitle></CardHeader>
        <CardBody className="grid gap-2 md:grid-cols-3 lg:grid-cols-3">
          {PERSONAL_YEAR_CYCLE.map((t) => {
            const isYours = mySnap?.personalYear === t.number;
            return (
              <div
                key={t.number}
                className={`rounded-xl border p-3 ${
                  isYours ? "border-brand-400 bg-brand-500/10" : "border-line bg-bg-soft/40"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-semibold">{t.number}</div>
                  <div className="text-xs text-fg-subtle">{t.title}</div>
                </div>
                <div className="mt-1 text-xs text-fg-muted">{t.vibration}</div>
                <div className="mt-1 text-xs text-fg-muted">{t.focus}</div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>How every sign fares this year</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {(["great", "good", "average", "tough", "challenging"] as YearCycleOutlook[]).map((outlook) => (
            <div key={outlook} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${OUTLOOK_BADGE[outlook].cls}`}
                >
                  {OUTLOOK_BADGE[outlook].label}
                </span>
                <span className="text-[11px] text-fg-subtle">
                  {outlook === "great" && "In a trine triangle with this year's animal — energies cooperate."}
                  {outlook === "good" && "Same sign as the year — your own resonance amplified."}
                  {outlook === "average" && "Neutral relationship with this year's animal."}
                  {outlook === "tough" && "Indirect clash via the trine of your opposing sign."}
                  {outlook === "challenging" && "Direct enemy axis — opposite this year's animal on the wheel."}
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
                {grouped[outlook].length === 0 ? (
                  <span className="text-xs text-fg-subtle">—</span>
                ) : (
                  grouped[outlook].map((s) => (
                    <div
                      key={s}
                      className={`rounded-lg border p-2 text-xs ${
                        mySnap?.chinese === s
                          ? "border-brand-400 bg-brand-500/10"
                          : "border-line bg-bg-soft/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{chineseEmoji(s)}</span>
                        <span className="font-medium text-fg">{s}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-fg-muted">
                        {yearOutlookReason(s, yearSign)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cycle bridge: last → this → next</CardTitle></CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-3">
          {[
            { year: currentYear - 1, sign: lastYearSign, label: "Last year" },
            { year: currentYear, sign: yearSign, label: "This year" },
            { year: currentYear + 1, sign: nextYearSign, label: "Next year" }
          ].map(({ year, sign, label }) => (
            <div
              key={year}
              className={`rounded-xl border p-4 ${
                year === currentYear ? "border-brand-400 bg-brand-500/10" : "border-line bg-bg-soft/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl">{chineseEmoji(sign)}</span>
                <div>
                  <div className="font-semibold">{sign}</div>
                  <div className="text-xs text-fg-subtle">{year}</div>
                </div>
              </div>
              {mySnap && (
                <div
                  className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${OUTLOOK_BADGE[yearOutlookFor(mySnap.chinese, sign)].cls}`}
                >
                  {OUTLOOK_BADGE[yearOutlookFor(mySnap.chinese, sign)].label}
                </div>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Number frequencies & vibrations</CardTitle></CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {NUMBER_VIBRATIONS.map((v) => {
            const isYours =
              !!mySnap &&
              (v.number === mySnap.lifePath || v.number === mySnap.personalYear);
            return (
              <div
                key={v.number}
                className={`rounded-xl border p-3 ${
                  isYours ? "border-brand-400 bg-brand-500/10" : "border-line bg-bg-soft/40"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-semibold">{v.number}</div>
                  <div className="text-xs text-fg-subtle">{v.title}</div>
                </div>
                <div className="mt-1 text-xs text-fg-muted">{v.vibration}</div>
                <div className="mt-2 text-xs">
                  <span className="text-success">Use:</span> {v.use}
                </div>
                <div className="mt-1 text-xs">
                  <span className="text-warn">Caution:</span> {v.caution}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>How to use numbers in your favour</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>
            Anchor key decisions to your <span className="text-fg">Personal Year</span>{" "}
            {mySnap ? mySnap.personalYear : "(unknown — save your profile)"}
            : align launches, big trades and money moves with the theme of that number.
          </p>
          <p>
            Reduce relevant dates (entries, deposits, signings) to a single digit and check
            harmony against your Life Path. Numbers in the same harmony group amplify; clashes
            warn you to slow down.
          </p>
          <p>
            Use the year animal as a cultural overlay: this {currentYear} the energy of the{" "}
            <span className="text-fg">{yearSign}</span> rewards{" "}
            {yearSign === "Horse"
              ? "speed, mobility and brave moves — but not chaos."
              : yearSign === "Dragon"
              ? "ambition and visibility — show up bigger than you feel."
              : "the qualities described above."}
          </p>
          <p className="text-[11px] text-fg-subtle">
            Frameworks, not predictions. Use as a journaling lens.
          </p>
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

function LawsView() {
  return (
    <div className="space-y-8">
      <SectionBanner
        accent="brand"
        eyebrow="Section · 01"
        title="Laws of the Universe"
        count={UNIVERSAL_LAWS.length}
        body="Twelve universal laws distilled from hermetic and wisdom traditions. Treat them as lenses for self-awareness — not financial or medical advice. They apply to all of life, not just trading."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {UNIVERSAL_LAWS.map((law) => <LawCard key={law.name} law={law} accent="brand" />)}
      </div>

      <SectionBanner
        accent="warn"
        eyebrow="Section · 02"
        title="Laws of the Sea (Vibration & Manifestation)"
        count={MARITIME_LAWS.length}
        body={"The body is roughly 60% water, and water reorganises around sound, emotion and intention. These are the laws that govern how that water — and therefore *you* — vibrates, resonates and ultimately manifests reality. Treat them as the operating manual for the version of you that's still coming."}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {MARITIME_LAWS.map((law) => <LawCard key={law.name} law={law} accent="warn" />)}
      </div>
    </div>
  );
}

/**
 * Visually distinct section header used at the top of each Laws group, so the
 * heading reads as a divider rather than a dim card floating among the law
 * cards beneath it.
 */
function SectionBanner({
  accent,
  eyebrow,
  title,
  body,
  count
}: {
  accent: "brand" | "warn";
  eyebrow: string;
  title: string;
  body: string;
  count: number;
}) {
  const palette =
    accent === "brand"
      ? {
          ring: "border-brand-500/40",
          glow: "from-brand-500/30 via-brand-500/15 to-bg",
          chipText: "text-brand-200",
          chipBorder: "border-brand-400/40",
          chipBg: "bg-brand-500/10",
          accentBar: "bg-gradient-to-b from-brand-300 via-brand-500 to-brand-700"
        }
      : {
          ring: "border-warn/40",
          glow: "from-warn/30 via-warn/15 to-bg",
          chipText: "text-warn",
          chipBorder: "border-warn/40",
          chipBg: "bg-warn/10",
          accentBar: "bg-gradient-to-b from-warn via-warn/80 to-warn/50"
        };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${palette.ring} bg-gradient-to-br ${palette.glow} px-5 py-5 sm:px-6 sm:py-6`}
    >
      <div className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${palette.accentBar}`} aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pl-3">
          <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.chipText}`}>
            {eyebrow}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-[26px]">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-fg-muted">{body}</p>
        </div>
        <div
          className={`shrink-0 rounded-full border ${palette.chipBorder} ${palette.chipBg} px-3 py-1 text-xs font-medium ${palette.chipText}`}
        >
          {count} law{count === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

function LawCard({ law, accent }: { law: LawEntry; accent: "brand" | "warn" }) {
  const numCls =
    accent === "brand"
      ? "border-brand-400/40 bg-gradient-to-br from-brand-500/25 to-brand-500/5 text-brand-200"
      : "border-warn/40 bg-gradient-to-br from-warn/25 to-warn/5 text-warn";
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-fg">{law.name}</div>
            <div className="text-xs text-fg-muted">{law.oneLiner}</div>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base font-semibold ${numCls}`}>
            §
          </div>
        </div>
        <div className="rounded-lg border border-line bg-bg-soft/40 p-3 text-xs text-fg-muted">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-fg-subtle">Meaning</div>
          {law.meaning}
        </div>
        <div className="rounded-lg border border-line bg-bg-soft/40 p-3 text-xs text-fg-muted">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-fg-subtle">How to use it</div>
          {law.use}
        </div>
      </CardBody>
    </Card>
  );
}

function GalaxyVisual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-48 overflow-hidden rounded-2xl border border-line shadow-inner md:h-full ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 30% 30%, rgba(120,89,219,0.55) 0%, rgba(60,30,120,0.35) 30%, rgba(8,6,24,0.95) 65%, #050313 100%)"
        }}
      />
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 70% 65%, rgba(255,160,200,0.35), transparent 60%), radial-gradient(ellipse 60% 40% at 25% 70%, rgba(80,200,255,0.25), transparent 65%)"
        }}
      />
      <div className="absolute inset-0 opacity-90" style={{ background: galaxyStarsLayer1() }} />
      <div className="absolute inset-0 opacity-70" style={{ background: galaxyStarsLayer2() }} />
      <div className="absolute inset-0 animate-galaxy-twinkle opacity-80" style={{ background: galaxyStarsLayer3() }} />
      <div className="absolute inset-x-0 bottom-0 p-3 text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
        cosmos · gēnēsis
      </div>
    </div>
  );
}

function galaxyStarsLayer1(): string {
  const stars = [
    [12, 18], [88, 22], [42, 9], [73, 14], [25, 41], [60, 35], [90, 55],
    [8, 60], [33, 78], [55, 85], [78, 72], [18, 88], [66, 6], [50, 50],
    [4, 32], [97, 41]
  ];
  return stars
    .map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.95) 0px, rgba(255,255,255,0) 1.4px)`) 
    .join(",");
}

function galaxyStarsLayer2(): string {
  const stars = [
    [22, 30], [70, 20], [82, 40], [38, 55], [12, 70], [58, 62], [85, 80],
    [30, 88], [46, 28], [68, 48], [6, 18], [94, 64], [16, 50], [74, 90]
  ];
  return stars
    .map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(220,200,255,0.7) 0px, rgba(220,200,255,0) 1px)`) 
    .join(",");
}

function galaxyStarsLayer3(): string {
  const stars = [
    [9, 9], [49, 13], [83, 30], [28, 60], [62, 75], [40, 92], [88, 12],
    [14, 42], [76, 58]
  ];
  return stars
    .map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,236,180,0.95) 0px, rgba(255,236,180,0) 1.7px)`) 
    .join(",");
}
