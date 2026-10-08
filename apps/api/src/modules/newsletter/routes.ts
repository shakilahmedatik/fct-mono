import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import { newsletterSubscribeSchema } from "@repo/shared-types/validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const newsletterRouter = new Hono()
  .post("/subscribe", zValidator("json", newsletterSubscribeSchema), async (c) => {
    const { email } = c.req.valid("json");
    const existing = await db.query.newsletterSubscribers.findFirst({
      where: eq(schema.newsletterSubscribers.email, email),
    });

    if (existing) {
      if (existing.status === "unsubscribed") {
        await db
          .update(schema.newsletterSubscribers)
          .set({ status: "active" })
          .where(eq(schema.newsletterSubscribers.id, existing.id));
      }
      return c.json({ success: true, message: "Subscribed successfully" });
    }

    await db.insert(schema.newsletterSubscribers).values({
      id: crypto.randomUUID(),
      email,
      status: "active",
      unsubscribeToken: crypto.randomUUID(),
    });

    return c.json({ success: true, message: "Subscribed successfully" });
  })
  .post("/unsubscribe", async (c) => {
    const { token } = await c.req.json();
    if (!token) return c.json({ error: "Token required" }, 400);

    await db
      .update(schema.newsletterSubscribers)
      .set({ status: "unsubscribed" })
      .where(eq(schema.newsletterSubscribers.unsubscribeToken, token));

    return c.json({ success: true, message: "Unsubscribed successfully" });
  });
