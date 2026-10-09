import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authGuard } from "../../middleware/auth-guard";
import { roleGuard } from "../../middleware/role-guard";
import type { AppBindings } from "../../types";

const banUserSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().optional(),
});

export const adminRouter = new Hono<AppBindings>()
  .use("*", authGuard)
  .use("*", roleGuard("admin"))
  .get("/stats", async (c) => {
    const [userCount] = await db.select({ value: count() }).from(schema.users);
    const [digestCount] = await db.select({ value: count() }).from(schema.digests);
    const [subscriberCount] = await db
      .select({ value: count() })
      .from(schema.newsletterSubscribers);
    const [feedbackCount] = await db.select({ value: count() }).from(schema.feedback);

    return c.json({
      stats: {
        totalUsers: userCount?.value ?? 0,
        totalDigests: digestCount?.value ?? 0,
        totalSubscribers: subscriberCount?.value ?? 0,
        totalFeedback: feedbackCount?.value ?? 0,
      },
    });
  })
  .get("/users", async (c) => {
    const users = await db.query.users.findMany({
      orderBy: [desc(schema.users.createdAt)],
      limit: 50,
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        banned: true,
        banReason: true,
        createdAt: true,
      },
    });
    return c.json({ users });
  })
  .post("/users/:id/ban", zValidator("json", banUserSchema), async (c) => {
    const id = c.req.param("id");
    const { banned, banReason } = c.req.valid("json");

    const [updated] = await db
      .update(schema.users)
      .set({
        banned: Boolean(banned),
        banReason: banReason || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    return c.json({ user: updated });
  })
  .get("/digests", async (c) => {
    const digests = await db.query.digests.findMany({
      orderBy: [desc(schema.digests.digestDate)],
      limit: 50,
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
        audioBrief: true,
      },
    });
    return c.json({ digests });
  });
