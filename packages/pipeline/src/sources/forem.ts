import { assertSafeHttpUrlAsync } from "../ai/url-guard";
import type { RawSignal } from "../types";

interface ForemArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  public_reactions_count: number;
  comments_count: number;
  tag_list: string[];
}

export async function fetchForemSignals(
  limit = 15,
  baseUrl = "https://dev.to",
): Promise<RawSignal[]> {
  // The base URL is dereferenced by the server and can be overridden through
  // the source configuration, so it is validated before it is fetched.
  const safeBaseUrl = await assertSafeHttpUrlAsync(baseUrl, {
    allowlistEnvVar: "SOURCE_ALLOWED_HOSTS",
    context: "Forem base URL",
  });

  const res = await fetch(
    `${safeBaseUrl.toString().replace(/\/$/, "")}/api/articles?top=1&per_page=${limit}`,
    {
      headers: {
        "User-Agent": "FirstCupTechWorker/1.0",
      },
      signal: AbortSignal.timeout(6000),
    },
  );

  if (!res.ok) {
    throw new Error(`Forem request failed with HTTP ${res.status}`);
  }

  const articles = (await res.json()) as ForemArticle[];
  return articles.map((article) => ({
    source: "forem" as const,
    sourceItemId: String(article.id),
    title: article.title.trim(),
    url: article.url,
    summary: article.description || null,
    publishedAt: new Date(article.published_at),
    upvotes: article.public_reactions_count || 0,
    comments: article.comments_count || 0,
    topicHints: article.tag_list || [],
  }));
}
