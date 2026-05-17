// =====================================================================
// Bidirectional conversion between plain-text strings and a
// `ResolutionItem[]` block list, used by every free-form writing
// surface that's adopted the Notion-style BlockEditor:
// Scratchpad, Notes edit modal, Playbooks general rules / notes,
// Numerology Reflection prompts.
//
// We persist BOTH representations alongside each other:
//
//   * `body` (the legacy string field) is the source of truth for
//     search, .txt exports, screenshot fallbacks and any downstream
//     consumer that hasn't been updated to read blocks.
//   * `body_blocks` (the new field) is the source of truth for the
//     in-app editor surface so block kinds (headings, callouts,
//     toggles, …) round-trip.
//
// On load, if `body_blocks` is present and non-empty we use it as the
// editor's starting state. Otherwise we hydrate from the legacy string
// by splitting on blank-line paragraph breaks — each paragraph becomes
// its own text block, so a multi-paragraph legacy note doesn't collapse
// into one giant paragraph the first time the user opens it.
//
// On save, we always persist both: the editor emits the new block
// array, and we flatten that array back to a plain string for the
// legacy field.
// =====================================================================

import type { ResolutionItem } from "@/lib/supabase/types";

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convert a plain-text string into a `ResolutionItem[]` block array
 * suitable for seeding the BlockEditor. Each paragraph (separated by
 * a blank line) becomes its own `kind: "text"` block; single newlines
 * inside a paragraph survive as literal `\n` inside the block's text.
 *
 * The block kind defaults to "text" because every callsite using this
 * helper passes a free-form writing surface where paragraphs (not
 * checkboxes) are the expected unit.
 *
 * An empty / whitespace-only input yields a single empty text block,
 * matching the BlockEditor's own zero-block invariant so the surface
 * never renders as collapsed-to-nothing.
 */
export function blocksFromPlainText(text: string): ResolutionItem[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [{ id: newId(), text: "", kind: "text" }];
  // Split on blank-line paragraph breaks. Trailing / leading whitespace
  // on each paragraph is preserved so the user's intentional indentation
  // survives the round-trip.
  const paragraphs = trimmed.split(/\n\s*\n/);
  return paragraphs.map((p) => ({ id: newId(), text: p, kind: "text" as const }));
}

/**
 * Flatten a `ResolutionItem[]` block array back to a single plain-text
 * string for legacy storage / exports / search. The output is meant to
 * look like what a human would type into a normal Textarea:
 *
 *   * Each block's plain `text` is the visible content.
 *   * Heading kinds get prefixed with their markdown-ish marker
 *     ("# ", "## ", "### ") so a flat reader (.txt download, terminal
 *     grep, plain `<pre>` render) can still tell sections apart.
 *   * Bullet / numbered / todo / bigbox blocks get a leading marker
 *     ("- ", "1. ", "[ ] ", "[X] ") for the same reason.
 *   * Quote blocks get a leading "> ".
 *   * Divider blocks become a "---" line.
 *   * Toggle / callout blocks emit their own text, followed by their
 *     children recursively indented by two spaces.
 *
 * Empty blocks emit an empty line so paragraph breaks in the source
 * blocks survive the flatten.
 */
export function plainTextFromBlocks(blocks: ResolutionItem[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return flattenBlocks(blocks, 0).trimEnd();
}

function flattenBlocks(blocks: ResolutionItem[], depth: number): string {
  const indent = "  ".repeat(depth);
  let numberCounter = 0;
  let lastWasNumbered = false;
  const lines: string[] = [];
  for (const b of blocks) {
    const kind = b.kind ?? "text";
    const text = b.text ?? "";
    if (kind === "numbered") {
      if (!lastWasNumbered) numberCounter = 0;
      numberCounter += 1;
      lastWasNumbered = true;
    } else {
      lastWasNumbered = false;
      numberCounter = 0;
    }
    lines.push(formatLine(kind, text, b.checked, numberCounter, indent));
    if ((kind === "toggle" || kind === "callout") && Array.isArray(b.children) && b.children.length > 0) {
      const inner = flattenBlocks(b.children, depth + 1);
      if (inner) lines.push(inner);
    }
  }
  return lines.join("\n");
}

function formatLine(
  kind: NonNullable<ResolutionItem["kind"]>,
  text: string,
  checked: boolean | undefined,
  numberIdx: number,
  indent: string
): string {
  switch (kind) {
    case "h1":       return `${indent}# ${text}`;
    case "h2":       return `${indent}## ${text}`;
    case "h3":       return `${indent}### ${text}`;
    case "bullet":   return `${indent}- ${text}`;
    case "numbered": return `${indent}${numberIdx}. ${text}`;
    case "todo":     return `${indent}[${checked ? "x" : " "}] ${text}`;
    case "bigbox":   return `${indent}[${checked ? "X" : " "}] ${text}`;
    case "quote":    return `${indent}> ${text}`;
    case "divider":  return `${indent}---`;
    case "toggle":
    case "callout":
    case "text":
    default:
      return `${indent}${text}`;
  }
}

/**
 * Pick the appropriate seed for a BlockEditor: prefer existing blocks
 * if present, fall back to hydrating from the legacy string field.
 *
 *   * If `blocks` is a non-empty array, returns it untouched (assumes
 *     the caller already validated it).
 *   * Otherwise calls `blocksFromPlainText(text)` so the surface
 *     always has at least one editable block, even for brand-new /
 *     empty entries.
 */
export function hydrateBlocks(
  blocks: ResolutionItem[] | undefined | null,
  text: string | undefined | null
): ResolutionItem[] {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  return blocksFromPlainText(text ?? "");
}

/**
 * Lightweight runtime guard for incoming JSON — used by every loader
 * that hydrates blocks from Supabase / localStorage. We only insist on
 * the *shape* (id + text strings); kind / children / html are optional
 * and the BlockEditor tolerates anything missing. Anything malformed
 * triggers a null return so the caller falls back to plain-text hydrate.
 */
export function isResolutionItemArray(value: unknown): value is ResolutionItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (it) =>
      it !== null &&
      typeof it === "object" &&
      typeof (it as { id?: unknown }).id === "string" &&
      typeof (it as { text?: unknown }).text === "string"
  );
}
