import { describe, expect, it } from "bun:test";
import { classifyTelegramError, escapeTelegramHtml, telegramDelivery } from "./telegram";
import type { AudioBriefDeliveryPayload } from "./types";

describe("Telegram Delivery Adapter", () => {
  describe("classifyTelegramError", () => {
    it("identifies bot blocked as permanent failure", () => {
      const res = classifyTelegramError(403, "Forbidden: bot was blocked by the user");
      expect(res.errorCode).toBe("BOT_BLOCKED");
      expect(res.isPermanentFailure).toBe(true);
    });

    it("identifies chat not found as permanent failure", () => {
      const res = classifyTelegramError(400, "Bad Request: chat not found");
      expect(res.errorCode).toBe("CHAT_NOT_FOUND");
      expect(res.isPermanentFailure).toBe(true);
    });

    it("identifies entity parse errors as non-permanent", () => {
      const res = classifyTelegramError(400, "Bad Request: can't parse entities in message text");
      expect(res.errorCode).toBe("PARSE_ERROR");
      expect(res.isPermanentFailure).toBe(false);
    });

    it("identifies rate limit as non-permanent", () => {
      const res = classifyTelegramError(429, "Too Many Requests: retry after 42");
      expect(res.errorCode).toBe("RATE_LIMITED");
      expect(res.isPermanentFailure).toBe(false);
    });

    it("identifies server errors as non-permanent", () => {
      const res = classifyTelegramError(502, "Bad Gateway");
      expect(res.errorCode).toBe("SERVER_ERROR");
      expect(res.isPermanentFailure).toBe(false);
    });
  });

  describe("escapeTelegramHtml", () => {
    it("escapes special HTML entities", () => {
      const escaped = escapeTelegramHtml('<script>alert("hello & welcome")</script>');
      expect(escaped).toBe("&lt;script&gt;alert(&quot;hello &amp; welcome&quot;)&lt;/script&gt;");
    });
  });

  describe("formatCaption & formatTextDigest", () => {
    const samplePayload: AudioBriefDeliveryPayload = {
      recipientId: "12345",
      title: "Daily Tech Briefing",
      items: [
        {
          title: "Major Next.js 16 Update",
          url: "https://nextjs.org",
          source: "hackernews",
          whyItMatters: "Breaks legacy router caching behavior.",
        },
        {
          title: "Bun 1.3 Turborepo Workspaces",
          url: "https://bun.sh",
          source: "github",
          whyItMatters: "Faster builds for enterprise monorepos.",
        },
      ],
    };

    it("formats caption within Telegram 1024 limit", () => {
      const caption = telegramDelivery.formatCaption(samplePayload);
      expect(caption.length).toBeLessThanOrEqual(1024);
      expect(caption).toContain("First Cup Tech — Daily Brief");
      expect(caption).toContain("Major Next.js 16 Update");
    });

    it("formats text digest within Telegram 4000 limit", () => {
      const text = telegramDelivery.formatTextDigest(samplePayload);
      expect(text.length).toBeLessThanOrEqual(4000);
      expect(text).toContain("First Cup Tech — Daily Brief");
    });
  });
});
