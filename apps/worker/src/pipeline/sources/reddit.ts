import type { RawSignal } from "../types";
import { parseRssXml } from "./rss";

export async function fetchRedditSignals(
  subreddits = ["technology", "programming", "artificial"],
  perSub = 5,
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  for (const sub of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${sub}/.rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FirstCupTech/1.0; +https://firstcup.tech)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const items = parseRssXml(xml, perSub, "reddit");
      for (const item of items) {
        signals.push({
          ...item,
          topicHints: [sub, "reddit"],
        });
      }
    } catch {
      // Continue next subreddit
    }
  }

  return signals;
}
