import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authGuard } from "../../middleware/auth-guard";
import { logger } from "../../middleware/logger";
import { roleGuard } from "../../middleware/role-guard";
import type { AppBindings } from "../../types";

const banUserSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().max(500).optional(),
  // A ban may be permanent (no expiry) or temporary. The expiry has to be
  // writable, otherwise `ban_expires` is dead data and a temporary ban can
  // never be lifted.
  banExpires: z
    .union([z.iso.datetime({ offset: true }), z.iso.datetime(), z.literal(null)])
    .optional()
    .nullable(),
});

const adminUserQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  q: z.string().trim().min(1).max(200).optional(),
  role: z.enum(["user", "admin"]).optional(),
  banned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const adminDigestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
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
    // Paginated and filterable. The previous version hard-limited to 50 rows
    // with no way to page, so operators could not see accounts beyond the
    // first page — including banned ones.
    const query = adminUserQuerySchema.safeParse({
      limit: c.req.query("limit") ?? 50,
      offset: c.req.query("offset") ?? 0,
      q: c.req.query("q") ?? undefined,
      role: c.req.query("role") ?? undefined,
      banned: c.req.query("banned") ?? undefined,
    });

    if (!query.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const { limit, offset, q, role, banned } = query.data;

    const conditions = [];
    if (role) conditions.push(eq(schema.users.role, role));
    if (banned !== undefined) conditions.push(eq(schema.users.banned, banned));
    if (q) {
      conditions.push(
        or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.email, `%${q}%`)) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, total] = await Promise.all([
      db.query.users.findMany({
        where,
        orderBy: [desc(schema.users.createdAt)],
        limit,
        offset,
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
      }),
      db.select({ value: count() }).from(schema.users).where(where),
    ]);

    return c.json({ users, total: total[0]?.value ?? 0, limit, offset });
  })
  .post("/users/:id/ban", zValidator("json", banUserSchema), async (c) => {
    const id = c.req.param("id");
    const { banned, banReason, banExpires } = c.req.valid("json");

    // An unban always clears the expiry, and a ban with an expiry in the past
    // is meaningless — the guard treats it as not banned anyway.
    const expiry = banned && banExpires ? new Date(banExpires) : null;

    const [updated] = await db
      .update(schema.users)
      .set({
        banned: Boolean(banned),
        banReason: banReason || null,
        banExpires: expiry,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    // A ban only takes effect if the user's existing sessions are revoked —
    // otherwise the banned account keeps working with the cookie it already
    // holds.
    if (updated.banned) {
      try {
        await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
      } catch (error) {
        logger.error(
          { err: error instanceof Error ? error.message : String(error), userId: id },
          "Failed to revoke sessions for banned user",
        );
      }
    }

    return c.json({ user: updated });
  })
  .get("/digests", async (c) => {
    const query = adminDigestQuerySchema.safeParse({
      limit: c.req.query("limit") ?? 50,
      offset: c.req.query("offset") ?? 0,
    });

    if (!query.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const { limit, offset } = query.data;

    const [digests, total] = await Promise.all([
      db.query.digests.findMany({
        orderBy: [desc(schema.digests.digestDate)],
        limit,
        offset,
        with: {
          user: {
            columns: {
              name: true,
              email: true,
            },
          },
          audioBrief: true,
        },
      }),
      db.select({ value: count() }).from(schema.digests),
    ]);

    return c.json({ digests, total: total[0]?.value ?? 0, limit, offset });
  });
