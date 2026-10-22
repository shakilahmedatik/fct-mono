import { zValidator } from "@hono/zod-validator";
import { updateProfileSchema, userPreferenceSchema } from "@repo/shared-types/validators";
import { Hono } from "hono";
import { buildTelegramDeepLink, createTelegramLinkToken } from "../../lib/telegram";
import { authGuard } from "../../middleware/auth-guard";
import type { AppBindings } from "../../types";
import { userService } from "./service";

export const userRouter = new Hono<AppBindings>()
  .use("*", authGuard)
  .get("/me", async (c) => {
    const user = c.get("user");
    const profile = await userService.getProfile(user.id);
    return c.json({ user: profile });
  })
  .patch("/profile", zValidator("json", updateProfileSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const updated = await userService.updateProfile(user.id, data);
    return c.json({ user: updated });
  })
  .get("/preferences", async (c) => {
    const user = c.get("user");
    const preferences = await userService.getPreferences(user.id);
    return c.json({ preferences });
  })
  .put("/preferences", zValidator("json", userPreferenceSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const preferences = await userService.updatePreferences(user.id, data);
    return c.json({ preferences });
  })
  // Mint a signed, expiring Telegram deep link. The webhook no longer accepts
  // a bare user id, so this is how a user connects their Telegram account.
  .post("/telegram-link", async (c) => {
    const user = c.get("user");
    const token = createTelegramLinkToken(user.id);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "firstcuptech_bot";
    return c.json({
      token,
      botUsername,
      deepLink: buildTelegramDeepLink(botUsername, token),
      expiresInSeconds: 15 * 60,
    });
  });
