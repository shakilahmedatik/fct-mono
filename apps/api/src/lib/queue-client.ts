import { Queue } from "bullmq";
import { redis } from "./redis";

export const QUEUE_NAMES = {
  DIGEST_PIPELINE: "digest-pipeline",
  AUDIO_GENERATION: "audio-generation",
  TELEGRAM_DELIVERY: "telegram-delivery",
  EMAIL_DELIVERY: "email-delivery",
} as const;

export const digestQueue = new Queue(QUEUE_NAMES.DIGEST_PIPELINE, {
  connection: redis,
});

export const audioQueue = new Queue(QUEUE_NAMES.AUDIO_GENERATION, {
  connection: redis,
});

export const deliveryQueue = new Queue(QUEUE_NAMES.TELEGRAM_DELIVERY, {
  connection: redis,
});

export const emailQueue = new Queue(QUEUE_NAMES.EMAIL_DELIVERY, {
  connection: redis,
});

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
