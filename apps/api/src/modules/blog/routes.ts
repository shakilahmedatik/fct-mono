import { db, schema } from "@repo/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";

export const blogRouter = new Hono()
  .get("/posts", async (c) => {
    const posts = await db.query.blogPosts.findMany({
      orderBy: [desc(schema.blogPosts.publishedAt)],
      limit: 20,
    });
    return c.json({ posts });
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const post = await db.query.blogPosts.findFirst({
      where: eq(schema.blogPosts.slug, slug),
    });
    if (!post) return c.json({ error: "Post not found" }, 404);
    return c.json({ post });
  });
