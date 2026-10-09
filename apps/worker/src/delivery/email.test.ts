import { describe, expect, it } from "bun:test";
import { classifyEmailError, renderEmailTemplate, sanitizeEmailLog } from "./email";

describe("Email Delivery Adapter", () => {
  describe("sanitizeEmailLog", () => {
    it("redacts Resend API keys from error messages", () => {
      const err = new Error("Failed to authenticate with re_12345678abcdef token.");
      const sanitized = sanitizeEmailLog(err);
      expect(sanitized).not.toContain("re_12345678abcdef");
      expect(sanitized).toContain("re_***REDACTED***");
    });

    it("redacts Bearer authorization tokens", () => {
      const log = "Request failed: Bearer secret_jwt_token_here";
      const sanitized = sanitizeEmailLog(log);
      expect(sanitized).toBe("Request failed: Bearer ***REDACTED***");
    });
  });

  describe("classifyEmailError", () => {
    it("classifies domain not verified as permanent failure", () => {
      const res = classifyEmailError("Domain not verified. Please verify your domain in Resend.");
      expect(res.errorCode).toBe("DOMAIN_NOT_VERIFIED");
      expect(res.isPermanentFailure).toBe(true);
    });

    it("classifies suppressed recipient as permanent failure", () => {
      const res = classifyEmailError("The recipient address has bounced and is suppressed.");
      expect(res.errorCode).toBe("RECIPIENT_SUPPRESSED");
      expect(res.isPermanentFailure).toBe(true);
    });

    it("classifies rate limits as transient", () => {
      const res = classifyEmailError("Too many requests (rate limit exceeded)");
      expect(res.errorCode).toBe("RATE_LIMITED");
      expect(res.isPermanentFailure).toBe(false);
    });
  });

  describe("renderEmailTemplate", () => {
    it("generates valid HTML and plain text with WhatsApp styling", () => {
      const { html, text } = renderEmailTemplate(
        "Executive Morning Brief",
        "Good morning Alex,",
        [
          {
            title: "TypeScript 5.8 Beta Announced",
            url: "https://devblogs.microsoft.com/typescript",
            source: "github",
            summary: "Granular return-type checks and faster module resolution.",
            whyItMatters: "Eliminates type-drift across shared packages.",
          },
        ],
        "https://storage.firstcup.tech/audio/digest-1.mp3",
        150,
      );

      expect(html).toContain("First Cup Tech");
      expect(html).toContain("TypeScript 5.8 Beta");
      expect(html).toContain("Why it matters:");
      expect(html).toContain("#00a884"); // WhatsApp emerald green brand token
      expect(html).toContain("Play Audio Brief");

      expect(text).toContain("TypeScript 5.8 Beta");
      expect(text).toContain("Listen to your morning audio briefing");
    });
  });
});
