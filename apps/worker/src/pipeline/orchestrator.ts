import { db, schema } from "@repo/db";
import { workerLogger } from "../lib/logger";
import { audioQueue } from "../lib/queues";
import { ingestAllSources } from "./sources";
import { clusterAndPersistStories } from "./stages/cluster";
import { processUserCohorts } from "./stages/cohorts";
import { normalizeSignals } from "./stages/normalize";
import { rankAndSelectStories } from "./stages/rank";
import { generateAndPersistBlogPost, generateDailyAudioScript } from "./stages/synthesize";
import type { PipelineOptions, PipelineReport } from "./types";

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
  const rawSignals = await ingestAllSources();
  workerLogger.info({ count: rawSignals.length }, "Tier 1 complete: signals ingested.");

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
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Tier 2: Normalization & Vector Clustering & Story Entity Linking
  // -------------------------------------------------------------------------
  const normalizedSignals = normalizeSignals(rawSignals, now);
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
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Tier 3: Ranking, Synthesis & Master Digest Generation
  // -------------------------------------------------------------------------
  const masterLimit = options?.limit || 6;
  const masterStories = rankAndSelectStories(clusteredStories, masterLimit);

  const masterDigestId = crypto.randomUUID();
  const formattedDateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // 3a. Insert Master Digest
  await db.insert(schema.digests).values({
    id: masterDigestId,
    userId: null,
    digestType: "daily_audio",
    status: "generated",
    title: `Master Tech Briefing — ${formattedDateStr}`,
    digestDate: now,
    generatedAt: new Date(),
    isMaster: true,
  });

  // 3b. Insert Master Digest Items
  for (const item of masterStories) {
    const topSig = item.story.signals[0];
    await db.insert(schema.digestItems).values({
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
    });
  }

  // 3c. Generate Audio Brief Script for Master Digest
  const { script: masterAudioScript, durationSec: masterAudioDuration } = generateDailyAudioScript(
    masterStories,
    now,
  );
  const masterAudioId = crypto.randomUUID();
  await db.insert(schema.audioBriefs).values({
    id: masterAudioId,
    digestId: masterDigestId,
    status: "ready",
    script: masterAudioScript,
    audioUrl: `https://storage.firstcup.tech/audio/${masterDigestId}.mp3`,
    durationSec: masterAudioDuration,
    provider: "elevenlabs",
    deliveryChannel: "telegram",
    deliveryStatus: "pending",
  });

  // 3d. Enqueue Audio Job
  await audioQueue.add("generate-audio", { digestId: masterDigestId });

  // 3e. Generate and Persist Daily Public Blog Post
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
  try {
    cohortsProcessed = await processUserCohorts(clusteredStories, now);
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
    digestItemsCreated: masterStories.length,
    cohortsProcessed,
    audioJobsEnqueued: 1 + cohortsProcessed,
    errors,
    durationMs,
  };
}
