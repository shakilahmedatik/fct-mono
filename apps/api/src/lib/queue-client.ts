import { Queue } from "bullmq";
import { bullRedis } from "./redis";

export const QUEUE_NAMES = {
  DIGEST_PIPELINE: "digest-pipeline",
  AUDIO_GENERATION: "audio-generation",
  TELEGRAM_DELIVERY: "telegram-delivery",
  EMAIL_DELIVERY: "email-delivery",
} as const;

/**
 * A single set of Queue instances.
 *
 * Previously the same four queues were instantiated twice (once here and once
 * in the playground queue inspector), which meant two sources of truth for the
 * queue names and nothing was ever closed on shutdown.
 */
export const queues = {
  digest: new Queue(QUEUE_NAMES.DIGEST_PIPELINE, { connection: bullRedis }),
  audio: new Queue(QUEUE_NAMES.AUDIO_GENERATION, { connection: bullRedis }),
  telegram: new Queue(QUEUE_NAMES.TELEGRAM_DELIVERY, { connection: bullRedis }),
  email: new Queue(QUEUE_NAMES.EMAIL_DELIVERY, { connection: bullRedis }),
} as const;

export const digestQueue = queues.digest;
export const audioQueue = queues.audio;
export const deliveryQueue = queues.telegram;
export const emailQueue = queues.email;

export async function enqueueDigestGeneration(data: {
  userId?: string;
  type?: "daily_audio" | "weekly_newsletter";
  force?: boolean;
}) {
  return digestQueue.add("generate-digest", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
}

/**
 * Close every queue. Used by the graceful shutdown path.
 */
export async function closeQueues(): Promise<void> {
  await Promise.allSettled(Object.values(queues).map((queue) => queue.close()));
}
