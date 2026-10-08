import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const blogPosts = pgTable(
  "blog_post",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    contentHtml: text("content_html").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    digestDate: timestamp("digest_date", { withTimezone: true }).defaultNow().notNull(),
    tags: text("tags").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("blog_post_slug_idx").on(table.slug),
    index("blog_post_published_at_idx").on(table.publishedAt),
    index("blog_post_digest_date_idx").on(table.digestDate),
  ],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscriber",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    status: text("status").default("active").notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).defaultNow().notNull(),
    lastEmailedAt: timestamp("last_emailed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("newsletter_subscriber_email_idx").on(table.email),
    index("newsletter_subscriber_status_idx").on(table.status),
  ],
);

export const contactMessages = pgTable("contact_message", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const systemSettings = pgTable("system_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
