import { workerLogger } from "../lib/logger";
import { digestQueue } from "../lib/queues";

export async function setupJobSchedulers() {
  workerLogger.info("Configuring BullMQ repeatable job schedulers...");

  // Daily Morning Digest Generation at 6:00 AM UTC
  await digestQueue.upsertJobScheduler(
    "daily-morning-digest",
    { pattern: "0 6 * * *" },
    {
      name: "generate-digest",
      data: { type: "daily_audio" },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    },
  );

  // Weekly Newsletter Digest on Mondays at 10:00 AM UTC
  await digestQueue.upsertJobScheduler(
    "weekly-newsletter-digest",
    { pattern: "0 10 * * 1" },
    {
      name: "generate-digest",
      data: { type: "weekly_newsletter" },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    },
  );

  workerLogger.info("Job schedulers configured successfully.");
}
