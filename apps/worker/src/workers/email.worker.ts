import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { asc, eq } from "drizzle-orm";
import { emailDelivery } from "../delivery";
import { ensureAudioReady, isAlreadyDelivered } from "../delivery/guards";
import type { DeliveryChannel } from "../delivery/types";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

/**
 * The lock has to outlive the worst case job duration: the Resend request is
 * aborted after 15 seconds, the database round trips add a few more. BullMQ's
 * 30 second default is too short — a job that outlives its lock is declared
 * stalled and run again, which sends the briefing twice.
 */
const DELIVERY_LOCK_DURATION_MS = 120_000;

/**
 * Base URL of the unsubscribe page. The per-recipient token is appended as a
 * query parameter.
 */
function buildUnsubscribeUrl(token: string): string {
  const base = (process.env.UNSUBSCRIBE_URL_BASE || "https://firstcup.tech/unsubscribe").replace(
    /\/$/,
    "",
  );
  return `${base}?token=${encodeURIComponent(token)}`;
}

export function createEmailWorker() {
  const worker = new Worker(
    QUEUES.EMAIL_DELIVERY,
    async (job: Job<{ digestId: string; userId: string; channel?: DeliveryChannel }>) => {
      const { digestId, userId } = job.data;
      const channel: DeliveryChannel = job.data.channel ?? "email";

      workerLogger.info(
        { jobId: job.id, digestId, userId, channel },
        "Processing Email briefing dispatch...",
      );

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        with: { preference: true },
      });

      if (!user) {
        workerLogger.warn({ userId }, "User not found for Email delivery");
        return { sent: false, reason: "user_not_found" };
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

      // Pre-send guard: this (digest, channel) was already delivered.
      if (isAlreadyDelivered(digest.audioBrief, channel)) {
        workerLogger.info(
          { userId, digestId, channel },
          "Email delivery skipped — the briefing was already sent",
        );
        return { sent: false, reason: "already_delivered" };
      }

      if (!user.email) {
        workerLogger.warn({ userId }, "User has no email address. Skipping delivery.");
        return { sent: false, reason: "no_email" };
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

      // A per-recipient unsubscribe link, if the address is a newsletter
      // subscriber.
      let unsubscribeUrl: string | null = null;
      const subscriber = await db.query.newsletterSubscribers.findFirst({
        where: eq(schema.newsletterSubscribers.email, user.email.toLowerCase()),
      });
      if (subscriber?.unsubscribeToken) {
        unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsubscribeToken);
      }

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
        unsubscribeUrl,
      };

      const result = await emailDelivery.sendAudio(payload);

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
          { userId, email: user.email, messageId: result.messageId },
          "Email briefing delivered successfully.",
        );

        return { sent: true, messageId: result.messageId };
      }

      await db
        .update(schema.audioBriefs)
        .set({
          deliveryChannel: channel,
          deliveryStatus: "failed",
          errorMessage: result.errorMessage || "Email dispatch failed",
          updatedAt: new Date(),
        })
        .where(eq(schema.audioBriefs.digestId, digestId));

      if (result.isPermanentFailure) {
        // A hard bounce, a suppression or a complaint means the address cannot
        // receive mail any more. The delivery channel is disabled so the
        // address is not mailed again every morning.
        //
        // TODO(db): the schema has a single `channelEnabled` flag per user and
        // no per-channel flag, so a per-channel preference (email disabled,
        // telegram still on) needs a schema change owned by the database team.
        if (user.preference) {
          await db
            .update(schema.userPreferences)
            .set({ channelEnabled: false, updatedAt: new Date() })
            .where(eq(schema.userPreferences.id, user.preference.id));
        }

        workerLogger.error(
          { userId, email: user.email, error: result.errorMessage },
          "Permanent email failure — the delivery channel of the user was disabled",
        );
      } else {
        workerLogger.warn(
          { userId, error: result.errorMessage, permanent: result.isPermanentFailure },
          "Email briefing delivery failed.",
        );
      }

      return {
        sent: false,
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
    workerLogger.error({ jobId: job?.id, err: err.message }, "Email delivery worker job failed");
  });

  return worker;
}
