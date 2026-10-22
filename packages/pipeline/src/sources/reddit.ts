import { mapWithConcurrency } from "../stages/concurrency";
import { logger } from "../stages/logger";
import type { RawSignal } from "../types";
import { parseRssXml } from "./rss";

/**
 * Subreddits are fetched with a bounded amount of parallelism. Fetching them
 * one after the other multiplied the worst case runtime by the number of
 * subreddits (5 × 5s timeout).
 */
const SUBREDDIT_CONCURRENCY = 3;

export async function fetchRedditSignals(
  subreddits = ["technology", "programming", "artificial"],
  perSub = 5,
): Promise<RawSignal[]> {
  const results = await mapWithConcurrency(subreddits, SUBREDDIT_CONCURRENCY, async (sub) => {
    try {
      const url = `https://www.reddit.com/r/${sub}/.rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FirstCupTech/1.0; +https://firstcup.tech)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        logger.warn({ subreddit: sub, status: res.status }, "Reddit feed request failed");
        return [] as RawSignal[];
      }

      const xml = await res.text();
      const items = parseRssXml(xml, perSub, "reddit");
      return items.map((item) => ({
        ...item,
        topicHints: [sub, "reddit"],
      }));
    } catch (err) {
      logger.warn(
        { subreddit: sub, err: err instanceof Error ? err.message : String(err) },
        "Reddit feed request failed",
      );
      return [] as RawSignal[];
    }
  });

  return results.flat();
}
