import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { asc, eq } from "drizzle-orm";
import { telegramDelivery } from "../delivery";
import { ensureAudioReady, isAlreadyDelivered } from "../delivery/guards";
import type { DeliveryChannel } from "../delivery/types";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

/**
 * The lock has to outlive the worst case job duration. Telegram requests are
 * aborted after 10 seconds, a fallback upload can take another 10 seconds and
 * the database round trips add a few more — 120 seconds leaves a wide margin
 * over BullMQ's 30 second default. A shorter lock makes BullMQ declare the
 * job stalled and run it a second time, which sends the briefing twice.
 */
const DELIVERY_LOCK_DURATION_MS = 120_000;

export function createTelegramDeliveryWorker() {
  const worker = new Worker(
    QUEUES.TELEGRAM_DELIVERY,
    async (job: Job<{ digestId: string; userId: string; channel?: DeliveryChannel }>) => {
      const { digestId, userId } = job.data;
      const channel: DeliveryChannel = job.data.channel ?? "telegram";

      workerLogger.info(
        { jobId: job.id, digestId, userId, channel },
        "Processing Telegram briefing dispatch...",
      );

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        with: { preference: true },
      });

      if (!user) {
        workerLogger.warn({ userId }, "User not found for Telegram delivery");
        return { delivered: false, reason: "user_not_found" };
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

      // Pre-send guard: this (digest, channel) was already delivered.
      if (isAlreadyDelivered(digest.audioBrief, channel)) {
        workerLogger.info(
          { userId, digestId, channel },
          "Telegram delivery skipped — the briefing was already sent",
        );
        return { delivered: false, reason: "already_delivered" };
      }

      if (!user.telegramChatId) {
        workerLogger.warn(
          { userId },
          "User does not have Telegram chat ID connected. Skipping delivery.",
        );

        // The audio brief row is *not* touched here: a skipped delivery must
        // not overwrite the delivery state of the channel that is used.
        return { delivered: false, reason: "no_chat_id" };
      }

      // The briefing may only be sent once the audio exists. While the audio
      // job is still running the delivery job fails with a retryable error
      // and BullMQ retries it with a backoff.
      ensureAudioReady(digest.audioBrief, {
        audioEnabled: user.preference?.audioEnabled !== false,
        digestId,
      });

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
            deliveryChannel: channel,
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
          deliveryChannel: channel,
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
      lockDuration: DELIVERY_LOCK_DURATION_MS,
    },
  );

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Telegram delivery worker job failed");
  });

  return worker;
}
