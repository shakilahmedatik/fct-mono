import Redis from "ioredis";
import { logger } from "../middleware/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * General-purpose Redis client.
 *
 * `maxRetriesPerRequest` is a finite number on purpose. BullMQ requires
 * `null` (it manages its own retry semantics), but a shared client with
 * `null` means ordinary commands are queued and retried forever — so a Redis
 * outage turns every request that touches Redis into an indefinite hang
 * instead of a clean failure.
 */
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 5_000,
  retryStrategy: (times) => Math.min(times * 200, 5_000),
});

redis.on("error", (err) => {
  logger.error({ err: err.message || String(err) }, "Redis connection error");
});

/**
 * Dedicated connection for BullMQ.
 *
 * BullMQ requires `maxRetriesPerRequest: null` and its own connection, so it
 * must not share the client above.
 */
export const bullRedis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 5_000,
});

bullRedis.on("error", (err) => {
  // ioredis sometimes emits an error whose `message` is empty (for example a
  // closed connection), which used to produce a log line reading `err: ""` —
  // useless exactly when it is needed.
  logger.error({ err: err.message || String(err) }, "BullMQ Redis connection error");
});

/**
 * Close every Redis connection. Used by the graceful shutdown path.
 */
export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), bullRedis.quit()]);
}
