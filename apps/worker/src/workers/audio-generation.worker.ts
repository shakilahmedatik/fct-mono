import { db, schema } from "@repo/db";
import { enqueueDeliveryJob, resolveDeliveryRoute } from "@repo/pipeline/stages";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { synthesizeAudioWithFailover } from "../audio/synthesizer";
import { workerLogger } from "../lib/logger";
import { QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

/**
 * Audio synthesis plus the upload can take considerably longer than BullMQ's
 * 30 second default lock. A job that outlives its lock is declared stalled
 * and run a second time, which would upload (and deliver) twice.
 */
const AUDIO_LOCK_DURATION_MS = 300_000;

export function createAudioGenerationWorker() {
  const worker = new Worker(
    QUEUES.AUDIO_GENERATION,
    async (job: Job<{ digestId: string; userId?: string }>) => {
      const { digestId, userId } = job.data;
      workerLogger.info(
        { jobId: job.id, digestId, userId },
        "Generating audio brief for digest...",
      );

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
      let audioUrl: string;
      let provider: string;
      let durationSec: number;

      try {
        const synthesis = await synthesizeAudioWithFailover(script, digestId);
        audioUrl = synthesis.audioUrl;
        provider = synthesis.provider;
        durationSec = synthesis.durationSec;
      } catch (error) {
        // Mark the brief as failed so that the delivery does not wait for an
        // audio that will never exist — the briefing is then sent as text.
        await db
          .update(schema.audioBriefs)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Audio synthesis failed",
            updatedAt: new Date(),
          })
          .where(eq(schema.audioBriefs.digestId, digestId));

        throw error;
      }

      workerLogger.info(
        { digestId, audioUrl, provider, durationSec },
        "Audio generation and S3 upload completed.",
      );

      // Safety net: the delivery job is normally enqueued by the cohorts stage
      // together with this audio job. If that enqueue was lost, it is retried
      // here — with the same deterministic job id, so an existing job is never
      // duplicated.
      if (userId) {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, userId),
          with: { preference: true },
        });

        if (user) {
          const route = resolveDeliveryRoute({
            preferredChannel: user.preferredDeliveryChannel,
            channelEnabled: user.preference?.channelEnabled !== false,
            hasTelegramChatId: Boolean(user.telegramChatId),
            hasEmail: Boolean(user.email),
          });

          if (route) {
            await enqueueDeliveryJob({ digestId, userId, channel: route.channel });
          }
        }
      }

      return { audioUrl, provider, durationSec };
    },
    {
      connection: redisConnection,
      concurrency: 3,
      lockDuration: AUDIO_LOCK_DURATION_MS,
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
