import { createHash } from "node:crypto";
import type { NormalizedSignal, RawSignal } from "../types";

const TOPIC_KEYWORD_MAP: Record<string, string[]> = {
  ai: [
    "ai",
    "llm",
    "claude",
    "gpt",
    "openai",
    "deepseek",
    "anthropic",
    "machine learning",
    "neural",
    "reasoning",
  ],
  typescript: ["typescript", "ts", "javascript", "ecmascript"],
  frontend: ["react", "next.js", "nextjs", "vue", "tailwind", "css", "svelte", "turbopack", "vite"],
  backend: ["hono", "express", "node", "bun", "fastapi", "golang", "go", "api", "rest", "graphql"],
  database: [
    "postgres",
    "postgresql",
    "sqlite",
    "drizzle",
    "prisma",
    "sql",
    "redis",
    "valkey",
    "pgvector",
    "database",
  ],
  systems: ["rust", "c++", "zig", "kernel", "linux", "performance", "memory"],
  devops: ["docker", "kubernetes", "k8s", "aws", "gcp", "cloudflare", "deploy", "ci/cd"],
  security: ["vulnerability", "cve", "auth", "security", "exploit", "crypto"],
};

export function cleanUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Strip analytics/tracking params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
    ];
    for (const p of trackingParams) {
      url.searchParams.delete(p);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl;
  }
}

export function computeContentHash(title: string, url: string, summary: string | null): string {
  const hash = createHash("sha256");
  hash.update(title.toLowerCase().trim());
  hash.update("|");
  hash.update(url.toLowerCase().trim());
  if (summary) {
    hash.update("|");
    hash.update(summary.toLowerCase().trim());
  }
  return hash.digest("hex");
}

export function extractTopics(
  title: string,
  summary: string | null,
  hints: string[] = [],
): string[] {
  const text = `${title} ${summary || ""} ${hints.join(" ")}`.toLowerCase();
  const matched = new Set<string>();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matched.add(topic);
        break;
      }
    }
  }

  // Also include valid hints
  for (const hint of hints) {
    const cleanHint = hint.toLowerCase().trim();
    if (TOPIC_KEYWORD_MAP[cleanHint]) {
      matched.add(cleanHint);
    }
  }

  return matched.size > 0 ? Array.from(matched) : ["tech"];
}

export function calculateFreshnessScore(publishedAt: Date, now = new Date()): number {
  const diffHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
  // Half-life of 24 hours
  return Math.exp(-0.0288 * diffHours);
}

export function calculateEngagementScore(upvotes = 0, comments = 0): number {
  const raw = upvotes * 1.5 + comments * 2.0;
  // Logarithmic scaling normalized between 0.1 and 1.0
  if (raw <= 0) return 0.1;
  return Math.min(1.0, 0.1 + (Math.log10(raw + 1) / 3.0) * 0.9);
}

export function normalizeSignals(rawSignals: RawSignal[], now = new Date()): NormalizedSignal[] {
  const seenHashes = new Set<string>();
  const normalized: NormalizedSignal[] = [];

  for (const signal of rawSignals) {
    if (!signal.title || !signal.url) continue;

    const cleanedUrl = cleanUrl(signal.url);
    const publishedAt = signal.publishedAt
      ? typeof signal.publishedAt === "string"
        ? new Date(signal.publishedAt)
        : signal.publishedAt
      : now;

    const safeDate = Number.isNaN(publishedAt.getTime()) ? now : publishedAt;
    const contentHash = computeContentHash(signal.title, cleanedUrl, signal.summary || null);

    if (seenHashes.has(contentHash)) continue;
    seenHashes.add(contentHash);

    const freshnessScore = calculateFreshnessScore(safeDate, now);
    const engagementScore = calculateEngagementScore(signal.upvotes, signal.comments);
    const topics = extractTopics(signal.title, signal.summary || null, signal.topicHints);

    normalized.push({
      id: crypto.randomUUID(),
      source: signal.source,
      sourceItemId: signal.sourceItemId,
      title: signal.title.trim(),
      url: cleanedUrl,
      summary: signal.summary?.trim() || null,
      publishedAt: safeDate,
      freshnessScore,
      engagementScore,
      topics,
      contentHash,
    });
  }

  return normalized;
}
