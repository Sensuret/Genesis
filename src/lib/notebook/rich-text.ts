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
// We deliberately keep this dependency-free — there's nothing in
// our bundle we can reuse, and pulling in DOMPurify for four tags
// would add ~20KB for no gain.
// =====================================================================

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "BR"]);

/**
 * Strip every element / attribute except the small inline-formatting
 * whitelist above. Returns the sanitized `innerHTML` of a detached
 * container. Safe to feed straight into `dangerouslySetInnerHTML`.
 *
 * - `<script>`, `<style>`, event handlers, inline styles etc. are
 *   removed.
 * - Any disallowed tag has its children unwrapped so visible text
 *   survives — e.g. a pasted `<div>hello</div>` becomes `hello`.
 */
export function sanitizeInlineHtml(raw: string): string {
  if (!raw) return "";
  if (typeof window === "undefined") {
    // SSR safety: fall back to plaintext so we never ship unescaped
    // attacker-controlled HTML down the server-rendered path.
    return escapeHtml(raw.replace(/<[^>]+>/g, ""));
  }
  const tpl = document.createElement("div");
  tpl.innerHTML = raw;
  walkAndClean(tpl);
  return tpl.innerHTML;
}

function walkAndClean(node: Element): void {
  // Iterate in reverse so splicing children doesn't skip nodes.
  const children = Array.from(node.children);
  for (const child of children) {
    walkAndClean(child);
    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Replace disallowed element with its (already-cleaned) children.
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
    } else {
      // Strip every attribute from allowed tags too.
      for (const attr of Array.from(child.attributes)) {
        child.removeAttribute(attr.name);
      }
    }
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns the plain-text equivalent of a (possibly-sanitized) HTML
 * fragment. Used to keep `ResolutionItem.text` in sync with `html` so
 * legacy readers still get something sensible.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  }
  const tpl = document.createElement("div");
  tpl.innerHTML = html;
  return (tpl.textContent ?? "").replace(/\u00a0/g, " ");
}

/**
 * Wraps a plain string in HTML-escaped form with no formatting. Used as
 * the initial `html` for legacy rows that only have `text`.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  return escapeHtml(text).replace(/\n/g, "<br>");
}
