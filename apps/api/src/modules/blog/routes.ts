import { db, schema } from "@repo/db";
import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const blogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const blogRouter = new Hono()
  .get("/posts", async (c) => {
    // The client's `?limit=` was previously ignored and the endpoint always
    // returned 20 posts.
    const parsed = blogListQuerySchema.safeParse({
      limit: c.req.query("limit") ?? 20,
      offset: c.req.query("offset") ?? 0,
    });

    if (!parsed.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const { limit, offset } = parsed.data;

    const [posts, total] = await Promise.all([
      db.query.blogPosts.findMany({
        orderBy: [desc(schema.blogPosts.publishedAt)],
        limit,
        offset,
      }),
      db.select({ value: count() }).from(schema.blogPosts),
    ]);

    return c.json({ posts, total: total[0]?.value ?? 0, limit, offset });
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const post = await db.query.blogPosts.findFirst({
      where: eq(schema.blogPosts.slug, slug),
    });
    if (!post) return c.json({ error: "Post not found" }, 404);
    return c.json({ post });
  });
