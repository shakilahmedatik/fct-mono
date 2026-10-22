import { logger } from "../stages/logger";
import type { RawSignal } from "../types";

interface GitHubSearchItem {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  topics?: string[];
}

export async function fetchGitHubSignals(
  topics = ["ai", "typescript", "rust"],
  perTopic = 5,
  minStars = 50,
): Promise<RawSignal[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "FirstCupTechWorker/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    logger.warn(
      { topics: topics.length, perTopic },
      "GITHUB_TOKEN is not configured — the unauthenticated GitHub search API allows only ~10 requests per minute",
    );
  }

  const signals: RawSignal[] = [];
  const failures: string[] = [];

  for (const topic of topics) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}+stars:>${minStars}&sort=updated&order=desc&per_page=${perTopic}`;
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        // A rate limited (403/429) response affects the whole run, so it is
        // surfaced as a source error instead of being dropped silently.
        if (res.status === 403 || res.status === 429) {
          throw new Error(
            `GitHub search API rate limit reached (HTTP ${res.status}) for topic "${topic}". Configure GITHUB_TOKEN to raise the limit.`,
          );
        }
        failures.push(`topic "${topic}": HTTP ${res.status}`);
        logger.warn({ topic, status: res.status }, "GitHub search request failed");
        continue;
      }

      const data = (await res.json()) as { items?: GitHubSearchItem[] };
      if (!data.items) {
        failures.push(`topic "${topic}": malformed response`);
        continue;
      }

      for (const item of data.items) {
        if (!item.full_name || !item.html_url) continue;
        signals.push({
          source: "github",
          sourceItemId: String(item.id),
          title: item.full_name,
          url: item.html_url,
          summary: item.description || "Active open-source repository on GitHub.",
          publishedAt: new Date(item.updated_at),
          upvotes: item.stargazers_count || 0,
          comments: 0,
          topicHints: [topic, ...(item.topics || []), item.language?.toLowerCase() || ""].filter(
            Boolean,
          ),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.message.includes("rate limit")) {
        // Surface the rate limit as a source error.
        throw err;
      }
      failures.push(`topic "${topic}": ${message}`);
      logger.warn({ topic, err: message }, "GitHub search request failed");
    }
  }

  if (signals.length === 0 && failures.length > 0) {
    throw new Error(`GitHub source failed for every topic — ${failures.join("; ")}`);
  }

  return signals;
}
