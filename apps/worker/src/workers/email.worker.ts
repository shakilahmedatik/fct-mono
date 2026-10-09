import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { asc, eq } from "drizzle-orm";
import { emailDelivery } from "../delivery";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createEmailWorker() {
  const worker = new Worker(
    QUEUES.EMAIL_DELIVERY,
    async (job: Job<{ digestId: string; userId: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info(
        { jobId: job.id, digestId, userId },
        "Processing Email briefing dispatch...",
      );

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) {
        workerLogger.warn({ userId }, "User not found for Email delivery");
        return { sent: false, reason: "user_not_found" };
      }

      if (!user.email) {
        workerLogger.warn({ userId }, "User has no email address. Skipping delivery.");
        return { sent: false, reason: "no_email" };
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
        workerLogger.error({ digestId }, "Digest not found for Email delivery");
        return { sent: false, reason: "digest_not_found" };
      }

      const deliveryItems = digest.items.map((i) => ({
        title: i.title,
        url: i.url,
        source: i.source,
        summary: i.summary,
        whyItMatters: i.whyItMatters,
      }));

      const payload = {
        recipientId: user.email,
        recipientName: user.name,
        audioUrl: digest.audioBrief?.audioUrl,
        durationSec: digest.audioBrief?.durationSec ?? 180,
        title: digest.title || "First Cup Tech — Morning Brief & Audio Digest",
        caption: `Good morning ${user.name}. Here is your executive tech intelligence briefing for today:`,
        items: deliveryItems,
        digestId,
        userId,
      };

      const result = await emailDelivery.sendAudio(payload);

      if (result.success) {
        await db
          .update(schema.digests)
          .set({ status: "delivered", deliveredAt: new Date() })
          .where(eq(schema.digests.id, digestId));

        if (user.preferredDeliveryChannel === "email") {
          await db
            .update(schema.audioBriefs)
            .set({
              deliveryChannel: "email",
              deliveryStatus: "sent",
              deliveryMessageId: result.messageId,
              errorMessage: null,
              updatedAt: new Date(),
            })
            .where(eq(schema.audioBriefs.digestId, digestId));
        }

        workerLogger.info(
          { userId, email: user.email, messageId: result.messageId },
          "Email briefing delivered successfully.",
        );

        return { sent: true, messageId: result.messageId };
      }

      if (user.preferredDeliveryChannel === "email") {
        await db
          .update(schema.audioBriefs)
          .set({
            deliveryChannel: "email",
            deliveryStatus: "failed",
            errorMessage: result.errorMessage || "Email dispatch failed",
            updatedAt: new Date(),
          })
          .where(eq(schema.audioBriefs.digestId, digestId));
      }

      workerLogger.warn(
        { userId, error: result.errorMessage, permanent: result.isPermanentFailure },
        "Email briefing delivery failed.",
      );

      return {
        sent: false,
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
    workerLogger.error({ jobId: job?.id, err: err.message }, "Email delivery worker job failed");
  });

  return worker;
}
