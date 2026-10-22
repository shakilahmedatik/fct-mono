import { z } from "zod";

/**
 * Minimal fallback list for runtimes without `Intl.supportedValuesOf`.
 *
 * Bun, Node 18+ and every current browser support the real IANA list, so this
 * only guards exotic runtimes. It is intentionally small: a zone that is not
 * listed here is rejected rather than silently accepted.
 */
const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
] as const;

/**
 * IANA time zone names (e.g. `Asia/Dhaka`).
 *
 * A persisted but invalid zone makes every downstream date formatting produce
 * `Invalid Date` / `NaN`, which silently skips the user's digest.
 */
export const IANA_TIMEZONES: readonly string[] =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [...FALLBACK_TIMEZONES];

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  persona: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramUsername: z.string().optional(),
  phoneNumber: z.string().optional(),
  preferredDeliveryChannel: z.enum(["telegram", "whatsapp", "email"]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const userPreferenceSchema = z.object({
  topics: z.array(z.string()).min(1, "Select at least one topic"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  timezone: z
    .string()
    .refine((timezone) => IANA_TIMEZONES.includes(timezone), { message: "Unknown time zone" }),
  deliveryHour: z.number().int().min(0).max(23),
  audioEnabled: z.boolean(),
  channelEnabled: z.boolean(),
  // How often the digest is delivered. Matches the `delivery_cadence` column.
  deliveryCadence: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  // Narration persona understood by the TTS layer. Matches `voice_persona`.
  voicePersona: z.string().trim().min(1, "Voice persona must not be empty").default("neutral"),
  // Playback rate multiplier. Matches the `playback_speed` column, which has a
  // matching CHECK constraint (0.5 - 2.0) in the database.
  playbackSpeed: z.number().min(0.5).max(2).default(1),
  emailDigest: z.boolean().default(true),
  emailAlerts: z.boolean().default(true),
});
export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>;
