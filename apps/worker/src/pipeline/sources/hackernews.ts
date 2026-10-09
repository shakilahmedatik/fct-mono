import type { RawSignal } from "../types";

interface HNItem {
  id: number;
  by?: string;
  title?: string;
  type?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  time?: number;
}

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

export async function fetchHackerNewsSignals(limit = 25): Promise<RawSignal[]> {
  try {
    const res = await fetch(`${HN_BASE}/topstories.json`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return [];
    }

    const ids = ((await res.json()) as number[]).slice(0, limit);
    const itemPromises = ids.map(async (id): Promise<RawSignal | null> => {
      try {
        const itemRes = await fetch(`${HN_BASE}/item/${id}.json`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!itemRes.ok) return null;
        const item = (await itemRes.json()) as HNItem;
        if (item.type !== "story" || !item.title) return null;

        const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
        return {
          source: "hackernews",
          sourceItemId: String(item.id),
          title: item.title.trim(),
          url,
          summary: item.text
            ? item.text
                .replace(/<[^>]+>/g, " ")
                .slice(0, 300)
                .trim()
            : null,
          publishedAt: item.time ? new Date(item.time * 1000) : new Date(),
          upvotes: item.score || 0,
          comments: item.descendants || 0,
          topicHints: [],
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(itemPromises);
    return results.filter((item): item is RawSignal => item !== null);
  } catch {
    return [];
  }
}
