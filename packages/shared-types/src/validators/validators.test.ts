import { describe, expect, it } from "bun:test";
import { digestQuerySchema, feedbackSchema } from "./digest";
import { updateProfileSchema, userPreferenceSchema } from "./user";

describe("Shared Types Validators", () => {
  describe("digestQuerySchema", () => {
    it("parses valid query parameters with defaults", () => {
      const parsed = digestQuerySchema.parse({});
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(0);
    });

    it("coerces string limits and offsets correctly", () => {
      const parsed = digestQuerySchema.parse({ limit: "25", offset: "50" });
      expect(parsed.limit).toBe(25);
      expect(parsed.offset).toBe(50);
    });

    it("rejects limits exceeding 50", () => {
      expect(() => digestQuerySchema.parse({ limit: 100 })).toThrow();
    });
  });

  describe("feedbackSchema", () => {
    it("accepts valid helpful feedback", () => {
      const valid = {
        digestId: "dig-123",
        type: "helpful" as const,
        note: "Great concise briefing!",
      };
      const parsed = feedbackSchema.parse(valid);
      expect(parsed.type).toBe("helpful");
      expect(parsed.note).toBe("Great concise briefing!");
    });

    it("rejects invalid feedback type", () => {
      expect(() =>
        feedbackSchema.parse({
          type: "awesome",
        }),
      ).toThrow();
    });
  });

  describe("updateProfileSchema", () => {
    it("validates channel selection", () => {
      const parsed = updateProfileSchema.parse({
        name: "Ada Lovelace",
        preferredDeliveryChannel: "telegram",
      });
      expect(parsed.preferredDeliveryChannel).toBe("telegram");
    });

    it("rejects unsupported delivery channels", () => {
      expect(() =>
        updateProfileSchema.parse({
          preferredDeliveryChannel: "discord",
        }),
      ).toThrow();
    });
  });

  describe("userPreferenceSchema", () => {
    const basePreferences = {
      topics: ["ai", "systems"],
      skillLevel: "advanced",
      timezone: "America/New_York",
      deliveryHour: 8,
      audioEnabled: true,
      channelEnabled: true,
    };

    it("validates valid preferences payload", () => {
      const parsed = userPreferenceSchema.parse({
        ...basePreferences,
      });
      expect(parsed.topics).toEqual(["ai", "systems"]);
      expect(parsed.deliveryHour).toBe(8);
    });

    it("rejects empty topics list", () => {
      expect(() =>
        userPreferenceSchema.parse({
          ...basePreferences,
          topics: [],
        }),
      ).toThrow();
    });

    it("accepts an IANA time zone", () => {
      expect(
        userPreferenceSchema.parse({ ...basePreferences, timezone: "Asia/Dhaka" }).timezone,
      ).toBe("Asia/Dhaka");
      expect(userPreferenceSchema.parse({ ...basePreferences, timezone: "UTC" }).timezone).toBe(
        "UTC",
      );
    });

    it("rejects an unknown time zone", () => {
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, timezone: "Not/AZone" }),
      ).toThrow();
    });

    it("defaults the delivery preference fields when they are omitted", () => {
      const parsed = userPreferenceSchema.parse({ ...basePreferences });
      expect(parsed.deliveryCadence).toBe("daily");
      expect(parsed.voicePersona).toBe("neutral");
      expect(parsed.playbackSpeed).toBe(1);
      expect(parsed.emailDigest).toBe(true);
      expect(parsed.emailAlerts).toBe(true);
    });

    it("accepts the three supported delivery cadences", () => {
      for (const deliveryCadence of ["daily", "weekly", "monthly"] as const) {
        const parsed = userPreferenceSchema.parse({ ...basePreferences, deliveryCadence });
        expect(parsed.deliveryCadence).toBe(deliveryCadence);
      }
    });

    it("rejects an unsupported delivery cadence", () => {
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, deliveryCadence: "hourly" }),
      ).toThrow();
    });

    it("accepts a non-empty voice persona", () => {
      const parsed = userPreferenceSchema.parse({ ...basePreferences, voicePersona: "energetic" });
      expect(parsed.voicePersona).toBe("energetic");
    });

    it("rejects an empty voice persona", () => {
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, voicePersona: "   " }),
      ).toThrow();
    });

    it("accepts playback speeds inside the 0.5 - 2.0 range", () => {
      for (const playbackSpeed of [0.5, 1, 1.25, 2]) {
        const parsed = userPreferenceSchema.parse({ ...basePreferences, playbackSpeed });
        expect(parsed.playbackSpeed).toBe(playbackSpeed);
      }
    });

    it("rejects playback speeds outside the 0.5 - 2.0 range", () => {
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, playbackSpeed: 0.25 }),
      ).toThrow();
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, playbackSpeed: 2.5 }),
      ).toThrow();
    });

    it("accepts the email preference toggles", () => {
      const parsed = userPreferenceSchema.parse({
        ...basePreferences,
        emailDigest: false,
        emailAlerts: false,
      });
      expect(parsed.emailDigest).toBe(false);
      expect(parsed.emailAlerts).toBe(false);
    });

    it("rejects non-boolean email preference toggles", () => {
      expect(() =>
        userPreferenceSchema.parse({ ...basePreferences, emailDigest: "yes" }),
      ).toThrow();
    });
  });
});
