import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createEmailWorker() {
  const worker = new Worker(
    QUEUES.EMAIL_DELIVERY,
    async (job: Job<{ digestId: string; userId: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info({ jobId: job.id, digestId, userId }, "Sending briefing email...");

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user?.email) {
        return { sent: false, reason: "no_email" };
      }

      workerLogger.info({ userId, email: user.email }, "Briefing email sent successfully.");
      return { sent: true, email: user.email };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Email delivery failed");
  });

  return worker;
}
