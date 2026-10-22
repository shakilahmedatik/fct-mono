import { describe, expect, it } from "bun:test";
import {
  escapeTelegramHtml,
  isSafeHttpUrl,
  sanitizeHtmlContent,
  sanitizePlainText,
} from "./sanitize";

describe("sanitizeHtmlContent", () => {
  it("keeps ordinary formatting markup", () => {
    const html = "<p>Hello <strong>world</strong></p><ul><li>One</li></ul>";
    const result = sanitizeHtmlContent(html);
    expect(result).toContain("<strong>world</strong>");
    expect(result).toContain("<li>One</li>");
  });

  it("removes script tags", () => {
    const result = sanitizeHtmlContent("<p>ok</p><script>alert(1)</script>");
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert(1)");
  });

  it("removes inline event handlers", () => {
    const result = sanitizeHtmlContent('<img src="https://x.com/a.png" onerror="alert(1)">');
    expect(result.toLowerCase()).not.toContain("onerror");
  });

  it("removes javascript: URLs", () => {
    const result = sanitizeHtmlContent('<a href="javascript:alert(1)">click</a>');
    expect(result.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps https links but neutralises the target", () => {
    const result = sanitizeHtmlContent('<a href="https://example.com">x</a>');
    expect(result).toContain("https://example.com");
    expect(result).toContain("noopener");
  });

  it("survives an injection payload embedded in prose", () => {
    const payload =
      "<p>Legit text</p><img src=x onerror=alert(document.cookie)><svg onload=alert(1)>";
    const result = sanitizeHtmlContent(payload);
    expect(result).toContain("Legit text");
    expect(result.toLowerCase()).not.toContain("onerror");
    expect(result.toLowerCase()).not.toContain("onload");
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeHtmlContent("")).toBe("");
  });
});

describe("sanitizePlainText", () => {
  it("strips all markup", () => {
    expect(sanitizePlainText("<b>bold</b> text")).toBe("bold text");
  });

  it("collapses whitespace", () => {
    expect(sanitizePlainText("a\n\n   b")).toBe("a b");
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://example.com/a")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects javascript and data URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>")).toBe(false);
  });

  it("rejects empty values", () => {
    expect(isSafeHttpUrl("")).toBe(false);
  });
});

describe("escapeTelegramHtml", () => {
  it("escapes the characters Telegram's HTML mode treats as markup", () => {
    expect(escapeTelegramHtml('<b>&"x"')).toBe("&lt;b&gt;&amp;&quot;x&quot;");
  });

  it("keeps tags balanced so Telegram does not reject the message", () => {
    const raw = '<a href="https://evil.com" onmouseover="x"><b>CLICK</b>';
    const escaped = escapeTelegramHtml(raw);
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
  });
});
