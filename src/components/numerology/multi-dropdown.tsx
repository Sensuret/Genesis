"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option<V extends string | number> = {
  value: V;
  label: string;
};

type MultiDropdownProps<V extends string | number> = {
  label: string;
  options: Option<V>[];
  selected: V[];
  onChange: (next: V[]) => void;
  /** Optional pluralised noun for the empty placeholder (e.g. "Any sign"). */
  emptyLabel?: string;
  className?: string;
};

/**
 * Compact dropdown with checkboxes — used in the numerology filter bar.
 * Closes on outside click. Selected items show as a count chip on the
 * trigger button.
 */
export function MultiDropdown<V extends string | number>({
  label,
  options,
  selected,
  onChange,
  emptyLabel = "Any",
  className
}: MultiDropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(v: V) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-soft px-3 py-1.5 text-xs",
          selected.length > 0
            ? "text-fg border-brand-400/50"
            : "text-fg-muted hover:border-brand-400/40"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            <span className="text-fg-subtle">{label}:</span>{" "}
            <span className="font-medium">
              {selected.length === 0
                ? emptyLabel
                : selected.length === 1
                  ? options.find((o) => o.value === selected[0])?.label ?? String(selected[0])
                  : `${selected.length} selected`}
            </span>
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-1 shadow-card">
          {options.map((o) => {
            const isOn = selected.includes(o.value);
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition",
                  isOn
                    ? "bg-brand-500/15 text-brand-200"
                    : "text-fg-muted hover:bg-bg-soft hover:text-fg"
                )}
              >
                <span>{o.label}</span>
                {isOn && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[11px] text-fg-subtle hover:border-danger hover:text-danger"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
