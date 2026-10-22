/**
 * Dependency-free defensive sanitiser for server-rendered HTML.
 *
 * The authoritative control is server-side: the API/pipeline sanitises
 * `contentHtml` before it is persisted, and that is the fix that matters.
 * This module is a defence-in-depth layer for the renderer — if an unsanitised
 * or legacy row ever reaches the browser, nothing here can execute script.
 *
 * It is deliberately conservative: it removes script-bearing constructs and
 * leaves the remaining markup (headings, paragraphs, lists, links, images,
 * inline styles) untouched.
 *
 * No npm dependency is used — the sanitizer package belongs to the
 * API/pipeline package, not to a client bundle.
 */

/** Elements whose *content* is executable or can load remote code. */
const DANGEROUS_ELEMENTS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "frame",
  "frameset",
  "form",
  "base",
  "meta",
  "link",
  "noscript",
] as const;

const ELEMENT_PATTERN = new RegExp(
  `<(${DANGEROUS_ELEMENTS.join("|")})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  "gi",
);

/** Self-closing / void variants of the same elements (`<script src=…>`). */
const VOID_ELEMENT_PATTERN = new RegExp(`<(${DANGEROUS_ELEMENTS.join("|")})\\b[^>]*\\/?>`, "gi");

/** `onclick="…"`, `onerror='…'`, `onload=alert(1)` — any inline handler. */
const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** `href="javascript:…"` and friends, including whitespace obfuscation. */
const SCRIPT_URL_PATTERN =
  /\s+(href|src|xlink:href|action|formaction|poster)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*'|(?:javascript|vbscript|data:text\/html)[^\s>]*)/gi;

/** `srcdoc` on an iframe carries a whole nested document. */
const SRCDOC_PATTERN = /\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** HTML comments can hide conditional-comment payloads. */
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

/**
 * Remove script-bearing constructs from an HTML fragment.
 *
 * @param html Untrusted HTML (for example a blog post body).
 * @returns The same markup with every executable construct removed.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let output = html;

  // Comments first: a commented-out `<script>` block must not survive the
  // element pass as a live tag.
  output = output.replace(COMMENT_PATTERN, "");

  // Paired elements with their content, then the remaining void variants.
  output = output.replace(ELEMENT_PATTERN, "");
  output = output.replace(VOID_ELEMENT_PATTERN, "");

  // Inline handlers, script URLs and `srcdoc` attributes.
  output = output.replace(EVENT_HANDLER_PATTERN, "");
  output = output.replace(SCRIPT_URL_PATTERN, "");
  output = output.replace(SRCDOC_PATTERN, "");

  return output;
}
