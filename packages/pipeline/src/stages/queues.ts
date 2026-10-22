import { Queue } from "bullmq";
import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Queue names shared by every process that takes part in the pipeline.
 * They must stay identical to the names used by the worker and the API.
 */
export const PIPELINE_QUEUE_NAMES = {
  DIGEST_PIPELINE: "digest-pipeline",
  AUDIO_GENERATION: "audio-generation",
  TELEGRAM_DELIVERY: "telegram-delivery",
  EMAIL_DELIVERY: "email-delivery",
} as const;

export type PipelineQueueName = (typeof PIPELINE_QUEUE_NAMES)[keyof typeof PIPELINE_QUEUE_NAMES];

let redisConnection: Redis | null = null;
const queues = new Map<string, Queue>();

/**
 * Lazily created Redis connection.
 *
 * The connection is created on first use so that importing the pipeline
 * package (the API playground does) never opens a socket by itself.
 */
function getRedisConnection(): Redis {
  if (redisConnection) return redisConnection;

  const url = process.env.REDIS_URL || "redis://localhost:6379";
  redisConnection = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redisConnection.on("error", (err) => {
    logger.error({ err: err.message }, "Pipeline Redis connection error");
  });

  return redisConnection;
}

export function getQueue(name: PipelineQueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, { connection: getRedisConnection() });
  queues.set(name, queue);
  return queue;
}

export function getAudioQueue(): Queue {
  return getQueue(PIPELINE_QUEUE_NAMES.AUDIO_GENERATION);
}

export function getDeliveryQueue(channel: "telegram" | "email"): Queue {
  return getQueue(
    channel === "telegram"
      ? PIPELINE_QUEUE_NAMES.TELEGRAM_DELIVERY
      : PIPELINE_QUEUE_NAMES.EMAIL_DELIVERY,
  );
}
