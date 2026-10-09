import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { asc, eq } from "drizzle-orm";
import { telegramDelivery } from "../delivery";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createTelegramDeliveryWorker() {
  const worker = new Worker(
    QUEUES.TELEGRAM_DELIVERY,
    async (job: Job<{ digestId: string; userId: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info(
        { jobId: job.id, digestId, userId },
        "Processing Telegram briefing dispatch...",
      );

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) {
        workerLogger.warn({ userId }, "User not found for Telegram delivery");
        return { delivered: false, reason: "user_not_found" };
      }

      if (!user.telegramChatId) {
        workerLogger.warn(
          { userId },
          "User does not have Telegram chat ID connected. Skipping delivery.",
        );

        await db
          .update(schema.audioBriefs)
          .set({
            deliveryChannel: "telegram",
            deliveryStatus: "skipped",
            errorMessage: "User has no Telegram chat ID connected",
            updatedAt: new Date(),
          })
          .where(eq(schema.audioBriefs.digestId, digestId));

        return { delivered: false, reason: "no_chat_id" };
      }

      const digest = await db.query.digests.findFirst({
        where: eq(schema.digests.id, digestId),
        with: {
          items: {
            orderBy: [asc(schema.digestItems.position)],
          },
          audioBrief: true,
        },
      });

      if (!digest) {
        workerLogger.error({ digestId }, "Digest not found for Telegram delivery");
        return { delivered: false, reason: "digest_not_found" };
      }

      const deliveryItems = digest.items.map((i) => ({
        title: i.title,
        url: i.url,
        source: i.source,
        summary: i.summary,
        whyItMatters: i.whyItMatters,
      }));

      const payload = {
        recipientId: user.telegramChatId,
        recipientName: user.name,
        audioUrl: digest.audioBrief?.audioUrl,
        durationSec: digest.audioBrief?.durationSec ?? 180,
        title: digest.title || "First Cup Tech — Morning Brief",
        caption: digest.audioBrief?.script || undefined,
        items: deliveryItems,
        digestId,
        userId,
      };

      const result = await telegramDelivery.sendAudio(payload);

      if (result.success) {
        await db
          .update(schema.digests)
          .set({ status: "delivered", deliveredAt: new Date() })
          .where(eq(schema.digests.id, digestId));

        await db
          .update(schema.audioBriefs)
          .set({
            deliveryChannel: "telegram",
            deliveryStatus: "sent",
            deliveryMessageId: result.messageId,
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.audioBriefs.digestId, digestId));

        workerLogger.info(
          { userId, chatId: user.telegramChatId, messageId: result.messageId },
          "Telegram briefing delivered successfully.",
        );

        return { delivered: true, messageId: result.messageId };
      }

      await db
        .update(schema.audioBriefs)
        .set({
          deliveryChannel: "telegram",
          deliveryStatus: "failed",
          errorMessage: result.errorMessage || "Telegram dispatch failed",
          updatedAt: new Date(),
        })
        .where(eq(schema.audioBriefs.digestId, digestId));

      workerLogger.warn(
        { userId, error: result.errorMessage, permanent: result.isPermanentFailure },
        "Telegram briefing delivery failed.",
      );

      return {
        delivered: false,
        error: result.errorMessage,
        isPermanentFailure: result.isPermanentFailure,
      };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Telegram delivery worker job failed");
  });

  return worker;
}
