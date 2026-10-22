// =============================================================================
// Multi-Source Ingestion Engine
// Configurable, source-definition-driven crawling with per-source error isolation
// =============================================================================

import { logger } from "../stages/logger";
import type { RawSignal, SourceDefinition } from "../types";
import { DEFAULT_SOURCES, getEnabledSources, mergeSourceConfig } from "./config";
import { fetchForemSignals } from "./forem";
import { fetchGitHubSignals } from "./github";
import { fetchHackerNewsSignals } from "./hackernews";
import { fetchRedditSignals } from "./reddit";
import { fetchRssFeedSignals } from "./rss";
import { getSeedFallbackSignals } from "./seed-fallback";

export { DEFAULT_SOURCES, getAllCategories, getEnabledSources, mergeSourceConfig } from "./config";
export { fetchForemSignals } from "./forem";
export { fetchGitHubSignals } from "./github";
export { fetchHackerNewsSignals } from "./hackernews";
export { fetchRedditSignals } from "./reddit";
export { fetchRssFeedSignals, parseRssXml } from "./rss";
export { getSeedFallbackSignals } from "./seed-fallback";

export interface IngestionResult {
  signals: RawSignal[];
  sourceResults: SourceFetchResult[];
  totalDurationMs: number;
}

export interface SourceFetchResult {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  signalCount: number;
  durationMs: number;
  error?: string;
  status: "success" | "error" | "skipped" | "fallback";
  /**
   * True when the result does not represent freshly ingested content (for
   * example curated seed content that was substituted because the live
   * sources were unavailable). A degraded source must never be presented as
   * real ingested news.
   */
  degraded?: boolean;
}

/**
 * Fetch signals from a single source definition.
 */
async function fetchFromSource(source: SourceDefinition): Promise<RawSignal[]> {
  const cfg = source.config;

  switch (cfg.type) {
    case "hackernews":
      return fetchHackerNewsSignals(cfg.limit, cfg.endpoint);

    case "github":
      return fetchGitHubSignals(cfg.topics, cfg.perTopic, cfg.minStars);

    case "reddit":
      return fetchRedditSignals(cfg.subreddits, cfg.perSub);

    case "forem":
      return fetchForemSignals(cfg.limit, cfg.baseUrl);

    case "rss":
      return fetchRssFeedSignals(cfg.feedUrl, cfg.limit, "rss");

    default:
      return [];
  }
}

/**
 * Ingest signals from all enabled sources.
 * Accepts optional source config overrides for playground customization.
 */
export async function ingestFromSources(
  sourceOverrides?: Partial<SourceDefinition>[],
  categoryFilter?: string[],
  onSourceComplete?: (result: SourceFetchResult) => void,
): Promise<IngestionResult> {
  const startedAt = Date.now();

  const allSources = sourceOverrides
    ? mergeSourceConfig(DEFAULT_SOURCES, sourceOverrides)
    : DEFAULT_SOURCES;

  const enabledSources = getEnabledSources(allSources, categoryFilter);
  const sourceResults: SourceFetchResult[] = [];
  const allSignals: RawSignal[] = [];

  // Fetch from all sources in parallel with per-source error isolation
  const promises = enabledSources.map(async (source) => {
    const sourceStart = Date.now();
    try {
      const signals = await fetchFromSource(source);
      const result: SourceFetchResult = {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        signalCount: signals.length,
        durationMs: Date.now() - sourceStart,
        status: "success",
      };
      sourceResults.push(result);
      allSignals.push(...signals);
      onSourceComplete?.(result);
    } catch (err) {
      const result: SourceFetchResult = {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        signalCount: 0,
        durationMs: Date.now() - sourceStart,
        error: err instanceof Error ? err.message : String(err),
        status: "error",
      };
      sourceResults.push(result);
      onSourceComplete?.(result);
    }
  });

  await Promise.allSettled(promises);

  // If live sources yielded fewer than 6 items, supplement with curated seeds.
  // The substitution is reported as a *fallback*, never as a success: the seed
  // content is fabricated and must not be presented as ingested news.
  if (allSignals.length < 6) {
    const seeds = getSeedFallbackSignals();
    const existingUrls = new Set(allSignals.map((s) => s.url));
    let added = 0;

    for (const seed of seeds) {
      if (!existingUrls.has(seed.url)) {
        allSignals.push(seed);
        existingUrls.add(seed.url);
        added += 1;
      }
    }

    const result: SourceFetchResult = {
      sourceId: "seed-fallback",
      sourceName: "Curated Seed Data",
      sourceType: "fallback",
      signalCount: added,
      durationMs: 0,
      status: "fallback",
      degraded: true,
      error: `Live sources returned ${allSignals.length - added} signals; ${added} curated seed signals were substituted.`,
    };

    sourceResults.push(result);
    onSourceComplete?.(result);
    logger.warn(
      { liveSignals: allSignals.length - added, seedSignals: added },
      "Live ingestion was degraded — curated seed content was substituted",
    );
  }

  return {
    signals: allSignals,
    sourceResults,
    totalDurationMs: Date.now() - startedAt,
  };
}

/**
 * Legacy wrapper — matches the original ingestAllSources() signature
 * for backward compatibility with the orchestrator.
 */
export async function ingestAllSources(): Promise<RawSignal[]> {
  const result = await ingestFromSources();
  return result.signals;
}
