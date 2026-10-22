// =============================================================================
// Delivery Routing & Job Dispatch
// =============================================================================
//
// The delivery chain is:
//
//   cohorts stage  ──▶ audio job (digestId + userId)
//                  └─▶ delivery job (digestId + userId + channel)
//
// The audio job generates the audio for the personal digest; the delivery job
// waits for that audio and then sends the briefing.
//
// Both jobs carry a deterministic job id so that a repeated enqueue (a BullMQ
// retry of the pipeline job, a second cron tick, a manual re-run) is deduped
// by BullMQ instead of sending the briefing twice.
// =============================================================================

import { logger } from "./logger";
import { getAudioQueue, getDeliveryQueue } from "./queues";

export type DeliveryChannelName = "telegram" | "email";

export interface DeliveryRouteInput {
  /** `user.preferredDeliveryChannel` — "telegram", "email" or "whatsapp". */
  preferredChannel?: string | null;
  /** `user.preference.channelEnabled` — the master switch for delivery. */
  channelEnabled: boolean;
  hasTelegramChatId: boolean;
  hasEmail: boolean;
}

export interface DeliveryRoute {
  channel: DeliveryChannelName;
  /** Why this channel was chosen — surfaced in the logs. */
  reason: string;
}

/**
 * Decide which channel a briefing must be delivered to.
 *
 * Only the preferred channel is used. There is no WhatsApp adapter, so a
 * WhatsApp preference falls back to email rather than silently delivering
 * nothing.
 */
export function resolveDeliveryRoute(input: DeliveryRouteInput): DeliveryRoute | null {
  if (!input.channelEnabled) {
    return null;
  }

  const preferred = (input.preferredChannel || "telegram").trim().toLowerCase();

  if (preferred === "telegram") {
    if (input.hasTelegramChatId) return { channel: "telegram", reason: "preferred" };
    if (input.hasEmail) return { channel: "email", reason: "telegram-chat-id-missing" };
    return null;
  }

  if (preferred === "whatsapp") {
    // No WhatsApp adapter exists — fall back to email instead of doing nothing.
    if (input.hasEmail) return { channel: "email", reason: "whatsapp-not-supported" };
    return null;
  }

  // "email" and any unknown value fall back to email.
  if (input.hasEmail) {
    return { channel: "email", reason: preferred === "email" ? "preferred" : "unknown-channel" };
  }
  return null;
}

/** Deterministic job id for an audio generation job. */
export function audioJobId(digestId: string, userId?: string): string {
  return `generate-audio:${digestId}:${userId ?? "master"}`;
}

/** Deterministic job id for a delivery job. */
export function deliveryJobId(
  channel: DeliveryChannelName,
  digestId: string,
  userId: string,
): string {
  return channel === "telegram"
    ? `send-telegram:${digestId}:${userId}`
    : `send-email:${digestId}:${userId}`;
}

/**
 * Remove a job that already gave up, so that a new attempt can be made.
 * A job that is waiting, active or completed is left alone: the deterministic
 * job id is the dedupe mechanism.
 */
async function clearFailedJob(
  queue: ReturnType<typeof getAudioQueue>,
  jobId: string,
): Promise<boolean> {
  const existing = await queue.getJob(jobId);
  if (!existing) return true;

  const state = await existing.getState();
  if (state === "failed") {
    logger.warn({ jobId }, "Previous job failed — removing it so that a new attempt is made");
    await existing.remove();
    return true;
  }

  return false;
}

/**
 * Enqueue an audio generation job.
 *
 * @returns true when a new job was actually added, false when the job already
 *          existed (BullMQ dedupe).
 */
export async function enqueueAudioJob(payload: {
  digestId: string;
  userId?: string;
}): Promise<boolean> {
  const jobId = audioJobId(payload.digestId, payload.userId);
  const queue = getAudioQueue();

  try {
    if (!(await clearFailedJob(queue, jobId))) {
      logger.info({ jobId, digestId: payload.digestId }, "Audio job already queued — skipping");
      return false;
    }

    await queue.add(
      "generate-audio",
      { digestId: payload.digestId, userId: payload.userId },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    );

    logger.info(
      { jobId, digestId: payload.digestId, userId: payload.userId },
      "Audio job enqueued",
    );
    return true;
  } catch (err) {
    logger.error(
      { jobId, err: err instanceof Error ? err.message : String(err) },
      "Failed to enqueue audio job",
    );
    return false;
  }
}

/**
 * Enqueue a delivery job for one user.
 *
 * @returns true when a new job was actually added, false when the job already
 *          existed (BullMQ dedupe) or the enqueue failed.
 */
export async function enqueueDeliveryJob(payload: {
  digestId: string;
  userId: string;
  channel: DeliveryChannelName;
}): Promise<boolean> {
  const jobId = deliveryJobId(payload.channel, payload.digestId, payload.userId);
  const queue = getDeliveryQueue(payload.channel);

  try {
    if (!(await clearFailedJob(queue, jobId))) {
      logger.info(
        { jobId, digestId: payload.digestId, userId: payload.userId },
        "Delivery job already queued — skipping",
      );
      return false;
    }

    await queue.add(
      payload.channel === "telegram" ? "send-telegram" : "send-email",
      {
        digestId: payload.digestId,
        userId: payload.userId,
        channel: payload.channel,
      },
      {
        jobId,
        // The delivery may have to wait for the audio generation job to
        // finish, so it is retried a few times before it is given up on.
        attempts: 6,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    );

    logger.info(
      { jobId, digestId: payload.digestId, userId: payload.userId, channel: payload.channel },
      "Delivery job enqueued",
    );
    return true;
  } catch (err) {
    logger.error(
      { jobId, err: err instanceof Error ? err.message : String(err) },
      "Failed to enqueue delivery job",
    );
    return false;
  }
}
