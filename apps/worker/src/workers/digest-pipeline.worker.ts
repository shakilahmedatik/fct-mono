import { db, schema } from "@repo/db";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { workerLogger } from "../lib/logger";
import { audioQueue, QUEUES } from "../lib/queues";
import { redisConnection } from "../lib/redis";

export function createDigestPipelineWorker() {
  const worker = new Worker(
    QUEUES.DIGEST_PIPELINE,
    async (job: Job<{ userId?: string; type?: string; force?: boolean }>) => {
      workerLogger.info(
        { jobId: job.id, data: job.data },
        "Starting digest pipeline processing...",
      );

      const userId = job.data.userId;
      const digestId = crypto.randomUUID();

      // Create new pending digest record
      const [newDigest] = await db
        .insert(schema.digests)
        .values({
          id: digestId,
          userId: userId || null,
          digestType: job.data.type || "daily_audio",
          status: "pending",
          title: `Daily Brief — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          digestDate: new Date(),
        })
        .returning();

      // Retrieve top active stories to include in the digest
      const recentStories = await db.query.stories.findMany({
        where: eq(schema.stories.status, "active"),
        limit: 5,
        with: {
          memberships: true,
        },
      });

      if (recentStories.length > 0) {
        // Create digest items
        for (let i = 0; i < recentStories.length; i++) {
          const story = recentStories[i];
          const membership = story.memberships[0];

          await db.insert(schema.digestItems).values({
            id: crypto.randomUUID(),
            digestId: newDigest.id,
            storyId: story.id,
            title: story.canonicalTitle,
            url: membership?.url || "https://firstcup.tech",
            source: story.dominantSource || "tech",
            summary: membership?.summary || "Curated technology briefing.",
            position: i + 1,
            topics: story.topics,
          });
        }
      }

      // Mark digest generated
      await db
        .update(schema.digests)
        .set({
          status: "generated",
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.digests.id, newDigest.id));

      workerLogger.info(
        { digestId: newDigest.id },
        "Digest pipeline completed. Enqueueing audio generation...",
      );

      // Enqueue Audio Generation Job
      await audioQueue.add("generate-audio", { digestId: newDigest.id, userId });

      return { digestId: newDigest.id, itemsCount: recentStories.length };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    workerLogger.info({ jobId: job.id }, "Digest pipeline job completed successfully");
  });

  worker.on("failed", (job, err) => {
    workerLogger.error({ jobId: job?.id, err: err.message }, "Digest pipeline job failed");
  });

  return worker;
}
