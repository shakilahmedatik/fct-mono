import { Hono } from "hono";
import { verifyPaddleSignature } from "../../lib/paddle";
import { authGuard } from "../../middleware/auth-guard";
import { logger } from "../../middleware/logger";
import type { AppBindings } from "../../types";
import { userService } from "../user/service";
import { billingService } from "./service";

export const billingRouter = new Hono<AppBindings>()
  .post("/webhook", async (c) => {
    // The raw body is required: the signature is computed over the exact
    // bytes Paddle sent, so the payload must not be re-serialised.
    const rawBody = await c.req.text();

    const verification = verifyPaddleSignature(c.req.header("paddle-signature"), rawBody);
    if (!verification.valid) {
      logger.warn(
        { reason: verification.reason, requestId: c.get("requestId") },
        "Rejected Paddle webhook with an invalid signature",
      );
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    let body: { event_type: string; event_id?: string; data: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Malformed webhook payload" }, 400);
    }

    if (!body.event_type) {
      return c.json({ error: "Missing event_type" }, 400);
    }

    try {
      await billingService.handlePaddleWebhook(body, { eventId: body.event_id });
      return c.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(
        { err: message, eventType: body.event_type, requestId: c.get("requestId") },
        "Failed to process Paddle webhook",
      );
      // Do not echo the internal message back to the caller.
      return c.json({ error: "Failed to process webhook" }, 500);
    }
  })
  .get("/subscription", authGuard, async (c) => {
    const user = c.get("user");
    const profile = await userService.getProfile(user.id);
    return c.json({
      plan: profile.plan,
      subscriptionStatus: profile.subscriptionStatus,
      paddleCustomerId: profile.paddleCustomerId,
      paddleSubscriptionId: profile.paddleSubscriptionId,
      trialEndsAt: profile.trialEndsAt,
    });
  });
