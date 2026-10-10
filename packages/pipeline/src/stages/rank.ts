import { generateCompletion } from "../ai";
import type { ClusteredStory, RankedStory } from "../types";

export const SOURCE_WEIGHTS: Record<string, number> = {
  hackernews: 1.15,
  github: 1.1,
  rss: 1.05,
  forem: 0.95,
  reddit: 0.9,
  producthunt: 1.0,
};

export async function generateWhyItMatters(
  title: string,
  summary: string,
  topics: string[],
): Promise<string> {
  const prompt = `Given the following tech news story, write a concise 1-2 sentence explanation of why this matters for software engineers and tech startups.

Title: ${title}
Summary: ${summary}
Topics: ${topics.join(", ")}

Focus on architectural impact, productivity, security, or business value. Do not use generic filler words.`;

  const explanation = await generateCompletion(
    prompt,
    "You are a senior principal engineer explaining the impact of technical news.",
  );

  return explanation;
}

export interface RankingOptions {
  preferredTopics?: string[];
  sourceWeights?: Record<string, number>;
  engagementWeight?: number;
  freshnessWeight?: number;
  clusterBonusMultiplier?: number;
  topicBonus?: number;
  maxPerSource?: number;
  maxPerTopic?: number;
}

export async function rankAndSelectStories(
  stories: ClusteredStory[],
  limit = 7,
  options?: RankingOptions,
): Promise<RankedStory[]> {
  const preferredSet = new Set(options?.preferredTopics?.map((t) => t.toLowerCase()) || []);
  const weights = options?.sourceWeights || SOURCE_WEIGHTS;
  const engagementW = options?.engagementWeight ?? 0.4;
  const freshnessW = options?.freshnessWeight ?? 0.3;
  const clusterBonusMult = options?.clusterBonusMultiplier ?? 0.2;
  const topicBonusVal = options?.topicBonus ?? 0.35;
  const maxPerSource = options?.maxPerSource ?? 3;
  const maxPerTopic = options?.maxPerTopic ?? 3;

  const scoredStories = stories.map((story) => {
    // 1. Average signal engagement & freshness
    const totalSignals = story.signals.length;
    let avgEngagement = 0;
    let avgFreshness = 0;

    for (const sig of story.signals) {
      avgEngagement += sig.engagementScore;
      avgFreshness += sig.freshnessScore;
    }
    avgEngagement /= Math.max(1, totalSignals);
    avgFreshness /= Math.max(1, totalSignals);

    // 2. Multi-source cluster bonus
    const clusterBonus = totalSignals > 1 ? clusterBonusMult * Math.log2(totalSignals + 1) : 0;

    // 3. Source weight
    const srcWeight = weights[story.dominantSource] || 1.0;

    // 4. Topic preference match bonus
    let topicBonus = 0;
    if (preferredSet.size > 0) {
      const hasMatch = story.topics.some((t) => preferredSet.has(t));
      if (hasMatch) topicBonus = topicBonusVal;
    }

    const rankScore =
      (avgEngagement * engagementW + avgFreshness * freshnessW + clusterBonus) * srcWeight +
      topicBonus;

    return {
      story,
      rankScore,
    };
  });

  // Sort descending by rankScore
  scoredStories.sort((a, b) => b.rankScore - a.rankScore);

  // Apply diversity limits
  const selectedItems = [];
  const sourceCount = new Map<string, number>();
  const topicCount = new Map<string, number>();

  for (const item of scoredStories) {
    if (selectedItems.length >= limit) break;

    const src = item.story.dominantSource;
    const primaryTopic = item.story.topics[0] || "general";

    const currentSrcCount = sourceCount.get(src) || 0;
    const currentTopicCount = topicCount.get(primaryTopic) || 0;

    // Allow exception if we don't have enough stories
    if (currentSrcCount >= maxPerSource && scoredStories.length > limit) continue;
    if (currentTopicCount >= maxPerTopic && scoredStories.length > limit) continue;

    sourceCount.set(src, currentSrcCount + 1);
    topicCount.set(primaryTopic, currentTopicCount + 1);

    selectedItems.push(item);
  }

  // If diversity filter left us short, fill up remaining
  if (selectedItems.length < limit) {
    const selectedIds = new Set(selectedItems.map((s) => s.story.id));
    for (const item of scoredStories) {
      if (selectedItems.length >= limit) break;
      if (!selectedIds.has(item.story.id)) {
        selectedItems.push(item);
      }
    }
  }

  // Now concurrently generate AI "Why it matters" judgements for selected stories only
  const aiTasks = selectedItems.map(async (item, idx) => {
    const whyItMatters = await generateWhyItMatters(
      item.story.canonicalTitle,
      item.story.signals[0]?.summary || "",
      item.story.topics,
    );

    return {
      story: item.story,
      rankScore: Number(item.rankScore.toFixed(3)),
      whyItMatters,
      position: idx + 1,
    };
  });

  const resolved = await Promise.all(aiTasks);

  // Sort them by position again to guarantee order after Promise.all
  resolved.sort((a, b) => a.position - b.position);

  return resolved;
}
