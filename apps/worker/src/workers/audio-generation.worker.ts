import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { synthesizeAudioWithFailover } from "../audio/synthesizer";
import { workerLogger } from "../lib/logger";
import { deliveryQueue, emailQueue, QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createAudioGenerationWorker() {
  const worker = new Worker(
    QUEUES.AUDIO_GENERATION,
    async (job: Job<{ digestId: string; userId?: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info({ jobId: job.id, digestId }, "Generating audio brief for digest...");

      const digest = await db.query.digests.findFirst({
        where: eq(schema.digests.id, digestId),
        with: {
          items: true,
          audioBrief: true,
        },
      });

      if (!digest) {
        throw new Error(`Digest not found: ${digestId}`);
      }

      // Retrieve existing script from audioBrief, or synthesize from digest items
      let script = digest.audioBrief?.script;
      if (!script) {
        const scriptLines = digest.items.map(
          (item) =>
            `${item.title}. ${item.summary || ""} ${item.whyItMatters ? `Why it matters: ${item.whyItMatters}` : ""}`,
        );
        script = `Good morning. Here is your First Cup briefing for today. ${scriptLines.join(" ")} Have a productive build day.`;
      }

      // Synthesize audio with failover cascade (ElevenLabs -> Deepgram -> Kokoro) and upload to RustFS/S3
      const { audioUrl, provider, durationSec } = await synthesizeAudioWithFailover(
        script,
        digestId,
      );

      workerLogger.info(
        { digestId, audioUrl, provider, durationSec },
        "Audio generation and S3 upload completed. Triggering deliveries...",
      );

      // Enqueue deliveries if user is targeted
      if (userId) {
        await deliveryQueue.add("send-telegram", { digestId, userId });
        await emailQueue.add("send-email", { digestId, userId });
      }

      return { audioUrl, provider, durationSec };
    },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  worker.on("completed", (job) => {
    workerLogger.info({ jobId: job.id }, "Audio generation job completed successfully");
  });

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Audio generation job failed");
  });

  return worker;
}
