import { boolean, index, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { audioStatusEnum, digestStatusEnum } from "./enums";
import { stories } from "./stories";
import { users } from "./users";

export const digests = pgTable(
  "digest",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    digestType: text("digest_type").default("daily_audio").notNull(),
    status: digestStatusEnum("status").default("pending").notNull(),
    title: text("title"),
    digestDate: timestamp("digest_date", { withTimezone: true }).defaultNow().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    cohortKey: text("cohort_key"),
    isMaster: boolean("is_master").default(false).notNull(),
    personalizeRanker: text("personalize_ranker"),
    degraded: boolean("degraded").default(false).notNull(),
  },
  (table) => [
    index("digest_user_id_digest_date_idx").on(table.userId, table.digestDate),
    index("digest_digest_date_idx").on(table.digestDate),
    index("digest_status_idx").on(table.status),
    index("digest_cohort_key_idx").on(table.cohortKey),
    index("digest_cohort_key_digest_date_idx").on(table.cohortKey, table.digestDate),
  ],
);

export const digestItems = pgTable(
  "digest_item",
  {
    id: text("id").primaryKey(),
    digestId: text("digest_id")
      .notNull()
      .references(() => digests.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    source: text("source").notNull(),
    summary: text("summary"),
    whyItMatters: text("why_it_matters"),
    rankScore: real("rank_score"),
    position: integer("position").notNull(),
    topics: text("topics").array().default([]).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    storyId: text("story_id").references(() => stories.id, { onDelete: "set null" }),
    storyRank: real("story_rank"),
    isFollowUp: boolean("is_follow_up").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // `digest_id` is the leading column of this index, so the joins on
    // digest_item -> digest are index-backed.
    index("digest_item_digest_id_position_idx").on(table.digestId, table.position),
    index("digest_item_story_id_idx").on(table.storyId),
    index("digest_item_url_idx").on(table.url),
  ],
);

export const audioBriefs = pgTable("audio_brief", {
  id: text("id").primaryKey(),
  digestId: text("digest_id")
    .notNull()
    .unique()
    .references(() => digests.id, { onDelete: "cascade" }),
  status: audioStatusEnum("status").default("pending").notNull(),
  script: text("script"),
  audioUrl: text("audio_url"),
  durationSec: integer("duration_sec"),
  provider: text("provider"),
  deliveryChannel: text("delivery_channel"),
  deliveryStatus: text("delivery_status"),
  deliveryMessageId: text("delivery_message_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
