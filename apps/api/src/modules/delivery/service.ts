import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { redis } from "../../lib/redis";
import { verifyTelegramLinkToken } from "../../lib/telegram";
import { logger } from "../../middleware/logger";

const UPDATE_DEDUPE_TTL_SECONDS = 60 * 60 * 24;

export const deliveryService = {
  async handleTelegramWebhook(update: {
    update_id?: number;
    message?: {
      chat: { id: number | string };
      text?: string;
      from?: { username?: string };
    };
  }) {
    // Telegram retries updates; processing one twice would rebind a chat
    // twice, so each update id is claimed once.
    if (typeof update.update_id === "number") {
      try {
        const claimed = await redis.set(
          `telegram:update:${update.update_id}`,
          "1",
          "EX",
          UPDATE_DEDUPE_TTL_SECONDS,
          "NX",
        );
        if (claimed !== "OK") {
          return { ok: true, duplicate: true };
        }
      } catch (error) {
        logger.warn(
          { err: error instanceof Error ? error.message : String(error) },
          "Could not record Telegram update id; continuing without deduplication",
        );
      }
    }

    const message = update.message;
    if (!message?.text) return { ok: true };

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const username = message.from?.username;

    // Handle /start <signed-token>
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      if (parts.length > 1) {
        const token = parts[1];

        // The token must be a signed, unexpired link token. A bare user id is
        // rejected: accepting one would let anyone rebind another account's
        // Telegram chat and receive that account's digests.
        const verification = verifyTelegramLinkToken(token);
        if (!verification.valid || !verification.userId) {
          logger.warn(
            { reason: verification.reason },
            "Rejected Telegram /start with an invalid link token",
          );
          return { ok: true, linked: false };
        }

        const userId = verification.userId;

        await db
          .update(schema.users)
          .set({
            telegramChatId: chatId,
            telegramUsername: username,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, userId));

        logger.info({ userId }, "Linked Telegram chat to user");
      }
    }

    return { ok: true };
  },
};
