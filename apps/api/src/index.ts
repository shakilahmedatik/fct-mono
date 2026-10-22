import { closeDb } from "@repo/db";
import { app } from "./app";
import { closeQueues } from "./lib/queue-client";
import { closeRedis } from "./lib/redis";
import { logger } from "./middleware/logger";

const port = Number(process.env.PORT) || 4000;

logger.info(`🚀 First Cup Tech API server listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

export type { AppType } from "./app";

/**
 * Graceful shutdown.
 *
 * Without this, a deploy kills in-flight requests, leaks the Redis and
 * Postgres pools, and leaves BullMQ bookkeeping mid-flight — BullMQ relies on
 * a clean close to move active jobs back to `wait`.
 */
let shuttingDown = false;

async function handleShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Gracefully shutting down the API...");

  await Promise.allSettled([closeQueues(), closeRedis(), closeDb()]);

  logger.info("API shut down cleanly.");
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
