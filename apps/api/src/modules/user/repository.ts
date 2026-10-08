import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";

export const userRepository = {
  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: {
        preference: true,
      },
    });
  },

  async updateProfile(id: string, data: Partial<typeof schema.users.$inferInsert>) {
    const [updated] = await db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  },

  async findPreferenceByUserId(userId: string) {
    return db.query.userPreferences.findFirst({
      where: eq(schema.userPreferences.userId, userId),
    });
  },

  async upsertPreference(
    userId: string,
    data: Partial<typeof schema.userPreferences.$inferInsert>,
  ) {
    const existing = await this.findPreferenceByUserId(userId);

    if (existing) {
      const [updated] = await db
        .update(schema.userPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.userPreferences.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
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
      })
      .returning();
    return created;
  },
};
