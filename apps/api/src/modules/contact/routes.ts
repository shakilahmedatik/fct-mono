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
      .returning({ id: schema.contactMessages.id });

    // The whole stored row was echoed back to the caller. Only the id is
    // useful, and returning the message body is needless data exposure.
    return c.json({
      success: true,
      message: "Thanks for getting in touch. We will reply shortly.",
      id: message?.id,
    });
  },
);
