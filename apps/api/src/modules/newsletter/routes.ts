import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import { newsletterSubscribeSchema } from "@repo/shared-types/validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const newsletterRouter = new Hono()
  .post("/subscribe", zValidator("json", newsletterSubscribeSchema), async (c) => {
    const { email } = c.req.valid("json");
    // Normalise so `Bob@x.com` and `bob@x.com` cannot become two rows for
    // the same mailbox.
    const normalizedEmail = email.trim().toLowerCase();

    // A real upsert. The previous find-then-insert raced on the unique email
    // constraint, so two concurrent signups produced a 500.
    const [row] = await db
      .insert(schema.newsletterSubscribers)
      .values({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        status: "active",
        unsubscribeToken: crypto.randomUUID(),
      })
      .onConflictDoUpdate({
        target: schema.newsletterSubscribers.email,
        set: { status: "active" },
      })
      .returning();

    return c.json({
      success: true,
      message: "Subscribed successfully",
      subscriberId: row?.id,
    });
  })
  .post("/unsubscribe", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { token } = body as { token?: string };
    if (!token || typeof token !== "string" || token.length < 8 || token.length > 200) {
      return c.json({ error: "A valid unsubscribe token is required" }, 400);
    }

    await db
      .update(schema.newsletterSubscribers)
      .set({ status: "unsubscribed" })
      .where(eq(schema.newsletterSubscribers.unsubscribeToken, token));

    // The same response is returned whether or not a row matched, so the
    // endpoint cannot be used to probe which tokens are valid.
    return c.json({ success: true, message: "Unsubscribed successfully" });
  });
