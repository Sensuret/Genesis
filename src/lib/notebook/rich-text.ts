// =====================================================================
// Tiny inline-only HTML sanitizer for the Resolutions block editor.
//
// The BlockEditor persists a block's body as both plain `text` (for
// search / exports / legacy rendering) and `html` (for inline
// formatting — bold / italic / underline). Because the HTML comes
// from a contentEditable surface it can carry arbitrary tags / attrs
// pasted in from elsewhere, so we whitelist a small set of inline
// tags (b, strong, i, em, u, br) and strip everything else before
// either persisting or rendering.
//
// Implementation is a regex-based string transform on purpose: we
// need to produce *byte-identical* output on the server (Next.js
// SSR pre-render) and the client (hydration / re-render), otherwise
// React reports a hydration mismatch and re-paints the subtree —
// causing a visible flash from "unformatted" to "formatted" text.
// A DOM-based sanitizer would only run on the client, so we'd
// always mismatch.
//
// We deliberately keep this dependency-free — there's nothing in
// our bundle we can reuse, and pulling in DOMPurify for four tags
// would add ~20KB for no gain.
// =====================================================================

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "br"]);
const VOID_TAGS = new Set(["br"]);

/**
 * Strip every element / attribute except the small inline-formatting
 * whitelist above. Safe to feed straight into `dangerouslySetInnerHTML`.
 *
 * - `<script>`, `<style>`, comments, CDATA blocks, event handlers,
 *   inline styles, etc. are removed entirely (including their content
 *   for script / style).
 * - Disallowed tags are dropped while their *text content* survives
 *   (so a pasted `<div>hello</div>` becomes `hello`).
 * - Allowed tags are normalised to lowercase and have all attributes
 *   stripped.
 *
 * Runs identically on server and client so SSR + hydration match.
 */
export function sanitizeInlineHtml(raw: string): string {
  if (!raw) return "";

  // 1. Drop script / style blocks entirely (tag + content).
  let s = raw.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");
  // Also drop unterminated script / style openers — refuse to leak any
  // executable content even if the input was truncated.
  s = s.replace(/<(script|style)\b[\s\S]*$/gi, "");

  // 2. Drop HTML comments and CDATA sections.
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  // 3. Walk every remaining tag. Allowed tags are emitted bare
  //    (no attributes); disallowed tags are dropped while text between
  //    them survives. Unmatched `<` characters are preserved as-is —
  //    contentEditable.innerHTML always entity-escapes literal `<`
  //    typed by the user, so any raw `<` here is an actual tag start.
  s = s.replace(
    /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g,
    (_match, tagRaw: string) => {
      const tag = tagRaw.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      const isClosing = /^<\s*\//.test(_match);
      if (VOID_TAGS.has(tag)) {
        // <br> is void — never emit </br>; collapse both forms to <br>.
        return "<br>";
      }
      return isClosing ? `</${tag}>` : `<${tag}>`;
    }
  );

  // 4. Strip any stray remaining `<` / `>` that didn't form a tag.
  //    contentEditable should never produce these, but a hostile paste
  //    payload might.
  // (Skipped — leaving raw `<` alone is safer than mangling text that
  // the user actually typed; the regex above already removed every
  // tag-shaped match, so what's left is plain text.)

  return s;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0"
};

function decodeHtmlEntities(raw: string): string {
  return raw.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const cp = parseInt(body.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    if (body.startsWith("#")) {
      const cp = parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    const lower = body.toLowerCase();
    return HTML_ENTITIES[lower] ?? match;
  });
}

/**
 * Returns the plain-text equivalent of a (possibly-sanitized) HTML
 * fragment. Used to keep `ResolutionItem.text` in sync with `html` so
 * legacy readers still get something sensible.
 *
 * Regex-based on purpose so server and client return identical output
 * (see comment on sanitizeInlineHtml above).
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  return s.replace(/\u00a0/g, " ");
}

/**
 * Wraps a plain string in HTML-escaped form with no formatting. Used as
 * the initial `html` for legacy rows that only have `text`.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  return escapeHtml(text).replace(/\n/g, "<br>");
}
