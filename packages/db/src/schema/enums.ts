import { pgEnum } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["FREE", "PRO"]);
export const skillLevelEnum = pgEnum("skill_level", ["beginner", "intermediate", "advanced"]);
export const digestStatusEnum = pgEnum("digest_status", [
  "pending",
  "generated",
  "delivered",
  "failed",
]);
export const audioStatusEnum = pgEnum("audio_status", ["pending", "processing", "ready", "failed"]);
export const storyStatusEnum = pgEnum("story_status", ["active", "closed", "archived"]);
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "helpful",
  "not_helpful",
  "too_basic",
  "too_advanced",
]);
export const itemInteractionActionEnum = pgEnum("item_interaction_action", [
  "open",
  "click",
  "listen_complete",
  "listen_skip",
  "telegram_react",
  "delivery_failed",
]);
