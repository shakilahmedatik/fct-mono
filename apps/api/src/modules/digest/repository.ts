import { db, schema } from "@repo/db";
import { desc, eq } from "drizzle-orm";

export const digestRepository = {
  async findUserDigests(userId: string, limit = 10, offset = 0) {
    return db.query.digests.findMany({
      where: eq(schema.digests.userId, userId),
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

  async createFeedback(data: typeof schema.feedback.$inferInsert) {
    const [created] = await db.insert(schema.feedback).values(data).returning();
    return created;
  },
};
