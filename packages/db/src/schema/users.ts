// `sql` is exported from the package root, not from `drizzle-orm/pg-core`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { planEnum, skillLevelEnum } from "./enums";

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),

    // Subscription & Profile
    // `plan` defaults to FREE: new accounts must start on the free tier so the
    // cohort/paywall filter can actually engage. The enum members themselves
    // are unchanged (a change there would need a destructive migration).
    plan: planEnum("plan").default("FREE").notNull(),
    persona: text("persona"),
    telegramChatId: text("telegram_chat_id"),
    telegramUsername: text("telegram_username"),
    phoneNumber: text("phone_number"),
    preferredDeliveryChannel: text("preferred_delivery_channel").default("telegram").notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),

    // Payment Gateway (Paddle)
    paddleCustomerId: text("paddle_customer_id"),
    paddleSubscriptionId: text("paddle_subscription_id"),
    // Free text (not a pg enum) because Paddle adds states over time. The
    // values written by the billing service are: active | canceled | past_due |
    // trialing. The column is NOT NULL so "does this account have a
    // subscription state" is always answerable.
    subscriptionStatus: text("subscription_status").default("trialing").notNull(),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }).defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    // Reserved idempotency marker for the "your trial ended" email. No reader
    // exists yet — kept so the billing/trial job does not have to add it later.
    trialEndedEmailSentAt: timestamp("trial_ended_email_sent_at", { withTimezone: true }),
  },
  (table) => [
    index("user_email_idx").on(table.email),
    index("user_telegram_chat_id_idx").on(table.telegramChatId),
    index("user_paddle_customer_id_idx").on(table.paddleCustomerId),
    index("user_paddle_subscription_id_idx").on(table.paddleSubscriptionId),
  ],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    uniqueIndex("session_token_idx").on(table.token),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userPreferences = pgTable(
  "user_preference",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    topics: text("topics").array().default(["ai", "startups", "engineering", "devops"]).notNull(),
    skillLevel: skillLevelEnum("skill_level").default("intermediate").notNull(),
    timezone: text("timezone").default("UTC").notNull(),
    deliveryHour: integer("delivery_hour").default(7).notNull(),
    audioEnabled: boolean("audio_enabled").default(true).notNull(),
    channelEnabled: boolean("channel_enabled").default(true).notNull(),
    // Delivery cadence: daily | weekly | monthly. Free text (not a pg enum)
    // so new cadences do not need a migration; the zod layer in
    // @repo/shared-types enforces the three allowed values.
    deliveryCadence: text("delivery_cadence").default("daily").notNull(),
    // Narration persona id understood by the TTS layer ("neutral" by default).
    voicePersona: text("voice_persona").default("neutral").notNull(),
    // Playback rate multiplier, constrained to 0.5x - 2.0x by the CHECK below.
    playbackSpeed: real("playback_speed").default(1).notNull(),
    emailDigest: boolean("email_digest").default(true).notNull(),
    emailAlerts: boolean("email_alerts").default(true).notNull(),
    embeddingVersion: integer("embedding_version").default(0).notNull(),
    lastPersonalizationAt: timestamp("last_personalization_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_preference_user_id_idx").on(table.userId),
    check(
      "user_preference_playback_speed_check",
      sql`${table.playbackSpeed} >= 0.5 and ${table.playbackSpeed} <= 2.0`,
    ),
  ],
);
