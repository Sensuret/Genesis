"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Palette, X } from "lucide-react";
import {
  GRADIENT_SWATCHES,
  SOLID_SWATCHES
} from "@/lib/notebook/resolution-backgrounds";
import type { ResolutionBackground } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Props = {
  value: ResolutionBackground | undefined;
  onChange: (bg: ResolutionBackground) => void;
  /** When true the picker is rendered as a small ring icon that expands on
   *  click into a draggable floating popover (used inside the modal
   *  toolbar). When false it renders inline always-open (used on the
   *  Create form). */
  compact?: boolean;
};

function isActive(value: ResolutionBackground | undefined, kind: "theme" | "solid" | "gradient", id?: string): boolean {
  if (!value) return kind === "theme";
  if (kind === "theme") return value.kind === "theme";
  if (kind === "solid") return value.kind === "solid" && value.color === id;
  if (kind === "gradient") return value.kind === "gradient" && value.preset === id;
  return false;
}

export function ResolutionBgPicker({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(!compact);
  // Floating-popover position. Anchored just under the trigger when first
  // opened; the user can drag the title bar to move it anywhere on screen
  // so it never blocks the resolution being styled.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; active: boolean } | null>(null);

  // Anchor under the trigger the first time the user opens the picker.
  useEffect(() => {
    if (!compact) return;
    if (!open) return;
    if (pos) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const popW = 320;
    const padding = 12;
    // Default to placing the popover under-right of the trigger but keep
    // it inside the viewport so it doesn't get cut off on small screens.
    const x = Math.min(window.innerWidth - popW - padding, Math.max(padding, rect.right - popW));
    const y = Math.min(window.innerHeight - 360, rect.bottom + 8);
    setPos({ x, y });
  }, [compact, open, pos]);

  // Close the popover when the user clicks anywhere outside it.
  useEffect(() => {
    if (!compact || !open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [compact, open]);

  // Drag support — header bar is grabbable; mouse-move repositions the
  // popover; mouse-up ends the drag. Listeners are attached at the document
  // level only while a drag is in progress.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current?.active) return;
      const popW = popRef.current?.offsetWidth ?? 320;
      const popH = popRef.current?.offsetHeight ?? 320;
      const padding = 6;
      const x = Math.max(
        padding,
        Math.min(window.innerWidth - popW - padding, e.clientX - dragRef.current.dx)
      );
      const y = Math.max(
        padding,
        Math.min(window.innerHeight - popH - padding, e.clientY - dragRef.current.dy)
      );
      setPos({ x, y });
    }
    function onUp() {
      if (dragRef.current) dragRef.current.active = false;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    if (!popRef.current) return;
    const rect = popRef.current.getBoundingClientRect();
    dragRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      active: true
    };
    e.preventDefault();
  }

  const trigger = compact && (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-fg/20 shadow-inner transition hover:scale-110"
      style={{
        background:
          "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)"
      }}
      aria-label="Pick background"
      aria-expanded={open}
      title="Background colour"
    >
      <Palette className="h-3.5 w-3.5 text-white drop-shadow" />
    </button>
  );

  const panelInner = (
    <>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          Theme
        </div>
        <button
          type="button"
          onClick={() => onChange({ kind: "theme" })}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition",
            isActive(value, "theme")
              ? "border-brand-400 bg-brand-500/10 text-fg"
              : "border-line bg-bg-soft/40 text-fg-muted hover:border-brand-400 hover:text-fg"
          )}
        >
          <span>App default (reacts to theme)</span>
          {isActive(value, "theme") && <Check className="h-3.5 w-3.5 text-brand-300" />}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          Solid colours
        </div>
        <div className="flex flex-wrap gap-2">
          {SOLID_SWATCHES.map((sw) => (
            <button
              key={sw.id}
              type="button"
              onClick={() => onChange({ kind: "solid", color: sw.id })}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition",
                isActive(value, "solid", sw.id)
                  ? "border-brand-400 ring-2 ring-brand-400/40 ring-offset-2 ring-offset-bg-elevated"
                  : "border-fg/20 hover:scale-110"
              )}
              style={{ background: sw.css }}
              aria-label={sw.label}
              title={sw.label}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
          Preset gradients
        </div>
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_SWATCHES.map((sw) => (
            <button
              key={sw.id}
              type="button"
              onClick={() => onChange({ kind: "gradient", preset: sw.id })}
              className={cn(
                "aspect-square rounded-xl border-2 transition",
                isActive(value, "gradient", sw.id)
                  ? "border-brand-400 ring-2 ring-brand-400/40 ring-offset-2 ring-offset-bg-elevated"
                  : "border-fg/20 hover:scale-110"
              )}
              style={{ background: sw.css }}
              aria-label={sw.label}
              title={sw.label}
            />
          ))}
        </div>
      </div>
    </>
  );

  if (!compact) {
    return (
      <div className="relative">
        <div className="space-y-3 w-full">{panelInner}</div>
      </div>
    );
  }

  return (
    <div className="relative inline-flex">
      {trigger}
      {open && pos && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Resolution background picker"
          className="fixed z-[1300] w-[320px] rounded-xl border border-line bg-bg-elevated shadow-2xl"
          style={{ left: pos.x, top: pos.y }}
        >
          {/* Drag handle / header */}
          <div
            onMouseDown={startDrag}
            className="flex cursor-grab items-center justify-between gap-2 rounded-t-xl border-b border-line bg-bg-soft/60 px-3 py-2 active:cursor-grabbing"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              <GripVertical className="h-3.5 w-3.5" />
              Background
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-subtle hover:bg-bg/60 hover:text-fg"
              aria-label="Close picker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-auto p-3">{panelInner}</div>
          <div className="border-t border-line px-3 py-2 text-[10px] text-fg-subtle">
            Tip — drag the title bar to move this anywhere; click the ring or press Esc to close.
          </div>
        </div>
      )}
    </div>
  );
}
