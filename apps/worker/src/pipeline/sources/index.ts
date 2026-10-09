import { workerLogger } from "../../lib/logger";
import type { RawSignal } from "../types";
import { fetchForemSignals } from "./forem";
import { fetchGitHubSignals } from "./github";
import { fetchHackerNewsSignals } from "./hackernews";
import { fetchRedditSignals } from "./reddit";
import { fetchRssFeedSignals } from "./rss";
import { getSeedFallbackSignals } from "./seed-fallback";

export async function ingestAllSources(): Promise<RawSignal[]> {
  workerLogger.info("Starting ingestion across all configured source adapters...");

  const fetchTasks = [
    fetchHackerNewsSignals(20),
    fetchGitHubSignals(["ai", "typescript", "rust"], 4),
    fetchRedditSignals(["technology", "programming"], 4),
    fetchForemSignals(10),
    fetchRssFeedSignals("https://lobste.rs/rss", 8, "rss"),
  ];

  const results = await Promise.allSettled(fetchTasks);
  const signals: RawSignal[] = [];

  for (const res of results) {
    if (res.status === "fulfilled") {
      signals.push(...res.value);
    }
  }

  workerLogger.info({ liveCount: signals.length }, "Live source ingestion complete.");

  // If live sources yielded fewer than 6 items (due to rate limit, offline sandbox, etc.), supplement with curated seeds
  if (signals.length < 6) {
    workerLogger.warn("Live signal count is low; augmenting with curated seed signals.");
    const seeds = getSeedFallbackSignals();
    // Add seeds that are not already present by URL
    const existingUrls = new Set(signals.map((s) => s.url));
    for (const seed of seeds) {
      if (!existingUrls.has(seed.url)) {
        signals.push(seed);
      }
    }
  }

  return signals;
}
