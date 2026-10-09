import type { ClusteredStory, RankedStory } from "../types";

const SOURCE_WEIGHTS: Record<string, number> = {
  hackernews: 1.15,
  github: 1.1,
  rss: 1.05,
  forem: 0.95,
  reddit: 0.9,
  producthunt: 1.0,
};

export function generateWhyItMatters(_title: string, topics: string[]): string {
  const primaryTopic = topics[0] || "tech";

  switch (primaryTopic) {
    case "ai":
      return "Directly influences engineering trade-offs in automated code synthesis, model latency, and runtime agent architecture.";
    case "typescript":
    case "frontend":
      return "Critical for frontend performance, bundle size reduction, and developer productivity across large component codebases.";
    case "backend":
      return "Directly impacts API throughput, zero-latency edge deployment, and microservice concurrency boundaries.";
    case "database":
      return "Essential for database query optimization, migration reliability, and real-time analytical workloads.";
    case "systems":
      return "Sets the baseline for memory-safe concurrency, low-level binary optimization, and resource utilization.";
    case "security":
      return "Requires immediate review in authentication workflows and dependency supply-chain security protocols.";
    default:
      return "Presents a notable architectural paradigm shift for development teams assessing modern web infrastructure.";
  }
}

export function rankAndSelectStories(
  stories: ClusteredStory[],
  limit = 7,
  options?: { preferredTopics?: string[] },
): RankedStory[] {
  const preferredSet = new Set(options?.preferredTopics?.map((t) => t.toLowerCase()) || []);

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
    const clusterBonus = totalSignals > 1 ? 0.2 * Math.log2(totalSignals + 1) : 0;

    // 3. Source weight
    const srcWeight = SOURCE_WEIGHTS[story.dominantSource] || 1.0;

    // 4. Topic preference match bonus
    let topicBonus = 0;
    if (preferredSet.size > 0) {
      const hasMatch = story.topics.some((t) => preferredSet.has(t));
      if (hasMatch) topicBonus = 0.35;
    }

    const rankScore =
      (avgEngagement * 0.4 + avgFreshness * 0.3 + clusterBonus) * srcWeight + topicBonus;

    return {
      story,
      rankScore,
    };
  });

  // Sort descending by rankScore
  scoredStories.sort((a, b) => b.rankScore - a.rankScore);

  // Apply diversity limits: max 2 per source, max 2 per primary topic
  const selected: RankedStory[] = [];
  const sourceCount = new Map<string, number>();
  const topicCount = new Map<string, number>();

  for (const item of scoredStories) {
    if (selected.length >= limit) break;

    const src = item.story.dominantSource;
    const primaryTopic = item.story.topics[0] || "general";

    const currentSrcCount = sourceCount.get(src) || 0;
    const currentTopicCount = topicCount.get(primaryTopic) || 0;

    // Allow exception if we don't have enough stories
    if (currentSrcCount >= 3 && scoredStories.length > limit) continue;
    if (currentTopicCount >= 3 && scoredStories.length > limit) continue;

    sourceCount.set(src, currentSrcCount + 1);
    topicCount.set(primaryTopic, currentTopicCount + 1);

    selected.push({
      story: item.story,
      rankScore: Number(item.rankScore.toFixed(3)),
      whyItMatters: generateWhyItMatters(item.story.canonicalTitle, item.story.topics),
      position: selected.length + 1,
    });
  }

  // If diversity filter left us short, fill up remaining
  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((s) => s.story.id));
    for (const item of scoredStories) {
      if (selected.length >= limit) break;
      if (!selectedIds.has(item.story.id)) {
        selected.push({
          story: item.story,
          rankScore: Number(item.rankScore.toFixed(3)),
          whyItMatters: generateWhyItMatters(item.story.canonicalTitle, item.story.topics),
          position: selected.length + 1,
        });
      }
    }
  }

  return selected;
}
