import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
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
        },
      });

      if (!digest) {
        throw new Error(`Digest not found: ${digestId}`);
      }

      // Synthesize script from digest items
      const scriptLines = digest.items.map((item) => `${item.title}. ${item.summary || ""}`);
      const script = `Good morning! Here is your First Cup briefing for today. ${scriptLines.join(" ")}`;

      const audioBriefId = crypto.randomUUID();

      // Upsert audio brief record
      await db.insert(schema.audioBriefs).values({
        id: audioBriefId,
        digestId,
        status: "ready",
        script,
        audioUrl: `https://storage.firstcup.tech/audio/${digestId}.mp3`,
        durationSec: 180,
        provider: "elevenlabs",
        deliveryChannel: "telegram",
        deliveryStatus: "pending",
      });

      workerLogger.info(
        { digestId, audioBriefId },
        "Audio brief created. Triggering deliveries...",
      );

      // Enqueue deliveries if user is targeted
      if (userId) {
        await deliveryQueue.add("send-telegram", { digestId, userId });
        await emailQueue.add("send-email", { digestId, userId });
      }

      return { audioBriefId };
    },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  worker.on("completed", (job) => {
    workerLogger.info({ jobId: job.id }, "Audio generation job completed");
  });

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Audio generation job failed");
  });

  return worker;
}
