import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { storyStatusEnum } from "./enums";

export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const stories = pgTable(
  "story",
  {
    id: text("id").primaryKey(),
    canonicalTitle: text("canonical_title").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    // Write-only for now: the clustering stage writes the cluster id it
    // assigned, but nothing reads it back yet. Kept because the pipeline
    // (packages/pipeline, apps/worker) is actively writing it.
    clusterId: text("cluster_id"),
    dominantSource: text("dominant_source"),
    status: storyStatusEnum("status").default("active").notNull(),
    embeddingModel: text("embedding_model"),
    embedding: bytea("embedding"),
    // Write-only for now: written together with `embedding`, never read back
    // for filtering. Kept because the clustering stage writes it.
    embeddingDim: integer("embedding_dim"),
    topics: text("topics").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("story_status_last_seen_idx").on(table.status, table.lastSeenAt),
    index("story_dominant_source_idx").on(table.dominantSource),
  ],
);

export const storyMemberships = pgTable(
  "story_membership",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    // `source_item_id` is globally unique (and therefore also unique per
    // (story, source item) pair): a source item can only ever belong to one
    // story. Both the column-level UNIQUE and the named unique index below
    // enforce it, which is what lets the clustering stage treat a unique
    // violation as "already ingested".
    sourceItemId: text("source_item_id").notNull().unique(),
    source: text("source").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentHash: text("content_hash"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    isFollowUp: boolean("is_follow_up").default(false).notNull(),
    rankScore: real("rank_score"),
    upvotes: integer("upvotes"),
    comments: integer("comments"),
    topics: text("topics").array().default([]).notNull(),
  },
  (table) => [
    uniqueIndex("story_membership_source_item_id_idx").on(table.sourceItemId),
    index("story_membership_story_id_ingested_idx").on(table.storyId, table.ingestedAt),
    index("story_membership_content_hash_idx").on(table.contentHash),
  ],
);
