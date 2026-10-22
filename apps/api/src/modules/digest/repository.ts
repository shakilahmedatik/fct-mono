import { db, schema } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";

export interface DigestFilters {
  status?: "pending" | "generated" | "delivered" | "failed";
  type?: "daily_audio" | "weekly_newsletter";
}

export const digestRepository = {
  async findUserDigests(userId: string, limit = 10, offset = 0, filters: DigestFilters = {}) {
    // The `status` and `type` filters were accepted by the query schema but
    // never applied, so the API silently returned unfiltered data.
    const conditions = [eq(schema.digests.userId, userId)];

    if (filters.status) {
      conditions.push(eq(schema.digests.status, filters.status));
    }
    if (filters.type) {
      conditions.push(eq(schema.digests.digestType, filters.type));
    }

    return db.query.digests.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.digests.digestDate)],
      limit,
      offset,
      with: {
        items: true,
        audioBrief: true,
      },
    });
  },

  async findLatestUserDigest(userId: string) {
    return db.query.digests.findFirst({
      where: eq(schema.digests.userId, userId),
      orderBy: [desc(schema.digests.digestDate)],
      with: {
        items: true,
        audioBrief: true,
      },
    });
  },

  async findLatestMasterDigest() {
    return db.query.digests.findFirst({
      where: eq(schema.digests.isMaster, true),
      orderBy: [desc(schema.digests.digestDate)],
      with: {
        items: true,
        audioBrief: true,
      },
    });
  },

  async findById(id: string) {
    return db.query.digests.findFirst({
      where: eq(schema.digests.id, id),
      with: {
        items: {
          with: {
            story: true,
          },
        },
        audioBrief: true,
      },
    });
  },

  /**
   * Find a digest item and confirm the caller owns the digest it belongs to.
   *
   * Feedback used to accept an arbitrary `digestItemId`, which allowed a user
   * to attach feedback to somebody else's digest item.
   */
  async findDigestItemOwnedBy(digestItemId: string, userId: string) {
    const item = await db.query.digestItems.findFirst({
      where: eq(schema.digestItems.id, digestItemId),
      with: { digest: true },
    });

    if (!item) return null;
    if (item.digest?.userId && item.digest.userId !== userId) return null;
    return item;
  },

  async createFeedback(data: typeof schema.feedback.$inferInsert) {
    const [created] = await db.insert(schema.feedback).values(data).returning();
    return created;
  },
};
