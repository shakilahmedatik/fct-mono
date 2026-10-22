import type { RawSignal } from "../types";

export function getSeedFallbackSignals(): RawSignal[] {
  const now = new Date();
  return [
    {
      source: "hackernews",
      sourceItemId: "hn-seed-1",
      title: "Anthropic releases Claude 3.7 Sonnet with Hybrid Reasoning Architecture",
      url: "https://news.ycombinator.com/item?id=39812001",
      summary:
        "Anthropic introduces Claude 3.7 Sonnet, combining standard sub-second inference with extended test-time compute thinking in a unified model architecture.",
      publishedAt: new Date(now.getTime() - 2 * 3600 * 1000),
      upvotes: 642,
      comments: 310,
      topicHints: ["ai", "llm", "reasoning"],
    },
    {
      source: "reddit",
      sourceItemId: "reddit-seed-1",
      title: "Benchmarking Claude 3.7 Sonnet against OpenAI o3-mini on coding benchmarks",
      url: "https://www.reddit.com/r/artificial/comments/claude_benchmarks",
      summary:
        "Independent benchmark results reveal Claude 3.7's hybrid compute model sets new state of the art in complex SWE-bench verified coding challenges.",
      publishedAt: new Date(now.getTime() - 3 * 3600 * 1000),
      upvotes: 380,
      comments: 142,
      topicHints: ["ai", "benchmarks", "coding"],
    },
    {
      source: "github",
      sourceItemId: "gh-seed-1",
      title: "oven-sh/bun: Bun 1.2 introduces native S3 client and WebSocket compression",
      url: "https://github.com/oven-sh/bun",
      summary:
        "Bun 1.2 is here with out-of-the-box S3 API compatibility, faster node:crypto implementation, and built-in permessage-deflate WebSocket compression.",
      publishedAt: new Date(now.getTime() - 4 * 3600 * 1000),
      upvotes: 1250,
      comments: 89,
      topicHints: ["bun", "javascript", "runtime", "backend"],
    },
    {
      source: "hackernews",
      sourceItemId: "hn-seed-2",
      title: "Next.js 16 and Turbopack for Webpack Migration Complete",
      url: "https://news.ycombinator.com/item?id=39813002",
      summary:
        "Vercel shares benchmarks showing Next.js 16 Turbopack achieves up to 96% faster code recompilation on massive enterprise monorepos.",
      publishedAt: new Date(now.getTime() - 5 * 3600 * 1000),
      upvotes: 489,
      comments: 245,
      topicHints: ["frontend", "nextjs", "react", "turbopack"],
    },
    {
      source: "forem",
      sourceItemId: "dev-seed-1",
      title: "Migrating from Prisma to Drizzle ORM: 10x Throughput & Zero Cold Starts",
      url: "https://dev.to/engineering/migrating-to-drizzle-orm-in-production",
      summary:
        "How our infrastructure team replaced generated query engines with lightweight SQL-first Drizzle ORM and cut database latency to under 3ms.",
      publishedAt: new Date(now.getTime() - 6 * 3600 * 1000),
      upvotes: 520,
      comments: 76,
      topicHints: ["database", "typescript", "drizzle", "sql"],
    },
    {
      source: "hackernews",
      sourceItemId: "hn-seed-3",
      title: "PostgreSQL 17 and pgvector 0.8: Native HNSW Vector Index Scaling",
      url: "https://news.ycombinator.com/item?id=39814003",
      summary:
        "pgvector 0.8 introduces iterative index scans and reduced memory footprints for 1536-dimensional OpenAI and Gemini vector embeddings in Postgres.",
      publishedAt: new Date(now.getTime() - 8 * 3600 * 1000),
      upvotes: 780,
      comments: 195,
      topicHints: ["postgres", "database", "ai", "vector"],
    },
    {
      source: "rss",
      sourceItemId: "rss-seed-1",
      title: "Rust 2024 Edition Officially Enters Stabilization",
      url: "https://blog.rust-lang.org/2026/rust-2024-stabilization",
      summary:
        "The Rust project announces stabilization of the 2024 edition, introducing RPITIT in traits, gen blocks, and improved async closures.",
      publishedAt: new Date(now.getTime() - 10 * 3600 * 1000),
      upvotes: 310,
      comments: 80,
      topicHints: ["rust", "systems", "programming"],
    },
    {
      source: "github",
      sourceItemId: "gh-seed-2",
      title: "honojs/hono: Ultrafast web framework for the Edges and Bun runtime",
      url: "https://github.com/honojs/hono",
      summary:
        "Hono v4.7 brings advanced WebSocket helper routing, RPC schema validation improvements, and zero-allocation Regexp router optimizations.",
      publishedAt: new Date(now.getTime() - 12 * 3600 * 1000),
      upvotes: 890,
      comments: 64,
      topicHints: ["hono", "backend", "api", "typescript"],
    },
  ];
}
