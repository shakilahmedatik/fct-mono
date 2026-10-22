// =============================================================================
// Preconfigured Data Source Definitions
// 22 sources covering: AI, Programming, DevOps, Design/UX, Security,
// Ethical Hacking, Networking, Mobile, Tech Business, and more
// =============================================================================

import type { SourceDefinition } from "../types";

export const DEFAULT_SOURCES: SourceDefinition[] = [
  // ─── API Sources ──────────────────────────────────────────────────────────
  {
    id: "hn-top",
    name: "Hacker News — Top Stories",
    type: "hackernews",
    enabled: true,
    categories: ["programming", "tech", "ai", "startups"],
    description:
      "Top stories from Y Combinator's Hacker News — the heartbeat of the developer community.",
    icon: "🟧",
    config: { type: "hackernews", limit: 25, endpoint: "topstories" },
  },
  {
    id: "hn-best",
    name: "Hacker News — Best Stories",
    type: "hackernews",
    enabled: false,
    categories: ["programming", "tech"],
    description: "Highest-voted stories on HN over a longer time window.",
    icon: "🏆",
    config: { type: "hackernews", limit: 15, endpoint: "beststories" },
  },
  {
    id: "github-ai",
    name: "GitHub Trending — AI & ML",
    type: "github",
    enabled: true,
    categories: ["ai", "machine-learning", "open-source"],
    description: "Trending AI/ML repositories on GitHub by recent activity and stars.",
    icon: "🤖",
    config: {
      type: "github",
      topics: ["ai", "machine-learning", "llm"],
      perTopic: 5,
      minStars: 50,
    },
  },
  {
    id: "github-webdev",
    name: "GitHub Trending — Web & Systems",
    type: "github",
    enabled: true,
    categories: ["programming", "typescript", "rust"],
    description: "Trending TypeScript, Rust, and Go repositories.",
    icon: "⚡",
    config: {
      type: "github",
      topics: ["typescript", "rust", "golang"],
      perTopic: 4,
      minStars: 50,
    },
  },
  {
    id: "github-security",
    name: "GitHub Trending — Security Tools",
    type: "github",
    enabled: true,
    categories: ["security", "ethical-hacking", "tools"],
    description: "Trending security tools, scanners, and exploit frameworks.",
    icon: "🛡️",
    config: {
      type: "github",
      topics: ["security", "pentesting", "vulnerability-scanner"],
      perTopic: 3,
      minStars: 30,
    },
  },
  {
    id: "devto",
    name: "Dev.to — Top Articles",
    type: "forem",
    enabled: true,
    categories: ["programming", "webdev", "tutorials"],
    description: "Top community articles from the Dev.to platform.",
    icon: "📝",
    config: { type: "forem", limit: 12 },
  },

  // ─── Reddit Sources (via RSS) ──────────────────────────────────────────────
  {
    id: "reddit-programming",
    name: "Reddit — r/programming",
    type: "reddit",
    enabled: true,
    categories: ["programming"],
    description: "Computer programming discussion and links.",
    icon: "💻",
    config: { type: "reddit", subreddits: ["programming"], perSub: 6 },
  },
  {
    id: "reddit-technology",
    name: "Reddit — r/technology",
    type: "reddit",
    enabled: true,
    categories: ["tech", "tech-business"],
    description: "Technology industry news and discussion.",
    icon: "📱",
    config: { type: "reddit", subreddits: ["technology"], perSub: 5 },
  },
  {
    id: "reddit-machinelearning",
    name: "Reddit — r/MachineLearning",
    type: "reddit",
    enabled: true,
    categories: ["ai", "machine-learning", "research"],
    description: "Academic and applied machine learning research.",
    icon: "🧠",
    config: { type: "reddit", subreddits: ["MachineLearning"], perSub: 5 },
  },
  {
    id: "reddit-netsec",
    name: "Reddit — r/netsec",
    type: "reddit",
    enabled: true,
    categories: ["security", "ethical-hacking", "networking"],
    description: "Information security news and vulnerabilities.",
    icon: "🔐",
    config: { type: "reddit", subreddits: ["netsec"], perSub: 5 },
  },
  {
    id: "reddit-devops",
    name: "Reddit — r/devops",
    type: "reddit",
    enabled: true,
    categories: ["devops", "infrastructure", "cloud"],
    description: "DevOps practices, CI/CD, containers, and infrastructure.",
    icon: "🔧",
    config: { type: "reddit", subreddits: ["devops"], perSub: 5 },
  },
  {
    id: "reddit-webdev",
    name: "Reddit — r/webdev",
    type: "reddit",
    enabled: false,
    categories: ["webdev", "frontend", "design"],
    description: "Web development news, tools, and discussion.",
    icon: "🌐",
    config: { type: "reddit", subreddits: ["webdev"], perSub: 5 },
  },
  {
    id: "reddit-android",
    name: "Reddit — r/androiddev",
    type: "reddit",
    enabled: false,
    categories: ["mobile", "android"],
    description: "Android development news and discussion.",
    icon: "🤖",
    config: { type: "reddit", subreddits: ["androiddev"], perSub: 4 },
  },
  {
    id: "reddit-ios",
    name: "Reddit — r/iOSProgramming",
    type: "reddit",
    enabled: false,
    categories: ["mobile", "ios", "swift"],
    description: "iOS and Swift development community.",
    icon: "🍎",
    config: { type: "reddit", subreddits: ["iOSProgramming"], perSub: 4 },
  },

  // ─── RSS Feed Sources ─────────────────────────────────────────────────────
  {
    id: "rss-lobsters",
    name: "Lobste.rs",
    type: "rss",
    enabled: true,
    categories: ["programming", "systems", "open-source"],
    description:
      "Computing-focused link aggregation — high signal, community-curated tech discussions.",
    icon: "🦞",
    config: { type: "rss", feedUrl: "https://lobste.rs/rss", limit: 10 },
  },
  {
    id: "rss-techcrunch",
    name: "TechCrunch",
    type: "rss",
    enabled: true,
    categories: ["tech-business", "startups", "funding"],
    description:
      "Breaking technology business news — startups, funding rounds, and industry analysis.",
    icon: "💰",
    config: { type: "rss", feedUrl: "https://techcrunch.com/feed/", limit: 8 },
  },
  {
    id: "rss-thehackernews",
    name: "The Hacker News (THN)",
    type: "rss",
    enabled: true,
    categories: ["security", "hacking-news", "vulnerabilities"],
    description: "Cybersecurity news — CVEs, data breaches, threat intelligence, and APT reports.",
    icon: "🕵️",
    config: {
      type: "rss",
      feedUrl: "https://feeds.feedburner.com/TheHackersNews",
      limit: 8,
    },
  },
  {
    id: "rss-krebs",
    name: "Krebs on Security",
    type: "rss",
    enabled: true,
    categories: ["security", "investigative", "hacking-news"],
    description:
      "In-depth investigative reporting on cybercrime, data breaches, and security threats.",
    icon: "🔍",
    config: {
      type: "rss",
      feedUrl: "https://krebsonsecurity.com/feed/",
      limit: 5,
    },
  },
  {
    id: "rss-smashing",
    name: "Smashing Magazine",
    type: "rss",
    enabled: true,
    categories: ["design", "ui-ux", "frontend", "css"],
    description:
      "Professional web design and UX articles — CSS, accessibility, and design systems.",
    icon: "🎨",
    config: {
      type: "rss",
      feedUrl: "https://www.smashingmagazine.com/feed/",
      limit: 6,
    },
  },
  {
    id: "rss-csstricks",
    name: "CSS-Tricks",
    type: "rss",
    enabled: false,
    categories: ["frontend", "css", "design", "ui-ux"],
    description: "Tips, tricks, and techniques on using CSS for web development.",
    icon: "✨",
    config: {
      type: "rss",
      feedUrl: "https://css-tricks.com/feed/",
      limit: 6,
    },
  },
  {
    id: "rss-arstechnica",
    name: "Ars Technica",
    type: "rss",
    enabled: true,
    categories: ["tech", "science", "policy"],
    description: "Technology, science, and policy coverage with deep technical analysis.",
    icon: "📰",
    config: {
      type: "rss",
      feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
      limit: 8,
    },
  },
  {
    id: "rss-darkreading",
    name: "Dark Reading",
    type: "rss",
    enabled: true,
    categories: ["security", "ethical-hacking", "networking"],
    description:
      "Enterprise security news — threat analysis, vulnerability disclosure, and CISO briefings.",
    icon: "🌑",
    config: {
      type: "rss",
      feedUrl: "https://www.darkreading.com/rss.xml",
      limit: 6,
    },
  },
  {
    id: "rss-androidauthority",
    name: "Android Authority",
    type: "rss",
    enabled: false,
    categories: ["mobile", "android", "tech"],
    description: "Android news, reviews, and development guides.",
    icon: "📲",
    config: {
      type: "rss",
      feedUrl: "https://www.androidauthority.com/feed/",
      limit: 5,
    },
  },
  {
    id: "rss-wired",
    name: "Wired",
    type: "rss",
    enabled: false,
    categories: ["tech", "science", "culture"],
    description: "Technology, science, culture, and the future — long-form journalism.",
    icon: "🔌",
    config: {
      type: "rss",
      feedUrl: "https://www.wired.com/feed/rss",
      limit: 6,
    },
  },
];

/**
 * Merge user overrides with default source definitions.
 * Overrides match by `id`. Any fields provided in the override replace the defaults.
 */
export function mergeSourceConfig(
  defaults: SourceDefinition[],
  overrides: Partial<SourceDefinition>[],
): SourceDefinition[] {
  const overrideMap = new Map(overrides.map((o) => [o.id, o]));
  const merged = defaults.map((def) => {
    const override = overrideMap.get(def.id);
    if (!override) return def;
    return { ...def, ...override, config: { ...def.config, ...override.config } };
  });

  // Add any entirely new sources from overrides
  for (const override of overrides) {
    if (override.id && !defaults.some((d) => d.id === override.id)) {
      merged.push(override as SourceDefinition);
    }
  }

  return merged;
}

/**
 * Get only enabled sources, optionally filtered by category.
 */
export function getEnabledSources(
  sources: SourceDefinition[],
  categoryFilter?: string[],
): SourceDefinition[] {
  let filtered = sources.filter((s) => s.enabled);
  if (categoryFilter && categoryFilter.length > 0) {
    const filterSet = new Set(categoryFilter.map((c) => c.toLowerCase()));
    filtered = filtered.filter((s) => s.categories.some((c) => filterSet.has(c.toLowerCase())));
  }
  return filtered;
}

/**
 * Get all unique categories across all source definitions.
 */
export function getAllCategories(sources: SourceDefinition[]): string[] {
  const cats = new Set<string>();
  for (const s of sources) {
    for (const c of s.categories) cats.add(c);
  }
  return Array.from(cats).sort();
}
