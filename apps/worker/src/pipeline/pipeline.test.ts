import { describe, expect, it } from "bun:test";
import {
  type ClusteredStory,
  calculateEngagementScore,
  calculateFreshnessScore,
  cleanUrl,
  cosineSimilarity,
  deserializeEmbedding,
  EMBEDDING_DIM,
  extractTopics,
  type NormalizedSignal,
  normalizeSignals,
  type RawSignal,
  serializeEmbedding,
} from "@repo/pipeline";
import {
  audioJobId,
  computeDominantSource,
  deliveryJobId,
  resolveDeliveryRoute,
  scoreStories,
  selectDiverseStories,
} from "@repo/pipeline/stages";

function makeSignal(overrides: Partial<NormalizedSignal> = {}): NormalizedSignal {
  return {
    id: "sig-1",
    source: "hackernews",
    sourceItemId: "item-1",
    title: "Signal",
    url: "https://example.com/signal",
    summary: "A signal",
    publishedAt: new Date(),
    freshnessScore: 0.9,
    engagementScore: 0.8,
    topics: ["ai"],
    contentHash: "hash-1",
    ...overrides,
  };
}

function makeStory(overrides: Partial<ClusteredStory> = {}): ClusteredStory {
  return {
    id: "story-1",
    canonicalTitle: "A story",
    dominantSource: "github",
    topics: ["systems"],
    clusterId: "cluster-1",
    embedding: new Float32Array(EMBEDDING_DIM),
    signals: [makeSignal()],
    ...overrides,
  };
}

describe("Worker Intelligence Pipeline", () => {
  describe("Normalization Stage", () => {
    it("strips analytics tracking query params from URLs", () => {
      const raw = "https://techcrunch.com/article?utm_source=twitter&utm_medium=social&ref=feed";
      const cleaned = cleanUrl(raw);
      expect(cleaned).toBe("https://techcrunch.com/article");
    });

    it("classifies a story into lowercase topics", async () => {
      // The production classifier is backed by the LLM. Without a configured
      // provider it falls back to a deterministic placeholder — either way it
      // must return lowercase, non empty topics.
      const topics = await extractTopics(
        "Anthropic releases Claude 3.7 Sonnet hybrid reasoning model",
        "Benchmark comparison against OpenAI GPT-4o.",
      );

      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics) {
        expect(topic).toBe(topic.toLowerCase());
      }
    });

    it("calculates exponential freshness decay correctly", () => {
      const now = new Date("2026-10-09T12:00:00Z");
      const zeroHoursAgo = new Date("2026-10-09T12:00:00Z");
      const twentyFourHoursAgo = new Date("2026-10-08T12:00:00Z");

      const freshScore = calculateFreshnessScore(zeroHoursAgo, now);
      const dayOldScore = calculateFreshnessScore(twentyFourHoursAgo, now);

      expect(freshScore).toBeCloseTo(1.0, 2);
      expect(dayOldScore).toBeCloseTo(0.5, 1);
      expect(dayOldScore).toBeLessThan(freshScore);
    });

    it("calculates logarithmic engagement scaling", () => {
      const low = calculateEngagementScore(0, 0);
      const medium = calculateEngagementScore(50, 20);
      const viral = calculateEngagementScore(1500, 400);

      expect(low).toBe(0.1);
      expect(medium).toBeGreaterThan(low);
      expect(viral).toBeGreaterThan(medium);
      expect(viral).toBeLessThanOrEqual(1.0);
    });

    it("deduplicates signals with identical content hashes", async () => {
      const raw: RawSignal[] = [
        {
          source: "hackernews",
          sourceItemId: "1",
          title: "Show HN: Drizzle Studio Native",
          url: "https://orm.drizzle.team",
        },
        {
          source: "reddit",
          sourceItemId: "2",
          title: "Show HN: Drizzle Studio Native",
          url: "https://orm.drizzle.team",
        },
      ];

      const normalized = await normalizeSignals(raw);
      expect(normalized.length).toBe(1);
    });
  });

  describe("Clustering & Embedding Stage", () => {
    it("uses the 384 dimensional production embedding size", () => {
      expect(EMBEDDING_DIM).toBe(384);
    });

    it("measures higher similarity between closer vectors", () => {
      const a = new Float32Array(EMBEDDING_DIM);
      const b = new Float32Array(EMBEDDING_DIM);
      const c = new Float32Array(EMBEDDING_DIM);

      a[0] = 1;
      b[0] = 0.9;
      b[1] = 0.1;
      c[1] = 1;

      expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));
      expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5);
    });

    it("round trips an embedding through its serialized form", () => {
      const embedding = new Float32Array(EMBEDDING_DIM);
      embedding[0] = 0.5;
      embedding[EMBEDDING_DIM - 1] = -0.25;

      const restored = deserializeEmbedding(serializeEmbedding(embedding));

      expect(restored.length).toBe(EMBEDDING_DIM);
      expect(restored[0]).toBeCloseTo(0.5, 5);
      expect(restored[EMBEDDING_DIM - 1]).toBeCloseTo(-0.25, 5);
    });

    it("derives the dominant source from the most frequent source", () => {
      const dominant = computeDominantSource([
        makeSignal({ source: "reddit" }),
        makeSignal({ source: "hackernews" }),
        makeSignal({ source: "hackernews" }),
      ]);

      expect(dominant).toBe("hackernews");
    });

    it("breaks a tie between equally frequent sources deterministically", () => {
      const signals = [
        makeSignal({ source: "github" }),
        makeSignal({ source: "reddit" }),
        makeSignal({ source: "github" }),
        makeSignal({ source: "reddit" }),
      ];

      expect(computeDominantSource(signals)).toBe("github");
    });
  });

  describe("Ranker & Diversity Stage", () => {
    it("scores stories with the source weight of the dominant source", () => {
      const hackernews = scoreStories([
        makeStory({ id: "s1", dominantSource: "hackernews", signals: [makeSignal()] }),
      ])[0];
      const reddit = scoreStories([
        makeStory({ id: "s2", dominantSource: "reddit", signals: [makeSignal()] }),
      ])[0];

      expect(hackernews.rankScore).toBeGreaterThan(reddit.rankScore);
    });

    it("enforces the per source cap and returns a short list instead of breaking it", () => {
      const stories = [
        makeStory({ id: "s1", dominantSource: "github", topics: ["systems"] }),
        makeStory({ id: "s2", dominantSource: "github", topics: ["systems"] }),
        makeStory({ id: "s3", dominantSource: "github", topics: ["systems"] }),
        makeStory({ id: "s4", dominantSource: "github", topics: ["systems"] }),
      ];

      const scored = scoreStories(stories);
      const selected = selectDiverseStories(scored, 4, { maxPerSource: 2, maxPerTopic: 3 });

      expect(selected.length).toBe(2);
      expect(selected.map((item) => item.story.id)).toEqual(["s1", "s2"]);
    });

    it("enforces the per topic cap", () => {
      const stories = [
        makeStory({ id: "s1", dominantSource: "github", topics: ["ai"] }),
        makeStory({ id: "s2", dominantSource: "hackernews", topics: ["ai"] }),
        makeStory({ id: "s3", dominantSource: "reddit", topics: ["ai"] }),
        makeStory({ id: "s4", dominantSource: "rss", topics: ["security"] }),
      ];

      const scored = scoreStories(stories);
      const selected = selectDiverseStories(scored, 4, { maxPerSource: 3, maxPerTopic: 2 });

      // Three of the four stories share the topic "ai" — the cap keeps two of
      // them, the story with a different topic is always kept.
      expect(selected.length).toBe(3);
      expect(selected.map((item) => item.story.id).sort()).toEqual(["s1", "s2", "s4"]);
    });
  });

  describe("Delivery Routing", () => {
    it("routes to the preferred telegram channel", () => {
      const route = resolveDeliveryRoute({
        preferredChannel: "telegram",
        channelEnabled: true,
        hasTelegramChatId: true,
        hasEmail: true,
      });

      expect(route?.channel).toBe("telegram");
    });

    it("routes to the preferred email channel", () => {
      const route = resolveDeliveryRoute({
        preferredChannel: "email",
        channelEnabled: true,
        hasTelegramChatId: true,
        hasEmail: true,
      });

      expect(route?.channel).toBe("email");
    });

    it("falls back to email for whatsapp because no adapter exists", () => {
      const route = resolveDeliveryRoute({
        preferredChannel: "whatsapp",
        channelEnabled: true,
        hasTelegramChatId: true,
        hasEmail: true,
      });

      expect(route?.channel).toBe("email");
      expect(route?.reason).toBe("whatsapp-not-supported");
    });

    it("does not deliver anything when the channel is disabled", () => {
      const route = resolveDeliveryRoute({
        preferredChannel: "telegram",
        channelEnabled: false,
        hasTelegramChatId: true,
        hasEmail: true,
      });

      expect(route).toBeNull();
    });

    it("falls back to email when the telegram chat id is missing", () => {
      const route = resolveDeliveryRoute({
        preferredChannel: "telegram",
        channelEnabled: true,
        hasTelegramChatId: false,
        hasEmail: true,
      });

      expect(route?.channel).toBe("email");
    });

    it("builds deterministic job ids", () => {
      expect(deliveryJobId("telegram", "digest-1", "user-1")).toBe("send-telegram:digest-1:user-1");
      expect(deliveryJobId("email", "digest-1", "user-1")).toBe("send-email:digest-1:user-1");
      expect(audioJobId("digest-1", "user-1")).toBe("generate-audio:digest-1:user-1");
      expect(audioJobId("digest-1")).toBe("generate-audio:digest-1:master");
    });
  });
});
