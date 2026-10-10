import { db, schema } from "@repo/db";
import type { ClusteredStory } from "../types";
import { rankAndSelectStories } from "./rank";
import { generateDailyAudioScript } from "./synthesize";

export async function processUserCohorts(
  allStories: ClusteredStory[],
  targetDate = new Date(),
): Promise<number> {
  // Fetch active users with preferences
  const activeUsers = await db.query.users.findMany({
    with: {
      preference: true,
    },
  });

  if (activeUsers.length === 0) {
    return 0;
  }

  // Filter eligible Pro / Trial users
  const proUsers = activeUsers.filter(
    (u) =>
      u.plan === "PRO" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing",
  );

  let cohortDigestsCreated = 0;

  for (const user of proUsers) {
    const preferredTopics = user.preference?.topics || ["ai", "systems", "typescript"];
    const rankedCohortStories = await rankAndSelectStories(allStories, 5, { preferredTopics });

    if (rankedCohortStories.length === 0) continue;

    const digestId = crypto.randomUUID();
    const cohortKey = preferredTopics.slice().sort().join(",");

    // Insert personalized digest
    await db.insert(schema.digests).values({
      id: digestId,
      userId: user.id,
      digestType: "daily_audio",
      status: "generated",
      title: `Daily Audio Briefing — ${targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      digestDate: targetDate,
      generatedAt: new Date(),
      cohortKey,
      isMaster: false,
    });

    // Insert personalized digest items
    for (const item of rankedCohortStories) {
      const topSig = item.story.signals[0];
      await db.insert(schema.digestItems).values({
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
      });
    }

    // Generate Audio Brief
    const { script, durationSec } = await generateDailyAudioScript(rankedCohortStories, targetDate);
    const audioBriefId = crypto.randomUUID();

    await db.insert(schema.audioBriefs).values({
      id: audioBriefId,
      digestId,
      status: "ready",
      script,
      audioUrl: `https://storage.firstcup.tech/audio/${digestId}.mp3`,
      durationSec,
      provider: "elevenlabs",
      deliveryChannel: user.preferredDeliveryChannel || "telegram",
      deliveryStatus: "pending",
    });

    cohortDigestsCreated++;
  }

  return cohortDigestsCreated;
}
