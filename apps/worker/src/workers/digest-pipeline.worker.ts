import { type AIProviderConfig, aiConfigStorage } from "@repo/pipeline";
import { type Job, Worker } from "bullmq";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";
import { runAutonomousPipeline } from "../pipeline/orchestrator";

export function createDigestPipelineWorker() {
  const worker = new Worker(
    QUEUES.DIGEST_PIPELINE,
    async (
      job: Job<{
        userId?: string;
        type?: "cron" | "admin" | "manual";
        force?: boolean;
        aiConfig?: AIProviderConfig;
      }>,
    ) => {
      workerLogger.info(
        { jobId: job.id, data: job.data },
        "Starting autonomous pipeline execution job...",
      );

      const run = () =>
        runAutonomousPipeline({
          triggerSource: job.data.type || "cron",
          userId: job.data.userId,
        });

      const report = job.data.aiConfig
        ? await aiConfigStorage.run(job.data.aiConfig, run)
        : await run();

      if (!report.success) {
        throw new Error(`Pipeline execution failed: ${report.errors.join("; ")}`);
      }

      return report;
    },
    {
      connection: redisConnection,
      concurrency: 2,
    },
  );

  worker.on("completed", (job, result) => {
    workerLogger.info({ jobId: job.id, result }, "Digest pipeline job completed successfully");
  });

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Digest pipeline job failed");
  });

  return worker;
}
