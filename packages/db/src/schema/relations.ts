import { relations } from "drizzle-orm";
import { audioBriefs, digestItems, digests } from "./digests";
import { feedback, itemInteractions } from "./feedback";
import { stories, storyMemberships } from "./stories";
import { accounts, sessions, userPreferences, users } from "./users";

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  preference: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  digests: many(digests),
  feedback: many(feedback),
  itemInteractions: many(itemInteractions),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const digestsRelations = relations(digests, ({ one, many }) => ({
  user: one(users, {
    fields: [digests.userId],
    references: [users.id],
  }),
  items: many(digestItems),
  audioBrief: one(audioBriefs, {
    fields: [digests.id],
    references: [audioBriefs.digestId],
  }),
  feedback: many(feedback),
}));

export const digestItemsRelations = relations(digestItems, ({ one, many }) => ({
  digest: one(digests, {
    fields: [digestItems.digestId],
    references: [digests.id],
  }),
  story: one(stories, {
    fields: [digestItems.storyId],
    references: [stories.id],
  }),
  feedback: many(feedback),
}));

export const audioBriefsRelations = relations(audioBriefs, ({ one }) => ({
  digest: one(digests, {
    fields: [audioBriefs.digestId],
    references: [digests.id],
  }),
}));

export const storiesRelations = relations(stories, ({ many }) => ({
  memberships: many(storyMemberships),
  digestItems: many(digestItems),
}));

export const storyMembershipsRelations = relations(storyMemberships, ({ one, many }) => ({
  story: one(stories, {
    fields: [storyMemberships.storyId],
    references: [stories.id],
  }),
  feedback: many(feedback),
  itemInteractions: many(itemInteractions),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
  digest: one(digests, {
    fields: [feedback.digestId],
    references: [digests.id],
  }),
  digestItem: one(digestItems, {
    fields: [feedback.digestItemId],
    references: [digestItems.id],
  }),
  storyMembership: one(storyMemberships, {
    fields: [feedback.storyMembershipId],
    references: [storyMemberships.id],
  }),
}));

export const itemInteractionsRelations = relations(itemInteractions, ({ one }) => ({
  user: one(users, {
    fields: [itemInteractions.userId],
    references: [users.id],
  }),
  storyMembership: one(storyMemberships, {
    fields: [itemInteractions.storyMembershipId],
    references: [storyMemberships.id],
  }),
}));
