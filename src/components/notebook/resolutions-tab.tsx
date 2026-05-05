"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Empty } from "@/components/ui/empty";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { chineseZodiacOf } from "@/lib/zodiac";
import { cn } from "@/lib/utils";
import type {
  Resolution,
  ResolutionBackground,
  ResolutionSection,
  ResolutionSubsection
} from "@/lib/supabase/types";
import { ResolutionCard } from "./resolution-card";
import { ResolutionBgPicker } from "./resolution-bg-picker";

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SECTION_COLORS: ResolutionSection["color"][] = [
  "orange",
  "pink",
  "green",
  "purple",
  "blue",
  "amber"
];

type ResolutionsTabProps = {
  resolutions: Resolution[];
  onChange: (next: Resolution[]) => void;
  /** Pulled from the user's profile.full_name on the parent page.
   *  Used as the default `owner_name` on newly-created resolutions. */
  defaultOwnerName?: string;
};

type SubTab = "create" | "created" | "passed";

/**
 * Splits saved resolutions into "current" (year is now or in the future)
 * and "passed" (year < current). The "Time passed" sub-tab uses the latter.
 */
function partition(resolutions: Resolution[]): {
  current: Resolution[];
  passed: Resolution[];
} {
  const now = new Date().getUTCFullYear();
  const sorted = [...resolutions].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.created_at.localeCompare(a.created_at);
  });
  return {
    current: sorted.filter((r) => r.year >= now),
    passed: sorted.filter((r) => r.year < now)
  };
}

export function ResolutionsTab({
  resolutions,
  onChange,
  defaultOwnerName
}: ResolutionsTabProps) {
  const [sub, setSub] = useState<SubTab>("create");
  const [openId, setOpenId] = useState<string | null>(null);
  const { current, passed } = useMemo(() => partition(resolutions), [resolutions]);
  const open = useMemo(
    () => resolutions.find((r) => r.id === openId) ?? null,
    [resolutions, openId]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-bg-soft p-1 inline-flex">
        <SubTabButton active={sub === "create"} onClick={() => setSub("create")}>
          Create
        </SubTabButton>
        <SubTabButton active={sub === "created"} onClick={() => setSub("created")}>
          Created
          {current.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-200">
              {current.length}
            </span>
          )}
        </SubTabButton>
        <SubTabButton active={sub === "passed"} onClick={() => setSub("passed")}>
          Time passed
          {passed.length > 0 && (
            <span className="ml-1.5 rounded-full bg-fg-subtle/20 px-1.5 py-0.5 text-[10px] text-fg-subtle">
              {passed.length}
            </span>
          )}
        </SubTabButton>
      </div>

      {sub === "create" && (
        <CreateForm
          defaultOwnerName={defaultOwnerName}
          onSave={(r) => {
            onChange([...resolutions, r]);
            setSub("created");
          }}
        />
      )}

      {sub === "created" && (
        <ResolutionGrid
          resolutions={current}
          emptyTitle="No resolutions yet"
          emptyDescription="Use the Create tab to define this year's resolutions. They'll appear here once saved."
          onOpen={(id) => setOpenId(id)}
          onDelete={(id) => onChange(resolutions.filter((r) => r.id !== id))}
          onUpdate={(next) =>
            onChange(resolutions.map((r) => (r.id === next.id ? next : r)))
          }
          readOnly={false}
        />
      )}

      {sub === "passed" && (
        <ResolutionGrid
          resolutions={passed}
          emptyTitle="Nothing in the archive"
          emptyDescription="Resolutions automatically move here when their year ends."
          onOpen={(id) => setOpenId(id)}
          onDelete={(id) => onChange(resolutions.filter((r) => r.id !== id))}
          onUpdate={(next) =>
            onChange(resolutions.map((r) => (r.id === next.id ? next : r)))
          }
          readOnly
        />
      )}

      {open && (
        <ResolutionModal
          resolution={open}
          onClose={() => setOpenId(null)}
          // Resolutions whose year has already ended are frozen — the modal
          // shows the card for viewing + downloading but every editing
          // affordance (pencil, toggles, BG picker, ticking checkboxes) is
          // hidden so the historical record can't be tampered with.
          readOnly={open.year < new Date().getUTCFullYear()}
          onUpdate={(next) =>
            onChange(resolutions.map((r) => (r.id === next.id ? next : r)))
          }
        />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

function ResolutionGrid({
  resolutions,
  emptyTitle,
  emptyDescription,
  onOpen,
  onDelete,
  onUpdate,
  readOnly = false
}: {
  resolutions: Resolution[];
  emptyTitle: string;
  emptyDescription: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (next: Resolution) => void;
  /** Time-passed grid → tick-boxes are frozen and the card is view-only. */
  readOnly?: boolean;
}) {
  if (!resolutions.length) {
    return <Empty title={emptyTitle} description={emptyDescription} />;
  }

  function toggleItem(
    r: Resolution,
    sectionId: string,
    subId: string,
    itemId: string,
    next: boolean
  ) {
    onUpdate({
      ...r,
      sections: r.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              subsections: s.subsections.map((ss) =>
                ss.id !== subId
                  ? ss
                  : {
                      ...ss,
                      items: ss.items.map((it) =>
                        it.id === itemId ? { ...it, checked: next } : it
                      )
                    }
              )
            }
      )
    });
  }

  function toggleTarget(r: Resolution, sectionId: string, subId: string, next: boolean) {
    onUpdate({
      ...r,
      sections: r.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              subsections: s.subsections.map((ss) =>
                ss.id !== subId ? ss : { ...ss, target_checked: next }
              )
            }
      )
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resolutions.map((r) => (
        <div key={r.id} className="group relative">
          {/*
           * Outer card is no longer a single <button> — that breaks
           * nested-button semantics for the now-clickable bullet
           * checkboxes. Click anywhere on the card surface that isn't
           * a checkbox to open the modal.
           */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button[aria-pressed]")) return;
              onOpen(r.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(r.id);
              }
            }}
            className="block w-full cursor-pointer text-left transition hover:scale-[1.01]"
          >
            <ResolutionCard
              resolution={r}
              variant="preview"
              onToggleItem={
                readOnly
                  ? undefined
                  : (sectionId, subId, itemId, next) =>
                      toggleItem(r, sectionId, subId, itemId, next)
              }
              onToggleTarget={
                readOnly
                  ? undefined
                  : (sectionId, subId, next) =>
                      toggleTarget(r, sectionId, subId, next)
              }
            />
          </div>
          {readOnly && (
            <span
              className="pointer-events-none absolute left-3 top-3 rounded-md border border-line bg-bg/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-subtle"
              title="Resolutions move here when their year ends. Read-only."
            >
              Archived
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(r.id);
            }}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-bg/90 text-fg-muted opacity-0 transition group-hover:opacity-100 hover:border-danger hover:text-danger"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function makeBlankSection(idx: number): ResolutionSection {
  return {
    id: newId(),
    label: "",
    color: SECTION_COLORS[idx % SECTION_COLORS.length],
    subsections: [makeBlankSubsection()]
  };
}

function makeBlankSubsection(): ResolutionSubsection {
  return {
    id: newId(),
    label: "",
    target: "",
    items: [{ id: newId(), text: "" }]
  };
}

function CreateForm({
  onSave,
  defaultOwnerName
}: {
  onSave: (r: Resolution) => void;
  defaultOwnerName?: string;
}) {
  const [year, setYear] = useState<number>(() => new Date().getUTCFullYear());
  const [title, setTitle] = useState<string>("");
  const [sections, setSections] = useState<ResolutionSection[]>(() => [makeBlankSection(0)]);
  const [background, setBackground] = useState<ResolutionBackground>({ kind: "theme" });
  const [showYearLabel, setShowYearLabel] = useState(true);
  const [ownerName, setOwnerName] = useState<string>(defaultOwnerName ?? "");
  const [showOwnerName, setShowOwnerName] = useState(false);
  const [showCreatedTimestamp, setShowCreatedTimestamp] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const zodiac = chineseZodiacOf(year);

  function updateSection(id: string, fn: (s: ResolutionSection) => ResolutionSection) {
    setSections((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, makeBlankSection(prev.length)]);
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function canSave(): boolean {
    return sections.some(
      (s) => s.label.trim() && s.subsections.some((ss) => ss.label.trim())
    );
  }

  function save() {
    const cleaned: ResolutionSection[] = sections
      .filter((s) => s.label.trim())
      .map((s) => ({
        ...s,
        label: s.label.trim(),
        subsections: s.subsections
          .filter((ss) => ss.label.trim())
          .map((ss) => ({
            ...ss,
            label: ss.label.trim(),
            target: ss.target?.trim() || undefined,
            items: ss.items
              .map((it) => ({ ...it, text: it.text.trim() }))
              .filter((it) => it.text)
          }))
      }))
      .filter((s) => s.subsections.length);

    if (!cleaned.length) return;
    onSave({
      id: newId(),
      year,
      title: title.trim() || undefined,
      created_at: new Date().toISOString(),
      sections: cleaned,
      background,
      show_year_label: showYearLabel,
      owner_name: ownerName.trim() || undefined,
      show_owner_name: showOwnerName,
      show_created_timestamp: showCreatedTimestamp,
      show_progress: showProgress
    });
    // Reset
    setSections([makeBlankSection(0)]);
    setTitle("");
    setBackground({ kind: "theme" });
    setShowYearLabel(true);
    setShowOwnerName(false);
    setShowCreatedTimestamp(false);
    setShowProgress(false);
    setShowPreview(false);
  }

  // Live preview object — used by both the inline preview card and the bg
  // picker swatches so the user sees their choices immediately.
  const previewResolution: Resolution = {
    id: "preview",
    year,
    title: title.trim() || undefined,
    created_at: new Date().toISOString(),
    sections:
      sections.some((s) => s.label.trim())
        ? sections.filter((s) => s.label.trim())
        : [
            {
              id: "ph1",
              label: "Trading plan",
              color: "purple",
              subsections: [
                {
                  id: "ph1-1",
                  label: "Personal account",
                  target: "$10000 → $100000",
                  items: [
                    { id: "ph1-i1", text: "Q1: Target $100000" },
                    { id: "ph1-i2", text: "Monthly target → $35000 / month (3)" },
                    { id: "ph1-i3", text: "Focus on 10 good trades targeting $1000 / trade" }
                  ]
                }
              ]
            },
            {
              id: "ph2",
              label: "Health & habits",
              color: "green",
              subsections: [
                {
                  id: "ph2-1",
                  label: "Daily routine",
                  items: [
                    { id: "ph2-i1", text: "Sleep ≥ 7h, train 4x / week" }
                  ]
                }
              ]
            }
          ],
    background,
    show_year_label: showYearLabel,
    owner_name: ownerName.trim() || undefined,
    show_owner_name: showOwnerName,
    show_created_timestamp: showCreatedTimestamp,
    show_progress: showProgress
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Define your resolution</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Year + Title side-by-side on the same line. */}
          <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] md:items-end">
            <div>
              <Label>Year</Label>
              <Input
                type="number"
                min={2000}
                max={2200}
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || new Date().getUTCFullYear())}
              />
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${year} Resolutions`}
              />
            </div>
            <Button onClick={save} disabled={!canSave()}>
              Save resolution
            </Button>
          </div>
          <div className="text-[11px] text-fg-subtle">
            Year of the <span className="text-fg">{zodiac}</span>
          </div>

          {/* Personalisation — name above the year, timestamp below, progress %.
              Foldable so the create form stays compact until the user wants
              to enable any of the three. */}
          <div className="rounded-xl border border-line bg-bg-soft/30">
            <button
              type="button"
              onClick={() => setPersonalOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-subtle hover:text-fg"
            >
              <span className="flex items-center gap-2">
                {personalOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Personalise
              </span>
              <span className="ml-2 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-fg-muted">
                {[
                  showOwnerName && "Name",
                  showCreatedTimestamp && "Date",
                  showProgress && "Progress"
                ]
                  .filter(Boolean)
                  .join(" · ") || "Off"}
              </span>
            </button>
            {personalOpen && (
              <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <Label>Display name</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder={defaultOwnerName ?? "Your name"}
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 pb-2 text-xs text-fg-muted">
                    <input
                      type="checkbox"
                      checked={showOwnerName}
                      onChange={(e) => setShowOwnerName(e.target.checked)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    Show name above year
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showCreatedTimestamp}
                      onChange={(e) => setShowCreatedTimestamp(e.target.checked)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    Show "Created on …" timestamp below year
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showProgress}
                      onChange={(e) => setShowProgress(e.target.checked)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    Show overall progress (%) on card
                  </label>
                </div>
                <p className="text-[11px] text-fg-subtle">
                  Your name pre-fills from your profile. Each toggle is independent — you can
                  change them per-resolution any time after it's saved.
                </p>
              </div>
            )}
          </div>

          {/* Card decoration controls — foldable so the create form stays
              compact until the user wants to tweak the look. */}
          <div className="rounded-xl border border-line bg-bg-soft/30">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setBgOpen((o) => !o)}
                className="flex flex-1 items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-subtle hover:text-fg"
              >
                {bgOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Set background colour
                {!bgOpen && (
                  <span className="ml-2 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-fg-muted">
                    {background.kind === "theme"
                      ? "Default theme"
                      : background.kind === "solid"
                      ? `Solid · ${background.color}`
                      : `Gradient · ${background.preset}`}
                  </span>
                )}
              </button>
              <Button variant="secondary" onClick={() => setShowPreview((p) => !p)}>
                {showPreview ? "Hide preview" : "Preview"}
              </Button>
            </div>
            {bgOpen && (
              <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                <ResolutionBgPicker value={background} onChange={setBackground} />
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-fg-muted">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showYearLabel}
                      onChange={(e) => setShowYearLabel(e.target.checked)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    Show "YEAR OF THE {zodiac.toUpperCase()}" label
                  </label>
                  <span className="text-[11px] text-fg-subtle">
                    The {zodiac.toLowerCase()} icon for the year cycle is permanent
                    and reacts to your selected year.
                  </span>
                </div>
              </div>
            )}
          </div>

          {showPreview && (
            <div className="overflow-hidden rounded-2xl border border-line bg-bg-soft/30 p-3">
              <ResolutionCard resolution={previewResolution} variant="preview" />
            </div>
          )}
        </CardBody>
      </Card>

      {sections.map((section, idx) => (
        <SectionEditor
          key={section.id}
          index={idx}
          section={section}
          onChange={(fn) => updateSection(section.id, fn)}
          onRemove={() => removeSection(section.id)}
          canRemove={sections.length > 1}
        />
      ))}

      <Button variant="secondary" onClick={addSection}>
        <Plus className="h-4 w-4" /> Add section
      </Button>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  canRemove,
  startCollapsed = false
}: {
  section: ResolutionSection;
  index: number;
  onChange: (fn: (s: ResolutionSection) => ResolutionSection) => void;
  onRemove: () => void;
  canRemove: boolean;
  startCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(!startCollapsed);

  function setField<K extends keyof ResolutionSection>(k: K, v: ResolutionSection[K]) {
    onChange((s) => ({ ...s, [k]: v }));
  }

  function updateSub(subId: string, fn: (s: ResolutionSubsection) => ResolutionSubsection) {
    onChange((s) => ({
      ...s,
      subsections: s.subsections.map((ss) => (ss.id === subId ? fn(ss) : ss))
    }));
  }

  function addSub() {
    onChange((s) => ({ ...s, subsections: [...s.subsections, makeBlankSubsection()] }));
  }

  function removeSub(subId: string) {
    onChange((s) => ({ ...s, subsections: s.subsections.filter((ss) => ss.id !== subId) }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-fg-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-fg-muted" />
          )}
          <CardTitle>
            {section.label.trim() || `Section ${index + 1}`}
          </CardTitle>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-fg-subtle hover:text-danger"
            aria-label="Remove section"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      {open && (
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div>
              <Label>Section label</Label>
              <Input
                value={section.label}
                onChange={(e) => setField("label", e.target.value)}
                placeholder="Trading Plan"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {SECTION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setField("color", c)}
                    className={cn(
                      "h-7 w-7 rounded-lg border-2 transition",
                      c === "orange" && "bg-orange-500/40 border-orange-500/30",
                      c === "pink" && "bg-pink-500/40 border-pink-500/30",
                      c === "green" && "bg-emerald-500/40 border-emerald-500/30",
                      c === "purple" && "bg-brand-500/40 border-brand-500/30",
                      c === "blue" && "bg-sky-500/40 border-sky-500/30",
                      c === "amber" && "bg-amber-500/40 border-amber-500/30",
                      section.color === c && "ring-2 ring-offset-2 ring-offset-bg ring-fg/40"
                    )}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {section.subsections.map((sub, sidx) => (
              <div
                key={sub.id}
                className="rounded-xl border border-line bg-bg-soft/30 p-3 space-y-2"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
                  <div>
                    <Label>Sub-section label</Label>
                    <Input
                      value={sub.label}
                      onChange={(e) => updateSub(sub.id, (s) => ({ ...s, label: e.target.value }))}
                      placeholder={sidx === 0 ? "Personal account" : "Funded account"}
                    />
                  </div>
                  <div>
                    <Label>Overall target / goal</Label>
                    <Input
                      value={sub.target ?? ""}
                      onChange={(e) => updateSub(sub.id, (s) => ({ ...s, target: e.target.value }))}
                      placeholder="$10000 → $100000"
                    />
                  </div>
                  {section.subsections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSub(sub.id)}
                      className="self-end text-fg-subtle hover:text-danger"
                      aria-label="Remove sub-section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div>
                  <Label>Bullets (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={sub.items.map((i) => i.text).join("\n")}
                    onChange={(e) => {
                      const lines = e.target.value.split("\n");
                      updateSub(sub.id, (s) => ({
                        ...s,
                        items: lines.map((text, i) => ({
                          id: s.items[i]?.id ?? newId(),
                          text,
                          checked: s.items[i]?.checked
                        }))
                      }));
                    }}
                    placeholder={
                      "Q1: Target $100000\nMonthly target → $35000 / month (3)\nFocus on 10 good trades targeting $1000 / trade"
                    }
                  />
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    Each line becomes a tickable bullet. A richer slash-command editor (
                    <code>/text</code>, <code>/heading</code>, <code>/bigbox</code>, <code>/toggle</code>,
                    etc.) is coming next.
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" onClick={addSub}>
            <Plus className="h-4 w-4" /> Add sub-section
          </Button>
        </CardBody>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Open modal (with portrait/landscape + screenshot + full edit)
// ---------------------------------------------------------------------------

function ResolutionModal({
  resolution,
  onClose,
  onUpdate,
  readOnly = false
}: {
  resolution: Resolution;
  onClose: () => void;
  onUpdate: (next: Resolution) => void;
  /** Time-passed view → only screenshot + close are exposed; everything
   *  else (edit pencil, BG picker, toggles, tick-boxes) is hidden. */
  readOnly?: boolean;
}) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [editMode, setEditMode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const setBackground = (bg: ResolutionBackground) =>
    onUpdate({ ...resolution, background: bg });
  const toggleYearLabel = () =>
    onUpdate({ ...resolution, show_year_label: !(resolution.show_year_label !== false) });
  const toggleOwnerName = () =>
    onUpdate({ ...resolution, show_owner_name: !resolution.show_owner_name });
  const toggleTimestamp = () =>
    onUpdate({ ...resolution, show_created_timestamp: !resolution.show_created_timestamp });
  const toggleProgress = () =>
    onUpdate({ ...resolution, show_progress: !resolution.show_progress });
  const updateTitle = (title: string) =>
    onUpdate({ ...resolution, title: title.trim() || undefined });
  const updateOwnerName = (name: string) =>
    onUpdate({ ...resolution, owner_name: name.trim() || undefined });

  function updateSection(sectionId: string, fn: (s: ResolutionSection) => ResolutionSection) {
    onUpdate({
      ...resolution,
      sections: resolution.sections.map((s) => (s.id === sectionId ? fn(s) : s))
    });
  }

  function addSection() {
    onUpdate({
      ...resolution,
      sections: [...resolution.sections, makeBlankSection(resolution.sections.length)]
    });
  }

  function removeSection(sectionId: string) {
    onUpdate({
      ...resolution,
      sections: resolution.sections.filter((s) => s.id !== sectionId)
    });
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      data-screenshot-ignore="true"
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col gap-3",
          orientation === "portrait" ? "max-w-[640px]" : "max-w-[1100px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2"
          data-screenshot-ignore="true"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wide">View</span>
              <div className="rounded-lg border border-line bg-bg-soft p-0.5">
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px]",
                    orientation === "portrait"
                      ? "bg-bg-elevated text-fg shadow-sm"
                      : "text-fg-muted"
                  )}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px]",
                    orientation === "landscape"
                      ? "bg-bg-elevated text-fg shadow-sm"
                      : "text-fg-muted"
                  )}
                >
                  Landscape
                </button>
              </div>
            </div>

            {!readOnly && (
              <ResolutionBgPicker
                compact
                value={resolution.background}
                onChange={setBackground}
              />
            )}

            {!readOnly && (
              <>
                <label className="inline-flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={resolution.show_year_label !== false}
                    onChange={toggleYearLabel}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  YEAR OF THE {chineseZodiacOf(resolution.year).toUpperCase()}
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!resolution.show_owner_name}
                    onChange={toggleOwnerName}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  Name
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!resolution.show_created_timestamp}
                    onChange={toggleTimestamp}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  Date
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!resolution.show_progress}
                    onChange={toggleProgress}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  Progress %
                </label>
              </>
            )}
            {readOnly && (
              <span className="rounded-md border border-line bg-bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">
                Archived · read-only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => setEditMode((e) => !e)}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                  editMode
                    ? "border-brand-400 bg-brand-500/15 text-brand-200"
                    : "border-line bg-bg text-fg-muted hover:border-brand-400 hover:text-fg"
                )}
                aria-label="Edit"
                title="Edit resolution"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <ScreenshotButton
              targetRef={cardRef}
              filename={`resolution-${resolution.year}-${orientation}`}
              label="Save resolution as PNG"
              captureFullSize
            />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted transition hover:border-danger hover:text-danger"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editMode && !readOnly && (
          <div
            className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-3"
            data-screenshot-ignore="true"
          >
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2200}
                  value={resolution.year}
                  onChange={(e) =>
                    onUpdate({
                      ...resolution,
                      year: Number(e.target.value) || resolution.year
                    })
                  }
                />
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={resolution.title ?? ""}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder={`${resolution.year} Resolutions`}
                />
              </div>
            </div>

            <div>
              <Label>Display name (above year)</Label>
              <Input
                value={resolution.owner_name ?? ""}
                onChange={(e) => updateOwnerName(e.target.value)}
                placeholder="Your name"
              />
              <p className="mt-1 text-[11px] text-fg-subtle">
                Stored separately from your account so you can personalise per resolution.
                Use the toggle above to show / hide it on the card.
              </p>
            </div>

            <div className="space-y-3 border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Sections
                </div>
                <Button variant="secondary" onClick={addSection}>
                  <Plus className="h-3.5 w-3.5" /> Add section
                </Button>
              </div>
              {resolution.sections.map((section, idx) => (
                <SectionEditor
                  key={section.id}
                  index={idx}
                  section={section}
                  onChange={(fn) =>
                    updateSection(section.id, (curr) => fn(curr))
                  }
                  onRemove={() => removeSection(section.id)}
                  canRemove={resolution.sections.length > 1}
                  startCollapsed
                />
              ))}
            </div>

            <div className="text-[11px] text-fg-subtle">
              Edits save automatically — close the modal at any time. Toggles in the
              toolbar above (Name, Date, Progress %, YEAR OF THE …) are independent.
            </div>
          </div>
        )}

        <div ref={cardRef} className="overflow-y-auto">
          <ResolutionCard
            resolution={resolution}
            orientation={orientation}
            onToggleItem={
              readOnly
                ? undefined
                : (sectionId, subId, itemId, next) =>
                    onUpdate({
                      ...resolution,
                      sections: resolution.sections.map((s) =>
                        s.id !== sectionId
                          ? s
                          : {
                              ...s,
                              subsections: s.subsections.map((ss) =>
                                ss.id !== subId
                                  ? ss
                                  : {
                                      ...ss,
                                      items: ss.items.map((it) =>
                                        it.id === itemId
                                          ? { ...it, checked: next }
                                          : it
                                      )
                                    }
                              )
                            }
                      )
                    })
            }
            onToggleTarget={
              readOnly
                ? undefined
                : (sectionId, subId, next) =>
                    onUpdate({
                      ...resolution,
                      sections: resolution.sections.map((s) =>
                        s.id !== sectionId
                          ? s
                          : {
                              ...s,
                              subsections: s.subsections.map((ss) =>
                                ss.id !== subId
                                  ? ss
                                  : { ...ss, target_checked: next }
                              )
                            }
                      )
                    })
            }
          />
        </div>
      </div>
    </div>
  );
}
