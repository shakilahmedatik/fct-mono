import sanitizeHtml from "sanitize-html";

/**
 * Tags permitted in LLM-generated article HTML.
 *
 * Model output is treated as untrusted: it is produced from scraped RSS content
 * that any third party controls, so it may contain injected instructions and
 * arbitrary markup. Everything not listed here is stripped.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "hr",
  "figure",
  "figcaption",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  code: ["class"],
  pre: ["class"],
  th: ["colspan", "rowspan", "scope"],
  td: ["colspan", "rowspan"],
};

/**
 * Only absolute http(s) URLs are allowed. Blocks `javascript:`, `data:`,
 * `vbscript:` and other script-bearing schemes.
 */
function isAllowedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { a: ["http", "https", "mailto"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      if (!isAllowedUrl(href)) {
        return { tagName: "span", attribs: {} };
      }
      return {
        tagName,
        attribs: {
          ...attribs,
          // Neutralise reverse-tabnabbing and open in a new tab safely.
          rel: "noopener noreferrer nofollow",
          ...(attribs.target ? { target: "_blank" } : {}),
        },
      };
    },
    img: (tagName, attribs) => {
      const src = attribs.src ?? "";
      if (!isAllowedUrl(src)) {
        return { tagName: "span", attribs: {} };
      }
      return {
        tagName,
        attribs: { ...attribs, loading: attribs.loading ?? "lazy" },
      };
    },
  },
};

/**
 * Sanitise LLM-generated HTML before it is persisted or rendered.
 *
 * This is the trust boundary for the blog pipeline: raw model output is never
 * stored or rendered without passing through here first.
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Strip all markup from a string and collapse whitespace, producing text that
 * is safe to place inside an HTML text node or a Telegram caption.
 */
export function sanitizePlainText(text: string): string {
  if (!text) return "";
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

/**
 * True when a URL is safe to place in an `href`/`src` attribute.
 */
export function isSafeHttpUrl(url: string): boolean {
  return isAllowedUrl(url);
}

/**
 * Escape a string for interpolation into a Telegram HTML message.
 *
 * Telegram's HTML mode recognises only a small tag set and rejects unbalanced
 * markup with `400 Bad Request: can't parse entities`, so every interpolated
 * value must be escaped.
 */
export function escapeTelegramHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
