import { index, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { digestItems, digests } from "./digests";
import { feedbackTypeEnum, itemInteractionActionEnum } from "./enums";
import { storyMemberships } from "./stories";
import { users } from "./users";

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    digestId: text("digest_id").references(() => digests.id, { onDelete: "set null" }),
    digestItemId: text("digest_item_id").references(() => digestItems.id, { onDelete: "set null" }),
    storyMembershipId: text("story_membership_id").references(() => storyMemberships.id, {
      onDelete: "set null",
    }),
    type: feedbackTypeEnum("type").notNull(),
    weight: real("weight").default(1.0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("feedback_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("feedback_digest_id_idx").on(table.digestId),
    index("feedback_digest_item_id_idx").on(table.digestItemId),
  ],
);

export const itemInteractions = pgTable(
  "item_interaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyMembershipId: text("story_membership_id").references(() => storyMemberships.id, {
      onDelete: "set null",
    }),
    sourceItemId: text("source_item_id"),
    action: itemInteractionActionEnum("action").notNull(),
    weight: real("weight").default(1.0).notNull(),
    listenedSeconds: integer("listened_seconds"),
    digestId: text("digest_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("item_interaction_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("item_interaction_story_membership_id_idx").on(table.storyMembershipId),
    index("item_interaction_action_created_at_idx").on(table.action, table.createdAt),
  ],
);
