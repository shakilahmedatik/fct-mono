import { db, schema } from "@repo/db";
import { and, eq, gte, lt } from "drizzle-orm";
import type { ClusteredStory } from "../types";
import { enqueueAudioJob, enqueueDeliveryJob, resolveDeliveryRoute } from "./delivery";
import { logger } from "./logger";
import { rankAndSelectStories } from "./rank";
import { generateDailyAudioScript } from "./synthesize";

export interface CohortProcessingResult {
  /** Users that passed the entitlement check. */
  usersEligible: number;
  /** Personal digests created during this run. */
  digestsCreated: number;
  /** Personal digests that already existed for this date and were reused. */
  digestsReused: number;
  /** Audio generation jobs that were really added to the queue. */
  audioJobsEnqueued: number;
  /** Delivery jobs that were really added to the queue. */
  deliveryJobsEnqueued: number;
  /** Users for whom no delivery channel could be resolved. */
  deliveriesSkipped: number;
}

/** Start of the UTC day of `date` — digests are unique per user and per day. */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface CohortProcessingOptions {
  /**
   * Marks the digests as degraded — for example when the source ingestion had
   * to fall back to curated seed data instead of real news.
   */
  degraded?: boolean;
}

/**
 * Create the personalised digests of every entitled user and hand them over to
 * the delivery chain.
 *
 * Ordering matters: the (fallible) audio script generation happens *before*
 * any database write, and the digest + items + audio brief are written in a
 * single transaction. A failed generation therefore leaves no half written
 * digest behind, and a BullMQ retry does not create a second digest for the
 * same day.
 */
export async function processUserCohorts(
  allStories: ClusteredStory[],
  targetDate = new Date(),
  options?: CohortProcessingOptions,
): Promise<CohortProcessingResult> {
  const result: CohortProcessingResult = {
    usersEligible: 0,
    digestsCreated: 0,
    digestsReused: 0,
    audioJobsEnqueued: 0,
    deliveryJobsEnqueued: 0,
    deliveriesSkipped: 0,
  };

  // Fetch active users with preferences
  const activeUsers = await db.query.users.findMany({
    with: {
      preference: true,
    },
  });

  if (activeUsers.length === 0) {
    logger.info("No users found for personalized cohort processing.");
    return result;
  }

  // Filter eligible Pro / Trial users.
  // `plan` carries the entitlement and `subscriptionStatus` says whether that
  // entitlement is live. Both have to hold: a free account that is nominally
  // "trialing" must not be served.
  const proUsers = activeUsers.filter(
    (u) =>
      u.plan === "PRO" &&
      (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing"),
  );

  result.usersEligible = proUsers.length;

  logger.info(
    { totalUsers: activeUsers.length, eligibleUsers: proUsers.length },
    "Processing cohorts for entitled subscribers...",
  );

  const dayStart = startOfUtcDay(targetDate);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  for (const user of proUsers) {
    const preferredTopics = user.preference?.topics || ["ai", "systems", "typescript"];
    const rankedCohortStories = await rankAndSelectStories(allStories, 5, { preferredTopics });

    if (rankedCohortStories.length === 0) continue;

    // -------------------------------------------------------------------------
    // Idempotency: one personal digest per user and per day.
    // -------------------------------------------------------------------------
    const existingDigest = await db.query.digests.findFirst({
      where: and(
        eq(schema.digests.userId, user.id),
        gte(schema.digests.digestDate, dayStart),
        lt(schema.digests.digestDate, dayEnd),
      ),
      with: { audioBrief: true },
    });

    let digestId: string;
    let script: string | null = null;
    let durationSec: number | null = null;

    if (existingDigest) {
      digestId = existingDigest.id;
      result.digestsReused++;

      if (!existingDigest.audioBrief) {
        // A digest without an audio brief would never become deliverable —
        // finish the interrupted write.
        const generated = await generateDailyAudioScript(rankedCohortStories, targetDate);
        script = generated.script;
        durationSec = generated.durationSec;
      }
    } else {
      digestId = crypto.randomUUID();
    }

    const route = resolveDeliveryRoute({
      preferredChannel: user.preferredDeliveryChannel,
      channelEnabled: user.preference?.channelEnabled !== false,
      hasTelegramChatId: Boolean(user.telegramChatId),
      hasEmail: Boolean(user.email),
    });

    if (!existingDigest) {
      // -------------------------------------------------------------------------
      // The fallible generation happens before the database writes.
      // -------------------------------------------------------------------------
      const generated = await generateDailyAudioScript(rankedCohortStories, targetDate);
      script = generated.script;
      durationSec = generated.durationSec;

      const cohortKey = preferredTopics.slice().sort().join(",");

      // -------------------------------------------------------------------------
      // One transaction for the digest, its items and the audio brief.
      // -------------------------------------------------------------------------
      await db.transaction(async (tx) => {
        await tx.insert(schema.digests).values({
          id: digestId,
          userId: user.id,
          digestType: "daily_audio",
          status: "generated",
          title: `Daily Audio Briefing — ${targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          digestDate: targetDate,
          generatedAt: new Date(),
          cohortKey,
          isMaster: false,
          degraded: options?.degraded ?? false,
        });

        await tx.insert(schema.digestItems).values(
          rankedCohortStories.map((item) => {
            const topSig = item.story.signals[0];
            return {
              id: crypto.randomUUID(),
              digestId,
              storyId: item.story.id,
              title: item.story.canonicalTitle,
              url: topSig?.url || "https://firstcup.tech",
              source: item.story.dominantSource,
              summary: topSig?.summary || "Curated briefing signal.",
              whyItMatters: item.whyItMatters,
              rankScore: item.rankScore,
              position: item.position,
              topics: item.story.topics,
              publishedAt: topSig?.publishedAt || targetDate,
            };
          }),
        );

        await tx.insert(schema.audioBriefs).values({
          id: crypto.randomUUID(),
          digestId,
          // The brief becomes "ready" when the audio job stored the audio.
          status: "pending",
          script,
          audioUrl: null,
          durationSec,
          provider: "elevenlabs",
          deliveryChannel: route?.channel ?? null,
          deliveryStatus: "pending",
        });
      });

      result.digestsCreated++;
    } else if (script !== null && durationSec !== null) {
      await db.insert(schema.audioBriefs).values({
        id: crypto.randomUUID(),
        digestId,
        status: "pending",
        script,
        audioUrl: null,
        durationSec,
        provider: "elevenlabs",
        deliveryChannel: route?.channel ?? null,
        deliveryStatus: "pending",
      });
    }

    // -------------------------------------------------------------------------
    // Delivery chain: the audio job carries the user id, the delivery job is
    // enqueued for the channel the user actually uses.
    // -------------------------------------------------------------------------
    const audioEnabled = user.preference?.audioEnabled !== false;

    if (audioEnabled) {
      if (await enqueueAudioJob({ digestId, userId: user.id })) {
        result.audioJobsEnqueued++;
      }
    } else {
      logger.info({ userId: user.id, digestId }, "Audio disabled for user — skipping audio job");
    }

    if (!route) {
      result.deliveriesSkipped++;
      logger.warn(
        { userId: user.id, digestId },
        "No delivery channel could be resolved for this user — nothing enqueued",
      );
      continue;
    }

    if (await enqueueDeliveryJob({ digestId, userId: user.id, channel: route.channel })) {
      result.deliveryJobsEnqueued++;
    }

    logger.info(
      {
        userId: user.id,
        digestId,
        channel: route.channel,
        reason: route.reason,
        reused: Boolean(existingDigest),
      },
      "Personal digest handed over to the delivery chain",
    );
  }

  return result;
}
