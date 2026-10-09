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
): Promise<RawSignal[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "FirstCupTechWorker/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const signals: RawSignal[] = [];

  for (const topic of topics) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}+stars:>50&sort=updated&order=desc&per_page=${perTopic}`;
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as { items?: GitHubSearchItem[] };
      if (!data.items) continue;

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
    } catch {
      // Continue next topic
    }
  }

  return signals;
}
