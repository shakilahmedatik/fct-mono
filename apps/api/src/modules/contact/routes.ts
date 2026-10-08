import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import { contactMessageSchema } from "@repo/shared-types/validators";
import { Hono } from "hono";

export const contactRouter = new Hono().post(
  "/",
  zValidator("json", contactMessageSchema),
  async (c) => {
    const data = c.req.valid("json");

    const [message] = await db
      .insert(schema.contactMessages)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      })
      .returning();

    return c.json({ success: true, message });
  },
);
