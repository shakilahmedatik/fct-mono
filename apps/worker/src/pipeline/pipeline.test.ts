import { describe, expect, it } from "bun:test";
import { cosineSimilarity, generateDeterministicEmbedding } from "./stages/cluster";
import {
  calculateEngagementScore,
  calculateFreshnessScore,
  cleanUrl,
  extractTopics,
  normalizeSignals,
} from "./stages/normalize";
import { rankAndSelectStories } from "./stages/rank";
import type { ClusteredStory, RawSignal } from "./types";

describe("Worker Intelligence Pipeline", () => {
  describe("Normalization Stage", () => {
    it("strips analytics tracking query params from URLs", () => {
      const raw = "https://techcrunch.com/article?utm_source=twitter&utm_medium=social&ref=feed";
      const cleaned = cleanUrl(raw);
      expect(cleaned).toBe("https://techcrunch.com/article");
    });

    it("extracts relevant technical topics from titles and summaries", () => {
      const topics = extractTopics(
        "Anthropic releases Claude 3.7 Sonnet hybrid reasoning model",
        "Benchmark comparison against OpenAI GPT-4o.",
      );
      expect(topics).toContain("ai");
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

    it("deduplicates signals with identical content hashes", () => {
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

      const normalized = normalizeSignals(raw);
      expect(normalized.length).toBe(1);
    });
  });

  describe("Clustering & Embedding Stage", () => {
    it("generates normalized 256-dimensional unit embeddings", () => {
      const emb = generateDeterministicEmbedding("Bun 1.3 Turborepo Workspaces");
      expect(emb.length).toBe(256);

      let magnitude = 0;
      for (let i = 0; i < emb.length; i++) {
        magnitude += emb[i] * emb[i];
      }
      expect(Math.sqrt(magnitude)).toBeCloseTo(1.0, 3);
    });

    it("measures higher similarity between related technical topics", () => {
      const vecAI1 = generateDeterministicEmbedding(
        "Anthropic Claude 3.7 reasoning models for coding",
      );
      const vecAI2 = generateDeterministicEmbedding(
        "Claude Sonnet AI benchmark analysis against GPT",
      );
      const vecCooking = generateDeterministicEmbedding(
        "Traditional homemade pasta recipe with eggs and flour",
      );

      const simRelated = cosineSimilarity(vecAI1, vecAI2);
      const simUnrelated = cosineSimilarity(vecAI1, vecCooking);

      expect(simRelated).toBeGreaterThan(simUnrelated);
      expect(simRelated).toBeGreaterThan(0.1);
    });
  });

  describe("Ranker & Diversity Stage", () => {
    it("ranks stories and enforces diversity guardrails", () => {
      const dummyStories: ClusteredStory[] = [
        {
          id: "s1",
          canonicalTitle: "Bun v1.3 release",
          dominantSource: "github",
          topics: ["systems", "typescript"],
          clusterId: "c1",
          embedding: new Float32Array(256),
          signals: [
            {
              id: "sig1",
              source: "github",
              sourceItemId: "item-1",
              url: "https://github.com/bun",
              title: "Bun v1.3",
              summary: "Bun 1.3 release notes",
              publishedAt: new Date(),
              freshnessScore: 0.9,
              engagementScore: 0.9,
              topics: ["systems"],
              contentHash: "h1",
            },
          ],
        },
        {
          id: "s2",
          canonicalTitle: "Postgres 18 query planner",
          dominantSource: "hackernews",
          topics: ["database"],
          clusterId: "c2",
          embedding: new Float32Array(256),
          signals: [
            {
              id: "sig2",
              source: "hackernews",
              sourceItemId: "item-2",
              url: "https://postgres.org",
              title: "Postgres 18",
              summary: "Planner optimizations",
              publishedAt: new Date(),
              freshnessScore: 0.95,
              engagementScore: 0.8,
              topics: ["database"],
              contentHash: "h2",
            },
          ],
        },
      ];

      const selected = rankAndSelectStories(dummyStories, 2);
      expect(selected.length).toBe(2);
      expect(selected[0].position).toBe(1);
      expect(selected[1].position).toBe(2);
      expect(selected[0].whyItMatters.length).toBeGreaterThan(10);
    });
  });
});
