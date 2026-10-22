/**
 * Shared enum contracts.
 *
 * The `SkillLevel`, `DigestStatus`, `AudioStatus`, `StoryStatus`,
 * `ItemInteractionAction` and `UserRole` runtime objects were removed: nothing
 * imported the values. The matching types are kept because they document the
 * value domain of the corresponding database columns / pg enums (see
 * `packages/db/src/schema/enums.ts`) and are part of the API contract.
 */

export const Plan = {
  FREE: "FREE",
  PRO: "PRO",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

/**
 * Mirrors the `skill_level` pg enum.
 */
export type SkillLevel = "beginner" | "intermediate" | "advanced";

/**
 * Mirrors the `digest_status` pg enum.
 */
export type DigestStatus = "pending" | "generated" | "delivered" | "failed";

/**
 * Mirrors the `audio_status` pg enum.
 */
export type AudioStatus = "pending" | "processing" | "ready" | "failed";

/**
 * Mirrors the `story_status` pg enum.
 */
export type StoryStatus = "active" | "closed" | "archived";

export const FeedbackType = {
  HELPFUL: "helpful",
  NOT_HELPFUL: "not_helpful",
  TOO_BASIC: "too_basic",
  TOO_ADVANCED: "too_advanced",
} as const;
export type FeedbackType = (typeof FeedbackType)[keyof typeof FeedbackType];

/**
 * Mirrors the `item_interaction_action` pg enum.
 */
export type ItemInteractionAction =
  | "open"
  | "click"
  | "listen_complete"
  | "listen_skip"
  | "telegram_react"
  | "delivery_failed";

export const DeliveryChannel = {
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  DISCORD: "discord",
  SLACK: "slack",
} as const;
export type DeliveryChannel = (typeof DeliveryChannel)[keyof typeof DeliveryChannel];

/**
 * The role values written to the `user.role` column.
 */
export type UserRole = "user" | "admin";
