"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { cn } from "@/lib/utils";
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
import {
  CHINESE_SIGN_TRAITS,
  LIFE_PATH_TRAITS,
  WESTERN_SIGN_TRAITS
} from "@/lib/numerology/traits";
import {
  LIFE_PATH_STONES,
  WESTERN_SIGN_STONES,
  CHINESE_SIGN_STONES,
  type GemstoneRecommendation
} from "@/lib/numerology/gemstones";
import type { NumerologyOtherRow, NumerologyProfileRow } from "@/lib/supabase/types";
import { Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  applyFilters,
  buildCombinedProfiles,
  type NumFilters
} from "@/lib/numerology/filters";
import { FilterBar } from "@/components/numerology/filter-bar";
import { NumDatabase } from "@/components/numerology/num-database";
import { NumOverview } from "@/components/numerology/num-overview";

type Gender = "male" | "female" | "prefer_not_to_say";

type NumerologyOtherUpdate = {
  full_name?: string;
  dob?: string;
  relationship?: string;
  gender?: Gender | "";
  nicknames?: string[];
};

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
        <Combined profile={my} others={others} onChangeOthers={setOthers} />
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

          <BirthChartSnapshot
            fullName={name}
            dob={dob}
            sign={sign}
            snapshot={snapshot}
          />

          <GemstonesCard
            lifePath={snapshot.lifePath}
            western={sign.sign}
            chinese={snapshot.chinese}
          />
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
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase
      .from("numerology_others")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("Failed to delete numerology profile", error);
      if (typeof window !== "undefined") {
        window.alert(`Failed to delete: ${error.message}`);
      }
      return;
    }
    onChange(rows.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
  }

  async function update(id: string, patch: NumerologyOtherUpdate) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const target = rows.find((r) => r.id === id);
    if (!target) return null;

    const nextFullName = patch.full_name ?? target.full_name;
    const nextDob = patch.dob ?? target.dob;
    const nextRelationship = patch.relationship ?? target.relationship;
    const nextGender = patch.gender ?? genderFromData(target.data);
    const nextNicknames =
      patch.nicknames ?? nicknamesFromData(target.data);

    const snap = buildNumerologySnapshot(nextFullName, nextDob);
    const cleanNicks = nextNicknames.map((n) => n.trim()).filter(Boolean);
    const dataPayload = {
      ...snap,
      gender: nextGender || undefined,
      lastPeriod:
        nextGender === "female" ? lastPeriodFromData(target.data) : undefined,
      cycleLength:
        nextGender === "female" ? cycleLengthFromData(target.data) : undefined,
      nicknames: cleanNicks
    };

    const { data, error } = await supabase
      .from("numerology_others")
      .update({
        full_name: nextFullName,
        nickname: cleanNicks[0] ?? "",
        dob: nextDob,
        relationship: nextRelationship,
        data: dataPayload
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error || !data) {
      console.error("Failed to update numerology profile", error);
      if (typeof window !== "undefined") {
        window.alert(`Failed to update: ${error?.message ?? "unknown"}`);
      }
      return null;
    }
    onChange(rows.map((r) => (r.id === id ? data : r)));
    return data;
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
          onUpdate={async (patch) => {
            const next = await update(openId, patch);
            return next;
          }}
          onDelete={async () => {
            await remove(openId);
          }}
        />
      ) : null}
    </div>
  );
}

function OtherDetailModal({
  row,
  myProfile,
  onClose,
  onUpdate,
  onDelete
}: {
  row: NumerologyOtherRow | null;
  myProfile: NumerologyProfileRow | null;
  onClose: () => void;
  onUpdate: (patch: NumerologyOtherUpdate) => Promise<NumerologyOtherRow | null>;
  onDelete: () => Promise<void>;
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
    onUpdate={onUpdate}
    onDelete={onDelete}
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
  onClose,
  onUpdate,
  onDelete
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
  onUpdate: (patch: NumerologyOtherUpdate) => Promise<NumerologyOtherRow | null>;
  onDelete: () => Promise<void>;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    full_name: row.full_name,
    dob: row.dob,
    relationship: row.relationship,
    gender: gender as Gender | "",
    nicknames: padNicknames(nicknamesFromData(row.data))
  });
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      full_name: row.full_name,
      dob: row.dob,
      relationship: row.relationship,
      gender: genderFromData(row.data),
      nicknames: padNicknames(nicknamesFromData(row.data))
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const patch: NumerologyOtherUpdate = {
      full_name: draft.full_name,
      dob: draft.dob,
      relationship: draft.relationship,
      gender: draft.gender,
      nicknames: draft.nicknames
    };
    const next = await onUpdate(patch);
    setSaving(false);
    if (next) setEditing(false);
  }

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
          {editing ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={saveEdit}
                disabled={saving || !draft.full_name || !draft.dob}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:border-brand-400/60 hover:text-brand-200"
                aria-label="Edit profile"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <ScreenshotButton
                targetRef={modalRef}
                filename={`numerology-${row.full_name.replace(/\s+/g, "-").toLowerCase()}`}
                label="Save profile snapshot as PNG"
              />
              <button
                type="button"
                onClick={() => onDelete()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:border-danger/60 hover:text-danger"
                aria-label="Delete profile"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:text-fg"
                aria-label="Close detail"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {editing && (
          <div className="mb-5 space-y-3 rounded-2xl border border-brand-400/40 bg-brand-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-brand-200">Edit profile</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Full name</Label>
                <Input
                  value={draft.full_name}
                  onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>DOB</Label>
                <DatePicker
                  value={draft.dob}
                  onChange={(next) => setDraft({ ...draft, dob: next })}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full"
                  inputClassName="flex-1"
                />
              </div>
              <div>
                <Label>Relationship</Label>
                <Select
                  value={draft.relationship}
                  onChange={(e) => setDraft({ ...draft, relationship: e.target.value })}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={draft.gender}
                  onChange={(e) =>
                    setDraft({ ...draft, gender: e.target.value as Gender | "" })
                  }
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Select>
              </div>
            </div>
            <NicknameInputs
              values={draft.nicknames}
              onChange={(next) => setDraft({ ...draft, nicknames: next })}
              compact
            />
          </div>
        )}

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

        <div className="mt-4 space-y-4">
          <BirthChartSnapshot
            fullName={row.full_name}
            dob={row.dob}
            sign={sign}
            snapshot={snap}
          />
          <GemstonesCard
            lifePath={snap.lifePath}
            western={sign.sign}
            chinese={snap.chinese}
          />
        </div>
      </div>
    </div>
  );
}

type CombinedSubTab = "Today" | "General Num Database" | "Overview";

function Combined({
  profile,
  others,
  onChangeOthers
}: {
  profile: NumerologyProfileRow | null;
  others: NumerologyOtherRow[];
  onChangeOthers: (rows: NumerologyOtherRow[]) => void;
}) {
  const [sub, setSub] = useState<CombinedSubTab>("Today");
  const [filters, setFilters] = useState<NumFilters>({});
  const [openId, setOpenId] = useState<string | null>(null);

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

  async function removeOther(id: string) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase
      .from("numerology_others")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("Failed to delete numerology profile", error);
      if (typeof window !== "undefined") window.alert(`Failed to delete: ${error.message}`);
      return;
    }
    onChangeOthers(others.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
  }

  async function updateOther(id: string, patch: NumerologyOtherUpdate): Promise<NumerologyOtherRow | null> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const target = others.find((r) => r.id === id);
    if (!target) return null;

    const nextFullName = patch.full_name ?? target.full_name;
    const nextDob = patch.dob ?? target.dob;
    const nextRelationship = patch.relationship ?? target.relationship;
    const nextGender = patch.gender ?? genderFromData(target.data);
    const nextNicknames = patch.nicknames ?? nicknamesFromData(target.data);

    const snap = buildNumerologySnapshot(nextFullName, nextDob);
    const cleanNicks = nextNicknames.map((n) => n.trim()).filter(Boolean);
    const dataPayload = {
      ...snap,
      gender: nextGender || undefined,
      lastPeriod: nextGender === "female" ? lastPeriodFromData(target.data) : undefined,
      cycleLength: nextGender === "female" ? cycleLengthFromData(target.data) : undefined,
      nicknames: cleanNicks
    };

    const { data, error } = await supabase
      .from("numerology_others")
      .update({
        full_name: nextFullName,
        nickname: cleanNicks[0] ?? "",
        dob: nextDob,
        relationship: nextRelationship,
        data: dataPayload
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error || !data) {
      console.error("Failed to update numerology profile", error);
      if (typeof window !== "undefined") window.alert(`Failed to update: ${error?.message ?? "unknown"}`);
      return null;
    }
    onChangeOthers(others.map((r) => (r.id === id ? data : r)));
    return data;
  }

  const openRow = openId ? others.find((r) => r.id === openId) ?? null : null;

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
            <NumDatabase rows={filtered} selfSnap={me} onSelectProfile={(id) => setOpenId(id)} />
          ) : (
            <NumOverview rows={filtered} selfSnap={me} onSelectProfile={(id) => setOpenId(id)} />
          )}
        </>
      )}

      {openRow ? (
        <OtherDetailModal
          row={openRow}
          myProfile={profile}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => updateOther(openRow.id, patch)}
          onDelete={async () => {
            await removeOther(openRow.id);
          }}
        />
      ) : null}
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

      <WesternZodiacTraitsCard />
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

      <ChineseZodiacTraitsCard />

      <LifePathTraitsCard mineLifePath={mySnap?.lifePath ?? null} />

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
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Block title="Cities to use" items={ins.useCities} variant="success" />
          <Block title="Cities to avoid" items={ins.avoidCities} variant="danger" />
          <Block title="Brands to use" items={ins.useBrands} variant="success" />
          <Block title="Brands to avoid" items={ins.avoidBrands} variant="danger" />
          <Block title="Cars to use" items={ins.useCars} variant="success" />
          <Block title="Cars to avoid" items={ins.avoidCars} variant="danger" />
          <Block title="Private jets to use" items={ins.useJets} variant="success" />
          <Block title="Private jets to avoid" items={ins.avoidJets} variant="danger" />
        </CardBody>
      </Card>

      <ReflectionPromptsCard profileId={profile.id} fullName={profile.full_name} />
    </div>
  );
}

/**
 * Reflection prompts card — stores the user's free-form journal entry
 * locally (per profile id) so it survives navigation / refresh, with
 * explicit Save / Edit / Download / Screenshot affordances. We keep
 * storage local rather than server-side at this stage because a
 * reflections schema isn't worth a migration round-trip yet — the
 * user can copy-export to the Notebook scratchpad once they're ready
 * to commit.
 */
function ReflectionPromptsCard({
  profileId,
  fullName
}: {
  profileId: string;
  fullName: string;
}) {
  const storageKey = `numerology.reflections.${profileId}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [editing, setEditing] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  // Hydrate from localStorage on first mount and whenever the active
  // profile changes (Calculate For Others swaps profiles in place).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        setText(raw);
        setSavedText(raw);
        // If the user already has saved content, default to read mode
        // so the card renders the saved entry instead of an empty
        // edit field — they can click Edit to amend.
        setEditing(raw.length === 0);
      } else {
        setText("");
        setSavedText("");
        setEditing(true);
      }
    } catch {
      // localStorage may be unavailable in some embedded contexts —
      // fall back to in-memory only.
    }
  }, [storageKey]);

  function save() {
    try {
      window.localStorage.setItem(storageKey, text);
    } catch {
      // ignore storage failures — text remains in component state
    }
    setSavedText(text);
    setEditing(false);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1400);
  }

  function downloadTxt() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeName = fullName.replace(/[^A-Za-z0-9_-]+/g, "_");
    const blob = new Blob([editing ? text : savedText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `numerology-reflections-${safeName}-${stamp}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card>
      <div ref={cardRef}>
        <CardHeader>
          <CardTitle>Reflection prompts</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {editing ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write what came up reading the above…"
              rows={8}
            />
          ) : (
            <div className="min-h-[160px] whitespace-pre-wrap rounded-xl border border-line bg-bg/40 p-3 text-sm text-fg">
              {savedText || (
                <span className="text-fg-subtle">
                  Nothing saved yet — click Edit to start a reflection.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button onClick={save} disabled={text === savedText}>
                  {saveState === "saved" ? "Saved" : "Save"}
                </Button>
                {savedText.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setText(savedText);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" onClick={downloadTxt}>
              Download .txt
            </Button>
            <ScreenshotButton
              targetRef={cardRef as RefObject<HTMLElement>}
              filename={`numerology-reflections-${fullName.replace(/[^A-Za-z0-9_-]+/g, "_")}`}
              label="Save reflection as PNG"
            />
          </div>

          <div className="text-[11px] text-fg-subtle">
            Saved locally to this device per profile. Use Download .txt to keep
            a copy or paste it into the Notebook → Scratchpad.
          </div>
        </CardBody>
      </div>
    </Card>
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

      <Card>
        <CardHeader>
          <CardTitle>How to navigate your Personal Year cycle</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p className="text-xs text-fg-muted">
            Personal Years move in a 9-year cycle. Each year carries a different rhythm — knowing
            yours lets you plan your trading, capital deployment, and growth bets to flow with it
            instead of against it. Pair this with the Chinese-zodiac year context (whether you're
            in your animal's <span className="text-emerald-300">great</span>,{" "}
            <span className="text-amber-300">average</span>, or <span className="text-rose-300">tough</span>{" "}
            year) for a richer read.
          </p>

          <PersonalYearGuidance
            tone="great"
            title="A great Personal Year (1, 3, 5, 8 — or harmony with your zodiac year)"
            blurb={
              "Energy is on your side. Markets feel cooperative, opportunities cluster, and " +
              "your reads land more often. Don't waste it: this is when to scale up the strategies " +
              "you've already proven, raise position size on your best edges, and take calculated " +
              "swings rather than coast."
            }
            tradingDos={[
              "Up-size your A+ setups by ~25–50%; these are the months your edge compounds",
              "Open or fund the prop firm / live account you've been hesitating on",
              "Lock in a quarterly profit-pull schedule — the wins are real, take some off the table",
              "Document what's working — these patterns become your baseline for tougher years"
            ]}
            tradingDonts={[
              "Don't get cocky and abandon your stop-loss / risk rules — euphoria-trading kills good years",
              "Don't add 5 new strategies because everything looks bullish; stick to your edge",
              "Don't assume next year's energy carries the same — bank gains while the cycle is hot"
            ]}
          />

          <PersonalYearGuidance
            tone="average"
            title="An average / neutral Personal Year (2, 4, 6 — or steady zodiac year)"
            blurb={
              "Nothing dramatic — markets feel mixed, results sit close to expectancy, and " +
              "patience pays better than aggression. This is the cycle for craft, study, and " +
              "infrastructure: backtesting, system refinement, journal review, and skill building."
            }
            tradingDos={[
              "Hold position size at baseline — this isn't the year to push leverage",
              "Spend dedicated time on backtesting + reviewing past trades for pattern leaks",
              "Tighten risk rules and rebuild discipline that may have slipped in a hot year",
              "Keep a steady cadence — small consistent wins beat moonshots in a 4 / 6 year"
            ]}
            tradingDonts={[
              "Don't force trades because you 'should be making more' — the cycle is the cycle",
              "Don't compare your P&L to a Personal-Year-1 trader's — different fuel",
              "Don't abandon your plan because it feels boring; that's exactly the test of the year"
            ]}
          />

          <PersonalYearGuidance
            tone="tough"
            title="A tough Personal Year (7, 9 — or zodiac conflict / Tai Sui year)"
            blurb={
              "Headwinds and reflection. 7s slow you down for inner work; 9s close cycles and " +
              "force letting-go. Markets may feel choppy, your usual setups misfire more often, " +
              "and emotional discipline is harder. Default to capital preservation; this is the " +
              "year you protect what you built so you have a base to scale from in your next 1-year."
            }
            tradingDos={[
              "Cut size by 25–50%; risk less to feel less drawdown pressure",
              "Reduce trade frequency — fewer, higher-conviction setups only",
              "Keep an absolute monthly drawdown cutoff and honour it",
              "Use the slower energy for journaling, deep review, and rebuilding your edge",
              "If you're in a zodiac-conflict year (Tai Sui), wear your zodiac amulet daily and avoid major financial commitments at peak conflict months"
            ]}
            tradingDonts={[
              "Don't revenge-trade after losing weeks — the cycle amplifies emotional reactions",
              "Don't take on big new prop firm challenges with hard time-bound rules",
              "Don't add leverage 'to make it back' — leverage in a 7/9 year typically blows accounts",
              "Don't make permanent commitments (long-term contracts, partnerships) at the year's lowest months"
            ]}
          />

          <p className="text-[11px] italic text-fg-subtle">
            These are guidance heuristics rooted in numerology + Chinese-zodiac tradition — not
            investment advice. Use them alongside your edge, your journal, and your own risk
            framework.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function PersonalYearGuidance({
  tone,
  title,
  blurb,
  tradingDos,
  tradingDonts
}: {
  tone: "great" | "average" | "tough";
  title: string;
  blurb: string;
  tradingDos: string[];
  tradingDonts: string[];
}) {
  const toneClass =
    tone === "great"
      ? "border-emerald-400/40 bg-emerald-500/5"
      : tone === "average"
        ? "border-amber-400/40 bg-amber-500/5"
        : "border-rose-400/40 bg-rose-500/5";
  const toneTextClass =
    tone === "great" ? "text-emerald-200" : tone === "average" ? "text-amber-200" : "text-rose-200";
  return (
    <div className={cn("rounded-xl border p-3", toneClass)}>
      <div className={cn("text-xs font-semibold", toneTextClass)}>{title}</div>
      <p className="mt-1.5 text-xs text-fg-muted">{blurb}</p>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">Lean in</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-fg-muted marker:text-emerald-400/60">
            {tradingDos.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/80">Avoid</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-fg-muted marker:text-rose-400/60">
            {tradingDonts.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
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

/**
 * Birth Chart Snapshot — a DOB-only natal chart preview. We don't yet
 * collect birth time / place, so we render the placements that are
 * derivable from date alone (Sun, slow planets, numerology layer) and
 * label the time-dependent placements (Moon, Ascendant, Houses) as
 * needing additional data. Once a birth-time / location migration
 * lands the same component will accept those props and switch to a
 * full ephemeris compute.
 */
function BirthChartSnapshot({
  fullName,
  dob,
  sign,
  snapshot
}: {
  fullName: string;
  dob: string;
  sign: { sign: string; element: string; modality: string; ruler: string; symbol: string };
  snapshot: { lifePath: number; personalYear: number; chinese: string; destiny: number; soulUrge: number; personality: number };
}) {
  // Slow-planet sign placements derivable from DOB alone — these
  // bodies move so slowly that the date is sufficient resolution.
  // Tables span 1900–2050; out-of-range DOBs (e.g. before 1882 for
  // Pluto) return null and the row is rendered as "—" so we never
  // silently surface a wrong sign.
  const dobDate = new Date(`${dob}T12:00:00Z`);
  // Decimal year as the fraction of the calendar year already elapsed,
  // computed against the actual year length so Dec 31 always lands on
  // ~year+0.997 (never overflows into the next year and never
  // double-counts month+day like a naïve `m/12 + d/365.25` formula).
  const yearDecimal = (() => {
    const y = dobDate.getUTCFullYear();
    const startOfYear = Date.UTC(y, 0, 1);
    const startOfNext = Date.UTC(y + 1, 0, 1);
    return y + (dobDate.getTime() - startOfYear) / (startOfNext - startOfYear);
  })();
  const jupiter = jupiterSign(yearDecimal);
  const saturn = saturnSign(yearDecimal);
  const uranus = uranusSign(yearDecimal);
  const neptune = neptuneSign(yearDecimal);
  const pluto = plutoSign(yearDecimal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Birth chart snapshot — {fullName}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        <p className="text-xs text-fg-muted">
          A natal chart preview using everything derivable from your date of
          birth. Time-of-birth-only placements (Moon, Ascendant, House cusps,
          Midheaven) need your birth time and city to compute precisely —
          adding those is on the roadmap.
        </p>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ChartCell label="Sun (Western)" value={`${sign.sign} ${sign.symbol}`} note={`${sign.element} · ${sign.modality} · ruled by ${sign.ruler}`} />
          <ChartCell label="Chinese animal" value={snapshot.chinese} />
          <ChartCell label="Life Path" value={String(snapshot.lifePath)} />
          <ChartCell label="Destiny" value={String(snapshot.destiny)} />
          <ChartCell label="Soul Urge" value={String(snapshot.soulUrge)} />
          <ChartCell label="Personality" value={String(snapshot.personality)} />
          <ChartCell label="Personal Year" value={String(snapshot.personalYear)} />
          <ChartCell label="Jupiter" value={jupiter ?? "—"} note={jupiter ? "Expansion / luck cycle (~1 yr / sign)" : "Out of supported range"} />
          <ChartCell label="Saturn" value={saturn ?? "—"} note={saturn ? "Discipline / structure cycle (~2.5 yr / sign)" : "Out of supported range"} />
          <ChartCell label="Uranus" value={uranus ?? "—"} note={uranus ? "Generational — ~7 yr / sign" : "Out of supported range"} />
          <ChartCell label="Neptune" value={neptune ?? "—"} note={neptune ? "Generational — ~14 yr / sign" : "Out of supported range"} />
          <ChartCell label="Pluto" value={pluto ?? "—"} note={pluto ? "Generational — ~12–30 yr / sign" : "Out of supported range"} />
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-fg-muted">
          <span className="font-medium text-amber-200">Time-of-birth required:</span>{" "}
          Moon sign, Ascendant (Rising), Midheaven, House placements and exact
          inner-planet degrees all need your birth time and birthplace. Add
          them on the profile editor when that field ships.
        </div>
      </CardBody>
    </Card>
  );
}

function ChartCell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-fg">{value}</div>
      {note ? <div className="mt-1 text-[11px] text-fg-muted">{note}</div> : null}
    </div>
  );
}

// Slow-planet sign at a given decimal-year DOB.
//
// We hand-curate the historical ingress tables (~1900 onwards) rather
// than computing from formulas because the eccentric orbits of the
// outer planets — especially Pluto — make formula-based approximations
// drift by a full sign during retrograde-driven dance years. Each
// table entry below is the *final* (post-retrograde) astrological
// ingress date; the rare "born during a retrograde dance" case is
// resolved to the dominant outer placement, which is the correct
// behaviour for a date-only chart preview.
//
// signFromTable returns null when the requested year predates the
// table — callers must surface that as an honest "data unavailable"
// state rather than a silent fallback.
function jupiterSign(year: number): string | null {
  const ingresses: Array<[number, string]> = [
    [1900.05, "Sagittarius"], [1901.0, "Capricorn"], [1902.05, "Aquarius"],
    [1903.15, "Pisces"], [1904.18, "Aries"], [1905.18, "Taurus"],
    [1906.3, "Gemini"], [1907.4, "Cancer"], [1908.5, "Leo"],
    [1909.55, "Virgo"], [1910.55, "Libra"], [1911.7, "Scorpio"],
    [1912.85, "Sagittarius"], [1913.95, "Capricorn"], [1915.05, "Aquarius"],
    [1916.13, "Pisces"], [1917.13, "Aries"], [1918.13, "Taurus"],
    [1919.25, "Gemini"], [1920.4, "Cancer"], [1921.5, "Leo"],
    [1922.6, "Virgo"], [1923.65, "Libra"], [1924.65, "Scorpio"],
    [1925.85, "Sagittarius"], [1926.95, "Capricorn"], [1928.05, "Aquarius"],
    [1929.07, "Pisces"], [1930.05, "Aries"], [1931.05, "Taurus"],
    [1932.25, "Gemini"], [1933.35, "Cancer"], [1934.45, "Leo"],
    [1935.55, "Virgo"], [1936.6, "Libra"], [1937.85, "Scorpio"],
    [1938.93, "Sagittarius"], [1940.0, "Capricorn"], [1941.05, "Aquarius"],
    [1942.05, "Pisces"], [1943.05, "Aries"], [1944.05, "Taurus"],
    [1945.25, "Gemini"], [1946.4, "Cancer"], [1947.55, "Leo"],
    [1948.6, "Virgo"], [1949.6, "Libra"], [1950.7, "Scorpio"],
    [1951.85, "Sagittarius"], [1952.95, "Capricorn"], [1954.0, "Aquarius"],
    [1955.05, "Pisces"], [1956.05, "Aries"], [1957.05, "Taurus"],
    [1958.18, "Gemini"], [1959.3, "Cancer"], [1960.45, "Leo"],
    [1961.55, "Virgo"], [1962.6, "Libra"], [1963.65, "Scorpio"],
    [1964.85, "Sagittarius"], [1965.95, "Capricorn"], [1967.05, "Aquarius"],
    [1968.05, "Pisces"], [1969.05, "Aries"], [1970.05, "Taurus"],
    [1971.18, "Gemini"], [1972.3, "Cancer"], [1973.45, "Leo"],
    [1974.5, "Virgo"], [1975.55, "Libra"], [1976.7, "Scorpio"],
    [1977.85, "Sagittarius"], [1978.95, "Capricorn"], [1980.0, "Aquarius"],
    [1981.05, "Pisces"], [1982.0, "Aries"], [1983.05, "Taurus"],
    [1984.18, "Gemini"], [1985.3, "Cancer"], [1986.45, "Leo"],
    [1987.5, "Virgo"], [1988.55, "Libra"], [1989.65, "Scorpio"],
    [1990.85, "Sagittarius"], [1991.93, "Capricorn"], [1993.0, "Aquarius"],
    [1994.05, "Pisces"], [1995.05, "Aries"], [1996.05, "Taurus"],
    [1997.18, "Gemini"], [1998.3, "Cancer"], [1999.45, "Leo"],
    [2000.5, "Virgo"], [2001.55, "Libra"], [2002.65, "Scorpio"],
    [2003.85, "Sagittarius"], [2004.95, "Capricorn"], [2006.0, "Aquarius"],
    [2007.05, "Pisces"], [2008.0, "Aries"], [2009.05, "Taurus"],
    [2010.18, "Gemini"], [2011.3, "Cancer"], [2012.45, "Leo"],
    [2013.5, "Virgo"], [2014.55, "Libra"], [2015.7, "Scorpio"],
    [2016.85, "Sagittarius"], [2017.95, "Capricorn"], [2019.0, "Aquarius"],
    [2020.05, "Pisces"], [2021.05, "Aries"], [2022.05, "Taurus"],
    [2023.18, "Gemini"], [2024.3, "Cancer"], [2025.45, "Leo"],
    [2026.5, "Virgo"], [2027.55, "Libra"], [2028.7, "Scorpio"],
    [2029.85, "Sagittarius"], [2030.95, "Capricorn"]
  ];
  return signFromTable(year, ingresses);
}

function saturnSign(year: number): string | null {
  // Saturn ~2.5 yr per sign. Final-ingress dates back to 1900.
  const ingresses: Array<[number, string]> = [
    [1900.05, "Sagittarius"], [1903.05, "Capricorn"], [1905.4, "Aquarius"],
    [1908.2, "Pisces"], [1910.95, "Aries"], [1913.25, "Taurus"],
    [1915.6, "Gemini"], [1917.8, "Cancer"], [1919.7, "Leo"],
    [1921.7, "Virgo"], [1923.95, "Libra"], [1924.2, "Scorpio"],
    [1926.95, "Sagittarius"], [1929.95, "Capricorn"], [1932.15, "Aquarius"],
    [1935.15, "Pisces"], [1937.3, "Aries"], [1939.45, "Taurus"],
    [1942.4, "Gemini"], [1944.45, "Cancer"], [1946.6, "Leo"],
    [1948.75, "Virgo"], [1950.8, "Libra"], [1953.8, "Scorpio"],
    [1956.04, "Sagittarius"], [1959.0, "Capricorn"], [1962.0, "Aquarius"],
    [1964.25, "Pisces"], [1967.18, "Aries"], [1969.32, "Taurus"],
    [1971.46, "Gemini"], [1973.58, "Cancer"], [1975.71, "Leo"],
    [1977.87, "Virgo"], [1980.72, "Libra"], [1982.91, "Scorpio"],
    [1985.88, "Sagittarius"], [1988.13, "Capricorn"], [1991.1, "Aquarius"],
    [1993.39, "Pisces"], [1996.27, "Aries"], [1998.45, "Taurus"],
    [2000.6, "Gemini"], [2003.42, "Cancer"], [2005.55, "Leo"],
    [2007.67, "Virgo"], [2009.83, "Libra"], [2012.79, "Scorpio"],
    [2014.96, "Sagittarius"], [2017.95, "Capricorn"], [2020.95, "Aquarius"],
    [2023.2, "Pisces"], [2025.4, "Aries"], [2028.5, "Taurus"],
    [2030.55, "Gemini"]
  ];
  return signFromTable(year, ingresses);
}

function uranusSign(year: number): string | null {
  // Uranus ~7 yr per sign. Final-ingress dates back to 1900.
  const ingresses: Array<[number, string]> = [
    [1898.0, "Sagittarius"], [1904.92, "Capricorn"], [1912.08, "Aquarius"],
    [1919.25, "Pisces"], [1927.25, "Aries"], [1934.43, "Taurus"],
    [1941.65, "Gemini"], [1948.66, "Cancer"], [1955.65, "Leo"],
    [1962.83, "Virgo"], [1968.82, "Libra"], [1975.7, "Scorpio"],
    [1981.13, "Sagittarius"], [1988.12, "Capricorn"], [1995.25, "Aquarius"],
    [2003.19, "Pisces"], [2010.4, "Aries"], [2018.37, "Taurus"],
    [2025.51, "Gemini"], [2032.55, "Cancer"]
  ];
  return signFromTable(year, ingresses);
}

function neptuneSign(year: number): string | null {
  // Neptune ~14 yr per sign. Final-ingress dates back to 1900.
  const ingresses: Array<[number, string]> = [
    [1888.06, "Gemini"], [1902.5, "Cancer"], [1916.6, "Leo"],
    [1929.74, "Virgo"], [1942.75, "Libra"], [1956.99, "Scorpio"],
    [1970.83, "Sagittarius"], [1984.05, "Capricorn"], [1998.08, "Aquarius"],
    [2011.26, "Pisces"], [2025.24, "Aries"], [2038.97, "Taurus"]
  ];
  return signFromTable(year, ingresses);
}

function plutoSign(year: number): string | null {
  // Pluto's eccentric orbit — final-ingress dates back to 1900.
  const ingresses: Array<[number, string]> = [
    [1882.98, "Gemini"], [1914.43, "Cancer"], [1939.78, "Leo"],
    [1957.65, "Virgo"], [1971.79, "Libra"], [1983.85, "Scorpio"],
    [1995.86, "Sagittarius"], [2008.07, "Capricorn"], [2024.89, "Aquarius"],
    [2043.18, "Pisces"]
  ];
  return signFromTable(year, ingresses);
}

function signFromTable(
  year: number,
  table: Array<[number, string]>
): string | null {
  if (year < table[0][0]) return null;
  let current = table[0][1];
  for (const [start, sign] of table) {
    if (year >= start) current = sign;
    else break;
  }
  return current;
}

/**
 * GemstonesCard — pulls the user's three layers of stone correspondence
 * (life-path / Western sun / Chinese animal) and shows the primary,
 * supporting stones, wear instructions, and energetic theme.
 */
function GemstonesCard({
  lifePath,
  western,
  chinese
}: {
  lifePath: number;
  western: string;
  chinese: string;
}) {
  const lp = LIFE_PATH_STONES[lifePath] ?? LIFE_PATH_STONES[1];
  const ws = WESTERN_SIGN_STONES[western] ?? Object.values(WESTERN_SIGN_STONES)[0];
  const cs = CHINESE_SIGN_STONES[chinese] ?? Object.values(CHINESE_SIGN_STONES)[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stones & gemstones</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-3">
        <GemstoneTile heading={`Life Path ${lifePath}`} rec={lp} />
        <GemstoneTile heading={`${western} (Sun)`} rec={ws} />
        <GemstoneTile heading={`${chinese} (year)`} rec={cs} />
      </CardBody>
    </Card>
  );
}

function GemstoneTile({
  heading,
  rec
}: {
  heading: string;
  rec: GemstoneRecommendation;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{heading}</div>
      <div className="mt-1 text-base font-semibold text-fg">{rec.primary}</div>
      <div className="mt-2 text-xs text-fg-muted">
        <span className="text-fg">Supporting: </span>
        {rec.supporting.join(", ")}
      </div>
      <div className="mt-1.5 text-xs text-fg-muted">
        <span className="text-fg">Wear: </span>
        {rec.wear}
      </div>
      <div className="mt-1.5 text-xs italic text-fg-subtle">{rec.theme}</div>
    </div>
  );
}

/**
 * Card listing every Chinese zodiac animal with GG33-flavoured personality
 * traits — loyalty, career fit, money instincts, the distinctive "tells"
 * each animal gives off, and a few public-figure examples per sign.
 */
function ChineseZodiacTraitsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chinese zodiac sign traits</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Personality patterns for all 12 animals — loyalty, career, money,
          and the tells each one gives off. Useful as a relationship and
          team-building lens, not a horoscope.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CHINESE_SIGN_TRAITS.map((t) => (
            <div key={t.sign} className="rounded-xl border border-line bg-bg-soft/40 p-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{t.emoji}</div>
                <div className="text-sm font-semibold">{t.sign}</div>
              </div>
              <p className="mt-2 text-xs text-fg-muted">{t.essence}</p>
              <dl className="mt-2 space-y-1.5 text-[11px] text-fg-muted">
                <Trait label="Loyalty" body={t.loyalty} />
                <Trait label="Career" body={t.career} />
                <Trait label="Money" body={t.money} />
                <Trait label="Tells" body={t.tells} />
                <Trait label="Notable" body={t.notable} />
              </dl>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Card listing personality traits for every life-path number 1-9 plus the
 * master numbers 11 / 22 / 33 — distinct from the existing "Number
 * frequencies & vibrations" card which catalogues raw vibration; this
 * card is GG33-style narrative traits, lanes, money pattern, caveats
 * (including the master-11 travel caveat).
 */
function LifePathTraitsCard({ mineLifePath }: { mineLifePath: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Life path number traits</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Narrative traits for each life-path number (1-9) and the three
          master numbers (11, 22, 33). The master-number caveats (e.g. the
          11-day travel advice) are journaling lenses — observe the pattern
          for a few months on yourself before weighting them as rules.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LIFE_PATH_TRAITS.map((t) => {
            const isYours = mineLifePath !== null && mineLifePath === t.number;
            return (
              <div
                key={t.number}
                className={`rounded-xl border p-3 ${
                  isYours
                    ? "border-brand-400 bg-brand-500/10"
                    : "border-line bg-bg-soft/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-2xl font-semibold">{t.number}</div>
                  <div className="text-right text-xs text-fg-subtle">{t.title}</div>
                </div>
                <p className="mt-2 text-xs text-fg-muted">{t.essence}</p>
                <dl className="mt-2 space-y-1.5 text-[11px] text-fg-muted">
                  <Trait label="Strengths" body={t.strengths} />
                  <Trait label="Shadow" body={t.shadow} />
                  <Trait label="Lanes" body={t.lanes} />
                  <Trait label="Money" body={t.money} />
                  <Trait label="Notable" body={t.notable} />
                  {t.caveat ? <Trait label="Caveat" body={t.caveat} /> : null}
                </dl>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Card listing all 12 Western zodiac signs with deeper personality, body
 * archetype, and love / career notes — sits beneath the existing "All 12
 * signs at a glance" trade-archetype grid on the Lunar Cycle tab.
 */
function WesternZodiacTraitsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All 12 Western signs — full traits</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-fg-muted">
          Personality, body archetype, love and career patterns for every
          Western sign — deeper than the trade-archetype one-liners above.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WESTERN_SIGN_TRAITS.map((t) => (
            <div key={t.sign} className="rounded-xl border border-line bg-bg-soft/40 p-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{t.symbol}</div>
                <div>
                  <div className="text-sm font-semibold">{t.sign}</div>
                  <div className="text-[10px] text-fg-subtle">
                    {t.dates} · {t.element} · {t.modality} · {t.ruler}
                  </div>
                </div>
              </div>
              <dl className="mt-2 space-y-1.5 text-[11px] text-fg-muted">
                <Trait label="Body" body={t.body} />
                <Trait label="Personality" body={t.personality} />
                <Trait label="Shadow" body={t.shadow} />
                <Trait label="Love" body={t.love} />
                <Trait label="Career" body={t.career} />
                <Trait label="Notable" body={t.notable} />
              </dl>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function Trait({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <span className="text-fg">{label}: </span>
      {body}
    </div>
  );
}
