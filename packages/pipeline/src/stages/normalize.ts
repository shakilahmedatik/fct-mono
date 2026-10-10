import { createHash } from "node:crypto";
import { generateCompletion } from "../ai";
import type { NormalizedSignal, RawSignal } from "../types";

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

export async function extractTopics(
  title: string,
  summary: string | null,
  hints: string[] = [],
): Promise<string[]> {
  const prompt = `Classify the following tech news item into 1 to 3 distinct categories (e.g., ai, frontend, backend, database, systems, devops, security, design, mobile, networking). Return ONLY a comma-separated list of lowercase topics.
  
Title: ${title}
Summary: ${summary || ""}
Hints: ${hints.join(", ")}`;

  try {
    const response = await generateCompletion(
      prompt,
      "You are a strict technical classifier. You output nothing but comma-separated lowercase keywords.",
    );
    const topics = response
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return topics.length > 0 ? topics : ["tech"];
  } catch {
    return ["tech"];
  }
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

export async function normalizeSignals(
  rawSignals: RawSignal[],
  now = new Date(),
): Promise<NormalizedSignal[]> {
  const seenHashes = new Set<string>();
  const uniqueSignals = [];

  for (const signal of rawSignals) {
    if (!signal.title || !signal.url) continue;

    const cleanedUrl = cleanUrl(signal.url);
    const contentHash = computeContentHash(signal.title, cleanedUrl, signal.summary || null);

    if (seenHashes.has(contentHash)) continue;
    seenHashes.add(contentHash);

    uniqueSignals.push({ signal, cleanedUrl, contentHash });
  }

  const normalized: NormalizedSignal[] = [];
  const chunkSize = 15; // concurrency limit to avoid rate limits

  for (let i = 0; i < uniqueSignals.length; i += chunkSize) {
    const chunk = uniqueSignals.slice(i, i + chunkSize);

    const chunkResults = await Promise.all(
      chunk.map(async ({ signal, cleanedUrl, contentHash }) => {
        const publishedAt = signal.publishedAt
          ? typeof signal.publishedAt === "string"
            ? new Date(signal.publishedAt)
            : signal.publishedAt
          : now;

        const safeDate = Number.isNaN(publishedAt.getTime()) ? now : publishedAt;
        const freshnessScore = calculateFreshnessScore(safeDate, now);
        const engagementScore = calculateEngagementScore(signal.upvotes, signal.comments);

        const topics = await extractTopics(signal.title, signal.summary || null, signal.topicHints);

        return {
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
        };
      }),
    );

    normalized.push(...chunkResults);
  }

  return normalized;
}
