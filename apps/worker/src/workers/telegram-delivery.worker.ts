import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createTelegramDeliveryWorker() {
  const worker = new Worker(
    QUEUES.TELEGRAM_DELIVERY,
    async (job: Job<{ digestId: string; userId: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info({ jobId: job.id, digestId, userId }, "Delivering briefing via Telegram...");

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user?.telegramChatId) {
        workerLogger.warn(
          { userId },
          "User does not have Telegram chat ID connected. Skipping delivery.",
        );
        return { delivered: false, reason: "no_chat_id" };
      }

      // Mark audio brief and digest delivered
      await db
        .update(schema.digests)
        .set({ status: "delivered", deliveredAt: new Date() })
        .where(eq(schema.digests.id, digestId));

      await db
        .update(schema.audioBriefs)
        .set({ deliveryStatus: "sent" })
        .where(eq(schema.audioBriefs.digestId, digestId));

      workerLogger.info({ userId, chatId: user.telegramChatId }, "Telegram delivery successful.");
      return { delivered: true, chatId: user.telegramChatId };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Telegram delivery failed");
  });

  return worker;
}
