"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Empty } from "@/components/ui/empty";
import { ScreenshotButton } from "@/components/ui/screenshot-button";
import { chineseZodiacOf } from "@/lib/zodiac";
import { cn } from "@/lib/utils";
import type {
  Resolution,
  ResolutionSection,
  ResolutionSubsection
} from "@/lib/supabase/types";
import { ResolutionCard } from "./resolution-card";

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

export function ResolutionsTab({ resolutions, onChange }: ResolutionsTabProps) {
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
        />
      )}

      {sub === "passed" && (
        <ResolutionGrid
          resolutions={passed}
          emptyTitle="Nothing in the archive"
          emptyDescription="Resolutions automatically move here when their year ends."
          onOpen={(id) => setOpenId(id)}
          onDelete={(id) => onChange(resolutions.filter((r) => r.id !== id))}
        />
      )}

      {open && (
        <ResolutionModal resolution={open} onClose={() => setOpenId(null)} />
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
  onDelete
}: {
  resolutions: Resolution[];
  emptyTitle: string;
  emptyDescription: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!resolutions.length) {
    return <Empty title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resolutions.map((r) => (
        <div key={r.id} className="group relative">
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            className="block w-full text-left transition hover:scale-[1.01]"
          >
            <ResolutionCard resolution={r} variant="preview" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete ${r.year} resolutions?`)) onDelete(r.id);
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

function CreateForm({ onSave }: { onSave: (r: Resolution) => void }) {
  const [year, setYear] = useState<number>(() => new Date().getUTCFullYear());
  const [title, setTitle] = useState<string>("");
  const [sections, setSections] = useState<ResolutionSection[]>(() => [makeBlankSection(0)]);
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
      sections: cleaned
    });
    // Reset
    setSections([makeBlankSection(0)]);
    setTitle("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Define your resolution</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-[140px_1fr_auto] md:items-end">
          <div>
            <Label>Year</Label>
            <Input
              type="number"
              min={2000}
              max={2200}
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getUTCFullYear())}
            />
            <div className="mt-1 text-[11px] text-fg-subtle">
              Year of the {zodiac}
            </div>
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
  canRemove
}: {
  section: ResolutionSection;
  index: number;
  onChange: (fn: (s: ResolutionSection) => ResolutionSection) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(true);

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
                placeholder="2026 Trading Plan"
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
                      placeholder="$50 → $1000"
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
                      "Q1: Target $250\nMonthly target → $90 / month (3)\nFocus on 9 good trades targeting $10 / trade"
                    }
                  />
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
// Open modal (with portrait/landscape + screenshot)
// ---------------------------------------------------------------------------

function ResolutionModal({
  resolution,
  onClose
}: {
  resolution: Resolution;
  onClose: () => void;
}) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col gap-3 overflow-hidden",
          orientation === "portrait" ? "max-w-[640px]" : "max-w-[1100px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-xl border border-line bg-bg-elevated px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
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
          <div className="flex items-center gap-2">
            <ScreenshotButton
              targetRef={cardRef}
              filename={`resolution-${resolution.year}-${orientation}`}
              label="Save resolution as PNG"
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

        <div ref={cardRef} className="overflow-y-auto">
          <ResolutionCard resolution={resolution} orientation={orientation} />
        </div>
      </div>
    </div>
  );
}
