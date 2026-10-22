import { workerLogger } from "../lib/logger";
import { digestQueue } from "../lib/queues";

/**
 * Repeatable jobs are kept for a while so that the state of the last runs can
 * be inspected, but they must not accumulate in Redis forever.
 */
const JOB_CLEANUP = {
  removeOnComplete: { age: 24 * 60 * 60, count: 100 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
} as const;

export async function setupJobSchedulers() {
  workerLogger.info("Configuring BullMQ repeatable job schedulers...");

  // Daily Morning Digest Generation at 6:00 AM UTC
  await digestQueue.upsertJobScheduler(
    "daily-morning-digest",
    { pattern: "0 6 * * *" },
    {
      name: "generate-digest",
      data: { type: "cron" },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        ...JOB_CLEANUP,
      },
    },
  );

  // Weekly Newsletter Digest on Mondays at 10:00 AM UTC
  await digestQueue.upsertJobScheduler(
    "weekly-newsletter-digest",
    { pattern: "0 10 * * 1" },
    {
      name: "generate-digest",
      data: { type: "cron" },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        ...JOB_CLEANUP,
      },
    },
  );

  workerLogger.info("Job schedulers configured successfully.");
}
