"use client";

// =====================================================================
// Single-line(ish) rich-text input for the Resolutions block editor.
//
// Wraps a contentEditable div so users can apply inline formatting —
// **bold** (Ctrl/⌘+B), *italic* (Ctrl/⌘+I), underline (Ctrl/⌘+U) — to
// any selection inside a block. Persists both the cleaned HTML and a
// plain-text fallback via onChange.
//
// Why contentEditable instead of a fancier editor library:
// - Genesis only needs three inline marks. TipTap / Slate / Lexical
//   would each add 50KB+ for no real gain.
// - The block-level UX (slash menu, Enter inserts new block, Backspace
//   on empty deletes, etc.) is already implemented in BlockEditor and
//   would have to be re-bridged on top of any third-party editor.
// =====================================================================

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import { cn } from "@/lib/utils";
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeInlineHtml
} from "@/lib/notebook/rich-text";

export type RichTextInputHandle = {
  focus: () => void;
  setCaretToEnd: () => void;
};

type RichTextInputProps = {
  /** Sanitized HTML body (preferred). Falls back to `text` when empty. */
  html?: string;
  /** Plain-text body — used when `html` is empty (legacy rows). */
  text: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  /** Fires on every input event with both shapes synced. */
  onChange: (next: { html: string; text: string }) => void;
  /** Forwarded keydown — BlockEditor uses this for Enter / Backspace /
   *  arrow-key handling and slash menu nav. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Single-line by default (Enter is intercepted upstream). Multi-line
   *  is allowed for rich-text quirks like soft breaks (Shift+Enter). */
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
};

/** Returns the initial HTML to seed the contentEditable with. */
function seedHtmlFor(html: string | undefined, text: string): string {
  if (html && html.trim()) return sanitizeInlineHtml(html);
  return plainTextToHtml(text);
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
  function RichTextInput(
    { html, text, placeholder, className, ariaLabel, onChange, onKeyDown, onPaste },
    ref
  ) {
    const elRef = useRef<HTMLDivElement | null>(null);
    // Track what we last wrote into the DOM so we can detect "external"
    // updates (block kind change that clears text, undo from parent…)
    // without resetting innerHTML on every keystroke (which would nuke
    // the user's caret position mid-typing).
    const lastSeededRef = useRef<string>("");

    useImperativeHandle(
      ref,
      () => ({
        focus: () => elRef.current?.focus(),
        setCaretToEnd: () => {
          const el = elRef.current;
          if (!el) return;
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }),
      []
    );

    // Mount: seed the contentEditable with the initial value (sanitized).
    // We deliberately avoid putting the seed in the JSX dangerouslySetInnerHTML
    // because React would then keep trying to reconcile it on every parent
    // render, which conflicts with the user's keystrokes.
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const seed = seedHtmlFor(html, text);
      if (lastSeededRef.current === "" && seed !== el.innerHTML) {
        el.innerHTML = seed;
        lastSeededRef.current = seed;
      }
    }, [html, text]);

    // Watch for external resets (e.g. slash menu transforms a block from
    // text → heading and clears text=""). When the parent's text+html
    // both shrink to empty but the DOM still has content, reseed.
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const seed = seedHtmlFor(html, text);
      // Only reseed when the parent value differs from what we last
      // wrote AND from the live DOM value — that means it's an external
      // change, not just an echo of our own onChange.
      const live = el.innerHTML;
      if (seed !== live && seed !== lastSeededRef.current) {
        // Preserve focus: capture if the element is currently focused
        // and we should restore caret-to-end after the reseed.
        const wasFocused = document.activeElement === el;
        el.innerHTML = seed;
        lastSeededRef.current = seed;
        if (wasFocused) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }, [html, text]);

    const fireChange = useCallback(() => {
      const el = elRef.current;
      if (!el) return;
      let cleanHtml = sanitizeInlineHtml(el.innerHTML);
      const plainText = htmlToPlainText(cleanHtml);
      // When the user deletes all text, browsers keep a stray `<br>`
      // inside the contentEditable so the caret has somewhere to sit.
      // That stray `<br>` means the element no longer matches `:empty`,
      // so the CSS placeholder (including the "/" hint) never comes
      // back. Detect the effectively-empty state and flush the DOM +
      // persisted html to "" so the next render shows the placeholder
      // again.
      if (!plainText.trim()) {
        if (el.innerHTML !== "") el.innerHTML = "";
        cleanHtml = "";
      }
      lastSeededRef.current = cleanHtml;
      onChange({ html: cleanHtml, text: plainText });
    }, [onChange]);

    const handleInput = useCallback(() => {
      fireChange();
    }, [fireChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Inline-formatting shortcuts. Use the platform meta key on macOS.
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && !e.altKey) {
          const k = e.key.toLowerCase();
          if (k === "b" || k === "i" || k === "u") {
            e.preventDefault();
            const cmd = k === "b" ? "bold" : k === "i" ? "italic" : "underline";
            // execCommand is "deprecated" but still the only universally
            // supported way to toggle inline formatting on a contentEditable
            // surface. The replacement (Selection / Range manipulation)
            // would require us to ship our own toggling logic for marks
            // that already work natively here.
            document.execCommand(cmd);
            fireChange();
            return;
          }
        }
        onKeyDown?.(e);
      },
      [fireChange, onKeyDown]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        if (onPaste) {
          onPaste(e);
          if (e.defaultPrevented) return;
        }
        // Default to plain-text paste so an unsuspecting Cmd+V from a
        // styled webpage doesn't dump arbitrary HTML / styles / colours
        // into the resolution.
        e.preventDefault();
        const t = e.clipboardData.getData("text/plain");
        if (t) document.execCommand("insertText", false, t);
        fireChange();
      },
      [fireChange, onPaste]
    );

    return (
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          // Tailwind doesn't have a built-in placeholder pseudo for
          // contentEditable; this CSS lives in globals.css under
          // `[contenteditable][data-placeholder]:empty::before`.
          "rich-text-input flex-1 bg-transparent outline-none whitespace-pre-wrap break-words",
          className
        )}
      />
    );
  }
);
