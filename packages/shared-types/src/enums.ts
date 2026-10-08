export const Plan = {
  FREE: "FREE",
  PRO: "PRO",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const SkillLevel = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;
export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];

export const DigestStatus = {
  PENDING: "pending",
  GENERATED: "generated",
  DELIVERED: "delivered",
  FAILED: "failed",
} as const;
export type DigestStatus = (typeof DigestStatus)[keyof typeof DigestStatus];

export const AudioStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
} as const;
export type AudioStatus = (typeof AudioStatus)[keyof typeof AudioStatus];

export const StoryStatus = {
  ACTIVE: "active",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;
export type StoryStatus = (typeof StoryStatus)[keyof typeof StoryStatus];

export const FeedbackType = {
  HELPFUL: "helpful",
  NOT_HELPFUL: "not_helpful",
  TOO_BASIC: "too_basic",
  TOO_ADVANCED: "too_advanced",
} as const;
export type FeedbackType = (typeof FeedbackType)[keyof typeof FeedbackType];

export const ItemInteractionAction = {
  OPEN: "open",
  CLICK: "click",
  LISTEN_COMPLETE: "listen_complete",
  LISTEN_SKIP: "listen_skip",
  TELEGRAM_REACT: "telegram_react",
  DELIVERY_FAILED: "delivery_failed",
} as const;
export type ItemInteractionAction =
  (typeof ItemInteractionAction)[keyof typeof ItemInteractionAction];

export const DeliveryChannel = {
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  DISCORD: "discord",
  SLACK: "slack",
} as const;
export type DeliveryChannel = (typeof DeliveryChannel)[keyof typeof DeliveryChannel];

export const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
