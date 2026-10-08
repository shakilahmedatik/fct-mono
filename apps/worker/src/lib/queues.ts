import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const QUEUES = {
  DIGEST_PIPELINE: "digest-pipeline",
  AUDIO_GENERATION: "audio-generation",
  TELEGRAM_DELIVERY: "telegram-delivery",
  EMAIL_DELIVERY: "email-delivery",
} as const;

export const digestQueue = new Queue(QUEUES.DIGEST_PIPELINE, {
  connection: redisConnection,
});

export const audioQueue = new Queue(QUEUES.AUDIO_GENERATION, {
  connection: redisConnection,
});

export const deliveryQueue = new Queue(QUEUES.TELEGRAM_DELIVERY, {
  connection: redisConnection,
});

export const emailQueue = new Queue(QUEUES.EMAIL_DELIVERY, {
  connection: redisConnection,
});
