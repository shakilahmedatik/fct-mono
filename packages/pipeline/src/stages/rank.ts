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

/** A story together with its computed rank score. */
export interface ScoredStory {
  story: ClusteredStory;
  rankScore: number;
}

export interface DiversityOptions {
  maxPerSource: number;
  maxPerTopic: number;
  preferredTopics?: string[];
}

/**
 * The topic a story is bucketed under for the diversity guardrail.
 *
 * `story.topics` is the union of the topics of every signal in the cluster and
 * its first element is simply whichever topic the first signal happened to
 * carry. When the reader has stated topic preferences the matching topic is
 * the meaningful one (that is the topic the bonus was awarded for), otherwise
 * the first topic is used as before.
 */
export function primaryTopicFor(story: ClusteredStory, preferredTopics?: Set<string>): string {
  if (preferredTopics && preferredTopics.size > 0) {
    const match = story.topics.find((topic) => preferredTopics.has(topic.toLowerCase()));
    if (match) return match.toLowerCase();
  }
  return story.topics[0]?.toLowerCase() || "general";
}

/**
 * Score every story. Pure: no I/O, no side effects.
 */
export function scoreStories(stories: ClusteredStory[], options?: RankingOptions): ScoredStory[] {
  const preferredSet = new Set(options?.preferredTopics?.map((t) => t.toLowerCase()) || []);
  const weights = options?.sourceWeights || SOURCE_WEIGHTS;
  const engagementW = options?.engagementWeight ?? 0.4;
  const freshnessW = options?.freshnessWeight ?? 0.3;
  const clusterBonusMult = options?.clusterBonusMultiplier ?? 0.2;
  const topicBonusVal = options?.topicBonus ?? 0.35;

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
      const hasMatch = story.topics.some((t) => preferredSet.has(t.toLowerCase()));
      if (hasMatch) topicBonus = topicBonusVal;
    }

    const rankScore =
      (avgEngagement * engagementW + avgFreshness * freshnessW + clusterBonus) * srcWeight +
      topicBonus;

    return { story, rankScore };
  });

  // Sort descending by rankScore
  scoredStories.sort((a, b) => b.rankScore - a.rankScore);

  return scoredStories;
}

/**
 * Select up to `limit` stories while respecting the diversity guardrails.
 *
 * The caps are ALWAYS enforced. The previous implementation only applied them
 * when there were more stories than slots and then ran a second, uncapped
 * "fill up" loop that re-added every excluded story — which made the
 * guardrails a no-op and turned the selection into plain top-N-by-score.
 *
 * A result that is shorter than `limit` is therefore the correct outcome: the
 * guardrails are preferred over filling the digest with redundant stories.
 */
export function selectDiverseStories(
  scored: ScoredStory[],
  limit: number,
  options: DiversityOptions,
): ScoredStory[] {
  const maxPerSource = Math.max(1, options.maxPerSource);
  const maxPerTopic = Math.max(1, options.maxPerTopic);
  const preferredSet = new Set((options.preferredTopics ?? []).map((t) => t.toLowerCase()));

  const sourceCount = new Map<string, number>();
  const topicCount = new Map<string, number>();
  const selected: ScoredStory[] = [];

  for (const item of scored) {
    if (selected.length >= limit) break;

    const source = item.story.dominantSource;
    const topic = primaryTopicFor(item.story, preferredSet);

    if ((sourceCount.get(source) ?? 0) >= maxPerSource) continue;
    if ((topicCount.get(topic) ?? 0) >= maxPerTopic) continue;

    sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1);
    topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1);

    selected.push(item);
  }

  return selected;
}

export async function rankAndSelectStories(
  stories: ClusteredStory[],
  limit = 7,
  options?: RankingOptions,
): Promise<RankedStory[]> {
  const maxPerSource = options?.maxPerSource ?? 3;
  const maxPerTopic = options?.maxPerTopic ?? 3;

  const scoredStories = scoreStories(stories, options);
  const selectedItems = selectDiverseStories(scoredStories, limit, {
    maxPerSource,
    maxPerTopic,
    preferredTopics: options?.preferredTopics,
  });

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
