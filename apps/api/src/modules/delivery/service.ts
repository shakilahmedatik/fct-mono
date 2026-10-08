import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";

export const deliveryService = {
  async handleTelegramWebhook(update: {
    message?: {
      chat: { id: number | string };
      text?: string;
      from?: { username?: string };
    };
  }) {
    const message = update.message;
    if (!message?.text) return { ok: true };

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const username = message.from?.username;

    // Handle /start [token_or_userId]
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        const payload = parts[1];
        await db
          .update(schema.users)
          .set({
            telegramChatId: chatId,
            telegramUsername: username,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, payload));
      }
    }

    return { ok: true };
  },
};
