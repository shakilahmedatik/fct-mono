import { Hono } from "hono";
import { authGuard } from "../../middleware/auth-guard";
import type { AppBindings } from "../../types";
import { userService } from "../user/service";
import { billingService } from "./service";

export const billingRouter = new Hono<AppBindings>()
  .post("/webhook", async (c) => {
    try {
      const body = (await c.req.json()) as { event_type: string; data: Record<string, unknown> };
      await billingService.handlePaddleWebhook(body);
      return c.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: "Failed to process webhook", details: message }, 400);
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
