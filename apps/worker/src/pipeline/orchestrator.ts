import { db, schema } from "@repo/db";
import {
  clusterAndPersistStories,
  generateAndPersistBlogPost,
  generateDailyAudioScript,
  ingestFromSources,
  normalizeSignals,
  type PipelineOptions,
  type PipelineReport,
  processUserCohorts,
  rankAndSelectStories,
} from "@repo/pipeline";
import { enqueueAudioJob } from "@repo/pipeline/stages";
import { and, eq, gte, lt } from "drizzle-orm";
import { workerLogger } from "../lib/logger";

/** Digests are unique per user and per day; the master digest per day. */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function runAutonomousPipeline(options?: PipelineOptions): Promise<PipelineReport> {
  const startedAt = Date.now();
  const errors: string[] = [];
  const now = options?.targetDate || new Date();

  workerLogger.info(
    { trigger: options?.triggerSource || "manual", now: now.toISOString() },
    "🚀 Commencing 4-Tier Autonomous Intelligence Pipeline...",
  );

  // -------------------------------------------------------------------------
  // Tier 1: Multi-Source Crawling & Signal Ingestion
  // -------------------------------------------------------------------------
  const ingestion = await ingestFromSources();
  const rawSignals = ingestion.signals;
  // A source that fell back to curated seed content is not real news — the
  // digests built from it are marked as degraded.
  const degraded = ingestion.sourceResults.some((result) => result.degraded);

  workerLogger.info({ count: rawSignals.length, degraded }, "Tier 1 complete: signals ingested.");

  if (rawSignals.length === 0) {
    errors.push("No signals ingested from any source adapter.");
    return {
      success: false,
      itemsIngested: 0,
      clustersFormed: 0,
      storiesPersisted: 0,
      digestItemsCreated: 0,
      cohortsProcessed: 0,
      audioJobsEnqueued: 0,
      deliveryJobsEnqueued: 0,
      degraded,
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Tier 2: Normalization & Vector Clustering & Story Entity Linking
  // -------------------------------------------------------------------------
  const normalizedSignals = await normalizeSignals(rawSignals, now);
  workerLogger.info({ count: normalizedSignals.length }, "Signals normalized and scored.");

  const clusteredStories = await clusterAndPersistStories(normalizedSignals);
  workerLogger.info(
    { clustersCount: clusteredStories.length },
    "Tier 2 complete: clustered into canonical stories.",
  );

  if (clusteredStories.length === 0) {
    errors.push("Failed to form any story clusters from normalized signals.");
    return {
      success: false,
      itemsIngested: rawSignals.length,
      clustersFormed: 0,
      storiesPersisted: 0,
      digestItemsCreated: 0,
      cohortsProcessed: 0,
      audioJobsEnqueued: 0,
      deliveryJobsEnqueued: 0,
      degraded,
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Tier 3: Ranking, Synthesis & Master Digest Generation
  // -------------------------------------------------------------------------
  const masterLimit = options?.limit || 6;
  const masterStories = await rankAndSelectStories(clusteredStories, masterLimit);
  const formattedDateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Idempotency: there is exactly one master digest per day. A retry of this
  // job must not create a second one.
  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existingMasterDigest = await db.query.digests.findFirst({
    where: and(
      eq(schema.digests.isMaster, true),
      gte(schema.digests.digestDate, dayStart),
      lt(schema.digests.digestDate, dayEnd),
    ),
    with: { items: true, audioBrief: true },
  });

  const masterDigestId = existingMasterDigest?.id ?? crypto.randomUUID();
  let digestItemsCreated = existingMasterDigest?.items.length ?? 0;

  if (!existingMasterDigest) {
    // 3a. The (fallible) script generation happens BEFORE the database writes,
    //     so a failing LLM call cannot leave an orphaned digest behind.
    const { script: masterAudioScript, durationSec: masterAudioDuration } =
      await generateDailyAudioScript(masterStories, now);

    // 3b. Digest, items and audio brief in a single transaction.
    await db.transaction(async (tx) => {
      await tx.insert(schema.digests).values({
        id: masterDigestId,
        userId: null,
        digestType: "daily_audio",
        status: "generated",
        title: `Master Tech Briefing — ${formattedDateStr}`,
        digestDate: now,
        generatedAt: new Date(),
        isMaster: true,
        degraded,
      });

      if (masterStories.length > 0) {
        await tx.insert(schema.digestItems).values(
          masterStories.map((item) => {
            const topSig = item.story.signals[0];
            return {
              id: crypto.randomUUID(),
              digestId: masterDigestId,
              storyId: item.story.id,
              title: item.story.canonicalTitle,
              url: topSig?.url || "https://firstcup.tech",
              source: item.story.dominantSource,
              summary: topSig?.summary || "Curated technology briefing.",
              whyItMatters: item.whyItMatters,
              rankScore: item.rankScore,
              position: item.position,
              topics: item.story.topics,
              publishedAt: topSig?.publishedAt || now,
            };
          }),
        );
        digestItemsCreated = masterStories.length;
      }

      await tx.insert(schema.audioBriefs).values({
        id: crypto.randomUUID(),
        digestId: masterDigestId,
        // The brief becomes "ready" when the audio job stored the audio.
        status: "pending",
        script: masterAudioScript,
        audioUrl: null,
        durationSec: masterAudioDuration,
        provider: "elevenlabs",
        deliveryChannel: null,
        deliveryStatus: "pending",
      });
    });
  } else {
    workerLogger.info(
      { masterDigestId, digestDate: dayStart.toISOString() },
      "Master digest for this date already exists — reusing it",
    );
  }

  // 3c. Enqueue the audio job for the master digest. The job id is
  //     deterministic, so a retry does not enqueue the job twice.
  let audioJobsEnqueued = 0;
  if (await enqueueAudioJob({ digestId: masterDigestId })) {
    audioJobsEnqueued += 1;
  }

  // 3d. Generate and Persist Daily Public Blog Post
  let blogPostSlug: string | undefined;
  try {
    blogPostSlug = await generateAndPersistBlogPost(masterStories, now);
  } catch (err: unknown) {
    const msg = `Blog generation error: ${err instanceof Error ? err.message : String(err)}`;
    workerLogger.error(msg);
    errors.push(msg);
  }

  // -------------------------------------------------------------------------
  // Tier 4: User Cohorts & Personalized Pro Delivery
  // -------------------------------------------------------------------------
  let cohortsProcessed = 0;
  let deliveryJobsEnqueued = 0;

  try {
    const cohortResult = await processUserCohorts(clusteredStories, now, { degraded });
    cohortsProcessed = cohortResult.digestsCreated + cohortResult.digestsReused;
    audioJobsEnqueued += cohortResult.audioJobsEnqueued;
    deliveryJobsEnqueued += cohortResult.deliveryJobsEnqueued;

    workerLogger.info(
      {
        eligibleUsers: cohortResult.usersEligible,
        digestsCreated: cohortResult.digestsCreated,
        digestsReused: cohortResult.digestsReused,
        audioJobsEnqueued: cohortResult.audioJobsEnqueued,
        deliveryJobsEnqueued: cohortResult.deliveryJobsEnqueued,
        deliveriesSkipped: cohortResult.deliveriesSkipped,
      },
      "Tier 4 complete: personalised digests handed over to the delivery chain.",
    );
  } catch (err: unknown) {
    const msg = `Cohort processing error: ${err instanceof Error ? err.message : String(err)}`;
    workerLogger.error(msg);
    errors.push(msg);
  }

  const durationMs = Date.now() - startedAt;

  workerLogger.info(
    {
      masterDigestId,
      blogPostSlug,
      itemsIngested: rawSignals.length,
      clusters: clusteredStories.length,
      cohorts: cohortsProcessed,
      audioJobsEnqueued,
      deliveryJobsEnqueued,
      degraded,
      durationMs,
    },
    "🎉 Autonomous Intelligence Pipeline completed successfully!",
  );

  return {
    success: true,
    masterDigestId,
    blogPostSlug,
    itemsIngested: rawSignals.length,
    clustersFormed: clusteredStories.length,
    storiesPersisted: clusteredStories.length,
    digestItemsCreated,
    cohortsProcessed,
    audioJobsEnqueued,
    deliveryJobsEnqueued,
    degraded,
    errors,
    durationMs,
  };
}
