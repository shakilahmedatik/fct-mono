import { Hono } from "hono";
import { verifyTelegramSecretToken } from "../../lib/telegram";
import { logger } from "../../middleware/logger";
import type { AppBindings } from "../../types";
import { deliveryService } from "./service";

export const deliveryRouter = new Hono<AppBindings>().post("/telegram/webhook", async (c) => {
  // The webhook is public by design (Telegram calls it), so authenticity comes
  // from the shared secret token Telegram sends, not from a session.
  const verification = verifyTelegramSecretToken(c.req.header("x-telegram-bot-api-secret-token"));
  if (!verification.valid) {
    logger.warn(
      { reason: verification.reason, requestId: c.get("requestId") },
      "Rejected Telegram webhook",
    );
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  let update: {
    update_id?: number;
    message?: {
      chat: { id: number | string };
      text?: string;
      from?: { username?: string };
    };
  };

  try {
    update = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Malformed update" }, 400);
  }

  const res = await deliveryService.handleTelegramWebhook(update);
  return c.json(res);
});
