import type { RawSignal } from "../types";

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagContent(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (match?.[1]) {
    return decodeXmlEntities(match[1]).trim();
  }
  return null;
}

function extractAtomLink(xml: string): string | null {
  const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch?.[1]) {
    return hrefMatch[1].trim();
  }
  return extractTagContent(xml, "link");
}

export function parseRssXml(
  xml: string,
  limit = 10,
  source: RawSignal["source"] = "rss",
): RawSignal[] {
  const items: RawSignal[] = [];
  const itemMatches = [
    ...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi),
  ];

  for (const match of itemMatches) {
    if (items.length >= limit) break;

    const block = match[1];
    const rawTitle = extractTagContent(block, "title");
    if (!rawTitle) continue;

    const title = stripHtml(rawTitle);
    if (!title) continue;

    const url = extractAtomLink(block) || extractTagContent(block, "guid") || "";
    if (!url?.startsWith("http")) continue;

    const rawSummary =
      extractTagContent(block, "description") ||
      extractTagContent(block, "summary") ||
      extractTagContent(block, "content") ||
      null;

    const summary = rawSummary ? stripHtml(rawSummary).slice(0, 320) : null;

    const rawDate =
      extractTagContent(block, "pubDate") ||
      extractTagContent(block, "published") ||
      extractTagContent(block, "updated");

    const publishedAt = rawDate ? new Date(rawDate) : new Date();

    items.push({
      source,
      sourceItemId: url,
      title,
      url,
      summary,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      upvotes: 0,
      comments: 0,
      topicHints: [],
    });
  }

  return items;
}

export async function fetchRssFeedSignals(
  feedUrl: string,
  limit = 10,
  source: RawSignal["source"] = "rss",
): Promise<RawSignal[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "FirstCupTechWorker/1.0",
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssXml(xml, limit, source);
  } catch {
    return [];
  }
}
