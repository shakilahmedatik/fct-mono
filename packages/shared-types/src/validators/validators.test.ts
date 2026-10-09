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
    it("validates valid preferences payload", () => {
      const parsed = userPreferenceSchema.parse({
        topics: ["ai", "systems"],
        skillLevel: "advanced",
        timezone: "America/New_York",
        deliveryHour: 8,
        audioEnabled: true,
        channelEnabled: true,
      });
      expect(parsed.topics).toEqual(["ai", "systems"]);
      expect(parsed.deliveryHour).toBe(8);
    });

    it("rejects empty topics list", () => {
      expect(() =>
        userPreferenceSchema.parse({
          topics: [],
          skillLevel: "advanced",
          timezone: "UTC",
          deliveryHour: 7,
          audioEnabled: true,
          channelEnabled: true,
        }),
      ).toThrow();
    });
  });
});
