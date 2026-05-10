"use client";

// =====================================================================
// Notion-style slash-command block editor for Resolutions sub-sections.
//
// Each block is a `ResolutionItem` extended with an optional `kind`
// field (Heading 1/2/3, To-do, Bigbox, Bullet, Numbered, Toggle,
// Callout, Quote, Divider, Text). Typing "/" at any position opens a
// floating menu that filters as you type. Picking an option transforms
// the current block; pressing Enter creates a new block of the same
// kind; Backspace on an empty block deletes it and refocuses the
// previous one.
//
// All state is held in the parent (controlled component) — the editor
// only emits a new `ResolutionItem[]` on every change.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  ChevronRight,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  Megaphone,
  Minus,
  Plus,
  Quote,
  SquarePlus,
  Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolutionBlockKind, ResolutionItem } from "@/lib/supabase/types";
import { RichTextInput, type RichTextInputHandle } from "./rich-text-input";

type Option = {
  kind: ResolutionBlockKind;
  label: string;
  hint: string;
  aliases: string[];
  icon: React.ComponentType<{ className?: string }>;
};

const OPTIONS: Option[] = [
  { kind: "text",     label: "Text",         hint: "Plain paragraph",                   aliases: ["text", "p", "paragraph", "body"],                icon: Type },
  { kind: "h1",       label: "Heading 1",    hint: "Big section heading",               aliases: ["h1", "heading 1", "big heading", "title"],       icon: Heading1 },
  { kind: "h2",       label: "Heading 2",    hint: "Medium section heading",            aliases: ["h2", "heading 2", "subheading"],                 icon: Heading2 },
  { kind: "h3",       label: "Heading 3",    hint: "Small section heading",             aliases: ["h3", "heading 3", "subsubheading"],              icon: Heading3 },
  { kind: "bullet",   label: "Bullet list",  hint: "Bulleted list item",                aliases: ["bullet", "bullet list", "ul", "list"],           icon: () => <span className="select-none text-base leading-none">•</span> },
  { kind: "numbered", label: "Numbered list",hint: "Ordered list item",                 aliases: ["numbered", "ordered", "ol", "1.", "number list"],icon: ListOrdered },
  { kind: "todo",     label: "To-do",        hint: "Small checkbox task",               aliases: ["to do", "todo", "task", "check", "checkbox"],    icon: CheckSquare },
  { kind: "bigbox",   label: "Big box",      hint: "Larger checkbox styled to GƎNƎSIS", aliases: ["bigbox", "big box", "big check"],                icon: SquarePlus },
  { kind: "toggle",   label: "Toggle",       hint: "Foldable disclosure block",         aliases: ["toggle", "fold", "details"],                     icon: ChevronRight },
  { kind: "callout",  label: "Callout",      hint: "Highlighted note panel",            aliases: ["callout", "info", "note"],                       icon: Megaphone },
  { kind: "quote",    label: "Quote",        hint: "Pull-quote with side-bar",          aliases: ["quote", "blockquote"],                           icon: Quote },
  { kind: "divider",  label: "Divider",      hint: "Horizontal rule",                   aliases: ["divider", "hr", "line", "rule"],                 icon: Minus }
];

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blockKindOf(b: ResolutionItem): ResolutionBlockKind {
  return b.kind ?? "todo";
}

function isCheckable(kind: ResolutionBlockKind): boolean {
  return kind === "todo" || kind === "bigbox";
}

function filterOptions(query: string): Option[] {
  const q = query.toLowerCase().trim();
  if (!q) return OPTIONS;
  return OPTIONS.filter((o) => o.aliases.some((a) => a.includes(q)));
}

export type BlockEditorProps = {
  blocks: ResolutionItem[];
  onChange: (next: ResolutionItem[]) => void;
  /** Placeholder shown on the FIRST empty block. */
  placeholder?: string;
  /** Optional fixed-width container. */
  className?: string;
};

export function BlockEditor({ blocks, onChange, placeholder, className }: BlockEditorProps) {
  // Slash menu state — anchored to the block currently triggering it.
  const [menu, setMenu] = useState<{ blockId: string; query: string; activeIdx: number } | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, RichTextInputHandle | null>>({});

  // Always keep at least one empty block so the editor never collapses
  // to a zero-block "looks broken" state.
  useEffect(() => {
    if (blocks.length === 0) {
      onChange([{ id: newId(), text: "", kind: "todo" }]);
    }
  }, [blocks.length, onChange]);

  useEffect(() => {
    if (pendingFocus && inputRefs.current[pendingFocus]) {
      // Focus + place caret at the end. setCaretToEnd handles both for
      // contentEditable surfaces (input.setSelectionRange doesn't apply).
      inputRefs.current[pendingFocus]?.setCaretToEnd();
      setPendingFocus(null);
    }
  }, [pendingFocus, blocks]);

  function patch(id: string, fn: (b: ResolutionItem) => ResolutionItem) {
    onChange(blocks.map((b) => (b.id === id ? fn(b) : b)));
  }

  function insertAfter(id: string, kind: ResolutionBlockKind) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const fresh: ResolutionItem = { id: newId(), text: "", kind };
    const next = [...blocks.slice(0, idx + 1), fresh, ...blocks.slice(idx + 1)];
    onChange(next);
    setPendingFocus(fresh.id);
  }

  function removeBlock(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    if (blocks.length <= 1) {
      // Replace the only block with a fresh empty todo and refocus it,
      // otherwise the cursor disappears entirely after Backspace on the
      // last remaining block (the old DOM node is unmounted and the new
      // one has a brand new id with no focus tracker).
      const freshId = newId();
      onChange([{ id: freshId, text: "", kind: "todo" }]);
      setPendingFocus(freshId);
      return;
    }
    const next = blocks.filter((b) => b.id !== id);
    onChange(next);
    const focusOn = blocks[idx - 1]?.id ?? blocks[idx + 1]?.id;
    if (focusOn) setPendingFocus(focusOn);
  }

  function changeKind(id: string, kind: ResolutionBlockKind) {
    // The slash menu only opens when the entire input is a slash command
    // (e.g. "/h1", "/callout"), so the block's text at this point is the
    // command itself. Always clear it (text + html) after selection —
    // otherwise the newly-typed Heading-1 block would render with the
    // literal "/h1" as its visible content.
    patch(id, (b) => {
      const next: ResolutionItem = { ...b, kind, text: "", html: "" };
      // Toggles default to OPEN on creation so the empty children area
      // is immediately visible — otherwise the user has nowhere to type
      // their nested content. Callouts don't have an open/closed state;
      // their children area is always rendered.
      if (kind === "toggle") next.open = true;
      // Drop any leftover children when converting AWAY from a container
      // kind. Non-container kinds never render children, but
      // computeResolutionProgress recurses regardless of kind, so
      // orphaned checkboxes inside a stranded children array would
      // silently inflate the denominator and cap progress below 100%.
      if (kind !== "toggle" && kind !== "callout") delete next.children;
      return next;
    });
    setMenu(null);
    if (kind !== "divider") setPendingFocus(id);
  }

  function openMenuOn(id: string, query: string) {
    setMenu({ blockId: id, query, activeIdx: 0 });
  }

  return (
    <div className={cn("space-y-1", className)}>
      {blocks.map((block, idx) => {
        const kind = blockKindOf(block);
        // Container kinds get a nested BlockEditor rendered indented
        // below their row. Toggles only show children when open (so
        // the disclosure actually does something). Callouts always
        // show their children — collapsing a callout would make the
        // slash-commands-inside feature unreachable.
        const showChildren =
          (kind === "toggle" && !!block.open) || kind === "callout";
        return (
          <div key={block.id}>
            <BlockRow
              block={block}
              isFirst={idx === 0}
              placeholder={idx === 0 ? (placeholder ?? "") : ""}
              inputRef={(el) => { inputRefs.current[block.id] = el; }}
              onBodyChange={(next) => patch(block.id, (b) => ({ ...b, text: next.text, html: next.html }))}
              onToggleChecked={() => patch(block.id, (b) => ({ ...b, checked: !b.checked }))}
              onToggleOpen={() => patch(block.id, (b) => ({ ...b, open: !b.open }))}
              onEnter={() => insertAfter(block.id, blockKindOf(block))}
              onBackspaceEmpty={() => removeBlock(block.id)}
              onSlashOpen={(query) => openMenuOn(block.id, query)}
              onSlashUpdate={(query) => menu?.blockId === block.id && setMenu({ ...menu!, query, activeIdx: 0 })}
              onSlashClose={() => setMenu(null)}
              isMenuOpen={menu?.blockId === block.id}
              menu={menu?.blockId === block.id ? menu : null}
              onMenuPick={(kind) => changeKind(block.id, kind)}
              onMenuMove={(delta) => {
                if (menu?.blockId !== block.id) return;
                const filtered = filterOptions(menu.query);
                if (filtered.length === 0) return;
                const next = (menu.activeIdx + delta + filtered.length) % filtered.length;
                setMenu({ ...menu, activeIdx: next });
              }}
              onMenuConfirm={() => {
                if (menu?.blockId !== block.id) return;
                const filtered = filterOptions(menu.query);
                const choice = filtered[menu.activeIdx];
                if (choice) changeKind(block.id, choice.kind);
              }}
              onAddBelow={() => insertAfter(block.id, "todo")}
              onDelete={() => removeBlock(block.id)}
            />

            {showChildren && (
              <div className="ml-7 mt-1 border-l border-line/40 pl-3">
                <BlockEditor
                  blocks={block.children ?? []}
                  onChange={(nextChildren) =>
                    patch(block.id, (b) => ({ ...b, children: nextChildren }))
                  }
                  placeholder={
                    kind === "toggle"
                      ? "Empty toggle — type '/' for commands"
                      : "Type '/' for commands"
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single block row
// ---------------------------------------------------------------------------

type BlockRowProps = {
  block: ResolutionItem;
  isFirst: boolean;
  placeholder: string;
  inputRef: (el: RichTextInputHandle | null) => void;
  onBodyChange: (next: { html: string; text: string }) => void;
  onToggleChecked: () => void;
  onToggleOpen: () => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onSlashOpen: (query: string) => void;
  onSlashUpdate: (query: string) => void;
  onSlashClose: () => void;
  isMenuOpen: boolean;
  menu: { blockId: string; query: string; activeIdx: number } | null;
  onMenuPick: (kind: ResolutionBlockKind) => void;
  onMenuMove: (delta: number) => void;
  onMenuConfirm: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
};

function BlockRow(props: BlockRowProps) {
  const {
    block, isFirst, placeholder, inputRef,
    onBodyChange, onToggleChecked, onToggleOpen,
    onEnter, onBackspaceEmpty,
    onSlashOpen, onSlashUpdate, onSlashClose,
    isMenuOpen, menu, onMenuPick, onMenuMove, onMenuConfirm,
    onAddBelow, onDelete
  } = props;

  const kind = blockKindOf(block);
  const isDivider = kind === "divider";

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Slash menu navigation while open.
    if (isMenuOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); onMenuMove(1); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); onMenuMove(-1); return; }
      if (e.key === "Enter")     { e.preventDefault(); onMenuConfirm(); return; }
      if (e.key === "Escape")    { e.preventDefault(); onSlashClose(); return; }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
      return;
    }
    if (e.key === "Backspace" && (block.text === "" || isDivider)) {
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }
  }

  function handleBodyChange(next: { html: string; text: string }) {
    onBodyChange(next);
    // "/foo" at the start of an otherwise-empty block opens the slash
    // menu. Match against plain text so a stray bold / italic span
    // doesn't break detection.
    const value = next.text;
    if (/^\/[a-z0-9 ]*$/i.test(value)) {
      const query = value.slice(1);
      if (isMenuOpen) onSlashUpdate(query);
      else onSlashOpen(query);
    } else if (isMenuOpen) {
      onSlashClose();
    }
  }

  // Divider blocks render an <hr> with a "type / to add a block" hint
  // wrapped in a focusable div so keyboard navigation still works.
  if (isDivider) {
    // Divider blocks aren't text-editable, so we keep using a plain
    // hidden <input> for keyboard nav (Backspace-to-delete, Enter-to-
    // insert-below) instead of routing them through the rich-text
    // surface. The BlockEditor's focus tracker uses RichTextInputHandle,
    // so wrap the input in a tiny shim that exposes the same methods.
    return (
      <div className="group relative flex items-center gap-2">
        <RowGutter onAdd={onAddBelow} onDelete={onDelete} />
        <div className="flex-1 py-2">
          <hr className="border-line" />
        </div>
        <DividerFocusTarget
          inputRef={inputRef}
          onEnter={onEnter}
          onBackspaceEmpty={onBackspaceEmpty}
        />
      </div>
    );
  }

  const inputClass = textClassFor(kind);
  const ph = placeholder || hintFor(kind, isFirst);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2",
        kind === "callout" && "rounded-xl border border-amber-400/30 bg-amber-500/10 px-2 py-1.5",
        kind === "quote"   && "border-l-4 border-brand-400/50 pl-3"
      )}
    >
      <RowGutter onAdd={onAddBelow} onDelete={onDelete} />

      <PrefixIcon
        kind={kind}
        checked={!!block.checked}
        open={!!block.open}
        onToggleChecked={onToggleChecked}
        onToggleOpen={onToggleOpen}
      />

      <RichTextInput
        ref={(handle) => inputRef(handle)}
        text={block.text}
        html={block.html}
        placeholder={ph}
        onChange={handleBodyChange}
        onKeyDown={onKeyDown}
        ariaLabel={hintFor(kind, isFirst)}
        className={cn("text-fg", inputClass)}
      />

      {isMenuOpen && menu && (
        <SlashMenu
          query={menu.query}
          activeIdx={menu.activeIdx}
          onPick={onMenuPick}
          onClose={onSlashClose}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider focus shim — exposes the same RichTextInputHandle interface as
// the rich-text surface so BlockEditor's `inputRefs` / `pendingFocus`
// tracker can treat divider blocks identically. The visible content of
// a divider is just an <hr>, so this hosts a hidden <input> that owns
// keyboard navigation (Enter / Backspace) for the row.
// ---------------------------------------------------------------------------

function DividerFocusTarget({
  inputRef,
  onEnter,
  onBackspaceEmpty
}: {
  inputRef: (el: RichTextInputHandle | null) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
}) {
  const localRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef({
      focus: () => localRef.current?.focus(),
      setCaretToEnd: () => localRef.current?.focus()
    });
    return () => inputRef(null);
  }, [inputRef]);

  return (
    <input
      ref={localRef}
      type="text"
      value=""
      readOnly
      aria-label="Divider"
      className="sr-only"
      onKeyDown={(e) => {
        if (e.key === "Backspace" || e.key === "Enter") {
          e.preventDefault();
          if (e.key === "Enter") onEnter();
          else onBackspaceEmpty();
        }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Slash menu
// ---------------------------------------------------------------------------

function SlashMenu({
  query,
  activeIdx,
  onPick,
  onClose
}: {
  query: string;
  activeIdx: number;
  onPick: (k: ResolutionBlockKind) => void;
  onClose: () => void;
}) {
  const filtered = useMemo(() => filterOptions(query), [query]);
  const ref = useRef<HTMLDivElement | null>(null);
  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  // Auto-scroll active item into view.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div
      ref={ref}
      className="absolute left-12 top-full z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-1 shadow-2xl"
      onMouseDown={(e) => e.preventDefault() /* keep focus in input */}
    >
      <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
        {filtered.length === 0 ? "No matches" : "Insert block"}
      </div>
      {filtered.map((opt, i) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.kind}
            type="button"
            data-idx={i}
            onClick={() => onPick(opt.kind)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
              i === activeIdx ? "bg-brand-500/15 text-brand-100" : "hover:bg-bg-soft/60 text-fg"
            )}
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-bg-soft/40 text-fg-muted">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1">
              <span className="block font-medium leading-tight">{opt.label}</span>
              <span className="block text-[11px] leading-tight text-fg-subtle">{opt.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block prefix (checkbox / number bullet / chevron / etc.)
// ---------------------------------------------------------------------------

function PrefixIcon({
  kind,
  checked,
  open,
  onToggleChecked,
  onToggleOpen
}: {
  kind: ResolutionBlockKind;
  checked: boolean;
  open: boolean;
  onToggleChecked: () => void;
  onToggleOpen: () => void;
}) {
  if (kind === "todo") {
    return (
      <button
        type="button"
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        aria-pressed={checked}
        onClick={onToggleChecked}
        className={cn(
          "mt-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none",
          checked ? "border-emerald-400 bg-emerald-500/30 text-emerald-100" : "border-line bg-bg-soft/40 text-transparent",
          "hover:border-emerald-400/80"
        )}
      >
        {checked ? "✓" : ""}
      </button>
    );
  }
  if (kind === "bigbox") {
    return (
      <button
        type="button"
        aria-label={checked ? "Mark big box undone" : "Mark big box done"}
        aria-pressed={checked}
        onClick={onToggleChecked}
        className={cn(
          "mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-[14px] leading-none",
          checked ? "border-brand-400 bg-brand-500/40 text-brand-50 ring-1 ring-brand-300/40" : "border-brand-400/60 bg-brand-500/10 text-transparent",
          "hover:border-brand-300"
        )}
      >
        {checked ? "✓" : ""}
      </button>
    );
  }
  if (kind === "toggle") {
    return (
      <button
        type="button"
        aria-label={open ? "Collapse toggle" : "Expand toggle"}
        aria-expanded={open}
        onClick={onToggleOpen}
        className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-bg-soft/60"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
    );
  }
  if (kind === "bullet") {
    return <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-fg-muted" />;
  }
  if (kind === "numbered") {
    return <span className="mt-1 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center text-[11px] font-medium text-fg-muted">•</span>;
  }
  if (kind === "callout") {
    return <Megaphone className="mt-1.5 h-4 w-4 shrink-0 text-amber-300" />;
  }
  if (kind === "quote") {
    return <Quote className="mt-1.5 h-4 w-4 shrink-0 text-brand-300" />;
  }
  // text / h1 / h2 / h3 — no prefix.
  return <span className="mt-1.5 inline-block h-3.5 w-3.5 shrink-0" aria-hidden />;
}

// ---------------------------------------------------------------------------
// Hover gutter on the left edge — Notion-like + / drag handle.
// (Drag-to-reorder is intentionally not implemented yet; the grip is a
// visual affordance plus a delete shortcut.)
// ---------------------------------------------------------------------------

function RowGutter({ onAdd, onDelete }: { onAdd: () => void; onDelete: () => void }) {
  return (
    <div className="pointer-events-none absolute -left-9 top-0 hidden h-full items-start pt-1.5 group-hover:flex group-focus-within:flex">
      <div className="pointer-events-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Insert block below"
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-soft/60 hover:text-fg"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete block"
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-soft/60 hover:text-danger"
        >
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-kind input styling.
// ---------------------------------------------------------------------------

function textClassFor(kind: ResolutionBlockKind): string {
  switch (kind) {
    case "h1": return "text-xl font-bold leading-snug";
    case "h2": return "text-lg font-semibold leading-snug";
    case "h3": return "text-base font-semibold leading-snug";
    case "callout": return "text-sm text-amber-100";
    case "quote": return "text-sm italic text-brand-100";
    case "bigbox": return "text-base font-medium leading-snug";
    default: return "text-sm leading-snug";
  }
}

function hintFor(kind: ResolutionBlockKind, isFirst: boolean): string {
  if (isFirst) {
    return "Type '/' for commands";
  }
  switch (kind) {
    case "h1": return "Heading 1";
    case "h2": return "Heading 2";
    case "h3": return "Heading 3";
    case "todo": return "To-do";
    case "bigbox": return "Big-box goal";
    case "bullet": return "Bullet";
    case "numbered": return "List item";
    case "toggle": return "Toggle";
    case "callout": return "Callout";
    case "quote": return "Quote";
    default: return "Type '/' for commands";
  }
}
