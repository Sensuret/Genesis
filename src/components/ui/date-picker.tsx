"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays
} from "date-fns";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string; // yyyy-mm-dd
  onChange: (next: string) => void;
  className?: string;
  inputClassName?: string;
  /** When true, renders only the calendar icon button without the date pill. */
  iconOnly?: boolean;
  /** Optional bounds; pass undefined for open-ended. */
  min?: string;
  max?: string;
  placeholder?: string;
  /** Defaults to "MMM d, yyyy". */
  displayFormat?: string;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function safeParse(value: string | undefined): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const POPOVER_WIDTH = 288; // matches w-72

export function DatePicker({
  value,
  onChange,
  className,
  inputClassName,
  iconOnly = false,
  min,
  max,
  placeholder = "Select date",
  displayFormat = "MMM d, yyyy"
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const selected = safeParse(value);
  const minDate = safeParse(min);
  const maxDate = safeParse(max);

  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());

  useEffect(() => {
    if (open) setViewMonth(selected ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Position the portalled popover relative to the trigger using viewport coords.
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    function reposition() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(rect.right - POPOVER_WIDTH, 8),
        window.innerWidth - POPOVER_WIDTH - 8
      );
      const top = rect.bottom + 8;
      setCoords({ top, left });
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Close on outside click / escape — accounts for the portalled popover.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const out: Date[] = [];
    let cur = start;
    while (!isAfter(cur, end)) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [viewMonth]);

  const years = useMemo(() => {
    const center = viewMonth.getFullYear();
    const startY = (minDate ?? new Date(center - 80, 0, 1)).getFullYear();
    const endY = (maxDate ?? new Date(center + 20, 11, 31)).getFullYear();
    const arr: number[] = [];
    for (let y = endY; y >= startY; y--) arr.push(y);
    return arr;
  }, [viewMonth, minDate, maxDate]);

  function disabled(d: Date): boolean {
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    return false;
  }

  function pick(d: Date) {
    onChange(toIso(d));
    setOpen(false);
  }

  const popover = open && coords ? (
    <div
      ref={popoverRef}
      className="fixed z-[1000] w-72 rounded-2xl border border-line bg-bg-elevated p-3 shadow-2xl"
      style={{ top: coords.top, left: coords.left }}
      role="dialog"
      aria-label="Choose a date"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition hover:text-fg hover:border-brand-400/60"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={viewMonth.getMonth()}
            onChange={(e) => {
              const m = Number(e.target.value);
              setViewMonth((v) => new Date(v.getFullYear(), m, 1));
            }}
            className="h-8 rounded-lg border border-line bg-bg px-2 text-xs font-medium text-fg outline-none focus:border-brand-400"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {format(new Date(2000, i, 1), "MMMM")}
              </option>
            ))}
          </select>
          <select
            value={viewMonth.getFullYear()}
            onChange={(e) => {
              const y = Number(e.target.value);
              setViewMonth((v) => new Date(y, v.getMonth(), 1));
            }}
            className="h-8 rounded-lg border border-line bg-bg px-2 text-xs font-medium text-fg outline-none focus:border-brand-400"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="Next month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition hover:text-fg hover:border-brand-400/60"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-fg-subtle">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="px-0.5 py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isCurrentMonth = isSameMonth(d, viewMonth);
          const isSelected = selected ? isSameDay(d, selected) : false;
          const isToday = isSameDay(d, new Date());
          const isDisabled = disabled(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => pick(d)}
              className={cn(
                "h-8 rounded-md text-xs font-medium transition",
                isCurrentMonth ? "text-fg" : "text-fg-subtle",
                !isDisabled && !isSelected && "hover:bg-bg-soft hover:text-fg",
                isSelected
                  ? "bg-brand-500 text-white shadow-md ring-2 ring-brand-500/40"
                  : isToday
                    ? "ring-1 ring-brand-400/60"
                    : "",
                isDisabled && "cursor-not-allowed opacity-30"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-fg-muted transition hover:border-brand-400/60 hover:text-fg"
          onClick={() => {
            const today = new Date();
            if (disabled(today)) return;
            pick(today);
          }}
        >
          Today
        </button>
        {value ? (
          <button
            type="button"
            className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-fg-muted transition hover:border-danger/60 hover:text-danger"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn("relative inline-flex items-center gap-2", className)}>
      {!iconOnly && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 hover:border-brand-400/60",
            !selected && "text-fg-subtle",
            inputClassName
          )}
        >
          {selected ? format(selected, displayFormat) : placeholder}
        </button>
      )}
      <button
        type="button"
        aria-label="Open calendar"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted outline-none transition hover:border-brand-400/60 hover:text-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30",
          iconOnly ? "" : ""
        )}
      >
        <Calendar className="h-4 w-4" />
      </button>

      {typeof document !== "undefined" && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
