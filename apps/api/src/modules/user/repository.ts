import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";

/**
 * Columns a user is allowed to change on their own profile.
 *
 * The update used to spread the validated body straight into the update, so
 * the validator was the only thing standing between a request and the `role`,
 * `plan` or `banned` columns. The zod schema is strict, but an explicit
 * allowlist here means the repository — not the validator — is the last line
 * of defence.
 */
const PROFILE_UPDATABLE_COLUMNS = [
  "name",
  "persona",
  "telegramChatId",
  "telegramUsername",
  "phoneNumber",
  "preferredDeliveryChannel",
] as const;

type ProfileUpdates = Partial<
  Pick<typeof schema.users.$inferInsert, (typeof PROFILE_UPDATABLE_COLUMNS)[number]>
>;

export const userRepository = {
  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: {
        preference: true,
      },
    });
  },

  async updateProfile(id: string, data: ProfileUpdates) {
    const sanitized: Record<string, unknown> = {};
    for (const column of PROFILE_UPDATABLE_COLUMNS) {
      const value = (data as Record<string, unknown>)[column];
      if (value !== undefined) sanitized[column] = value;
    }

    const [updated] = await db
      .update(schema.users)
      .set({ ...sanitized, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  },

  async findPreferenceByUserId(userId: string) {
    return db.query.userPreferences.findFirst({
      where: eq(schema.userPreferences.userId, userId),
    });
  },

  /**
   * Upsert the user's preferences.
   *
   * This used to be a find-then-insert-or-update, which raced on the unique
   * `user_preference.user_id` constraint: two concurrent first-time writes
   * produced a unique-violation 500. A real upsert makes it atomic.
   */
  async upsertPreference(
    userId: string,
    data: Partial<typeof schema.userPreferences.$inferInsert>,
  ) {
    const [upserted] = await db
      .insert(schema.userPreferences)
      .values({
        id: crypto.randomUUID(),
        userId,
        topics: data.topics || ["ai", "startups", "engineering", "devops"],
        skillLevel: data.skillLevel || "intermediate",
        timezone: data.timezone || "UTC",
        deliveryHour: data.deliveryHour ?? 7,
        audioEnabled: data.audioEnabled ?? true,
        channelEnabled: data.channelEnabled ?? true,
        ...data,
      })
      .onConflictDoUpdate({
        target: schema.userPreferences.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return upserted;
  },
};
