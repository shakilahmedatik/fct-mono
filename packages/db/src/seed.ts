import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import pino from "pino";
import postgres from "postgres";
import * as schema from "./schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the repo-root .env relative to THIS FILE, not the current working
// directory. `config({ path: "../../.env" })` is resolved against process.cwd(),
// so running `bun run db:seed` from the repo root silently loaded a different
// (or no) .env file.
config({ path: resolve(__dirname, "../../../.env") });

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

/**
 * Host names that are considered "clearly local" and therefore safe to wipe.
 */
const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "host.docker.internal",
  // docker-compose service names used by the local development stack
  "db",
  "postgres",
  "database",
]);

function fail(message: string): never {
  logger.error(message);
  process.exit(1);
}

/**
 * Guards the destructive part of this script.
 *
 * The seed truncates ~16 tables — including `user`, `account` and `session` —
 * so running it against a production DATABASE_URL destroys every account.
 */
function assertSeedIsSafe(connectionString: string): void {
  if (process.env.NODE_ENV === "production") {
    fail(
      'Refusing to seed: NODE_ENV is "production". The seed script deletes all ' +
        "existing rows. Run it against a local/staging database only, or unset " +
        "NODE_ENV if you really know what you are doing.",
    );
  }

  if (process.env.SEED_ALLOW_REMOTE === "true") {
    logger.warn(
      "SEED_ALLOW_REMOTE=true — running the seed against a non-local database. " +
        "All existing rows will be deleted.",
    );
    return;
  }

  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    fail(
      `DATABASE_URL is not a valid URL: ${connectionString}. Fix it and re-run. ` +
        "The seed script does not fall back to a default database.",
    );
  }

  if (!LOCAL_HOSTNAMES.has(hostname.toLowerCase())) {
    fail(
      `Refusing to seed: DATABASE_URL points at "${hostname}", which is not a local ` +
        "database. The seed script deletes all existing rows in ~16 tables " +
        "(users, accounts, sessions, digests, ...).\n" +
        "If this really is a throwaway database, re-run with SEED_ALLOW_REMOTE=true.",
    );
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  fail(
    "DATABASE_URL is not set. Point it at the database you want to seed " +
      '(e.g. "postgresql://postgres:postgres@localhost:5432/first_cup_tech") and ' +
      "re-run. The seed script no longer falls back to a default database.",
  );
}

assertSeedIsSafe(connectionString);

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function seed() {
  logger.info("🌱 Starting First Cup Tech database seed...");

  // 1. Clean existing records in reverse dependency order
  logger.info("🧹 Clearing old data...");
  await db.delete(schema.itemInteractions);
  await db.delete(schema.feedback);
  await db.delete(schema.audioBriefs);
  await db.delete(schema.digestItems);
  await db.delete(schema.digests);
  await db.delete(schema.storyMemberships);
  await db.delete(schema.stories);
  await db.delete(schema.userPreferences);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.verifications);
  await db.delete(schema.users);
  await db.delete(schema.blogPosts);
  await db.delete(schema.newsletterSubscribers);
  await db.delete(schema.contactMessages);
  await db.delete(schema.systemSettings);

  // 2. Seed Users
  // NOTE: the ids below are public knowledge (they live in this repository).
  // Do not treat "usr_admin_01" as an authorisation token — the API must
  // authenticate the caller, never trust a raw user id from a webhook body.
  logger.info("👤 Seeding users...");
  const adminId = "usr_admin_01";
  const proUserId = "usr_pro_01";
  const freeUserId = "usr_free_01";

  await db.insert(schema.users).values([
    {
      id: adminId,
      name: "System Administrator",
      email: "admin@example.com",
      emailVerified: true,
      role: "admin",
      plan: "PRO",
      persona: "CTO / Platform Architect",
      telegramChatId: "123456789",
      telegramUsername: "@firstcupadmin",
      preferredDeliveryChannel: "telegram",
      subscriptionStatus: "active",
      onboardingCompletedAt: new Date(),
    },
    {
      id: proUserId,
      name: "Shakil Ahmed",
      email: "pro.user@example.com",
      emailVerified: true,
      role: "user",
      plan: "PRO",
      persona: "Founder / CEO",
      telegramChatId: "987654321",
      telegramUsername: "@shakilahmed",
      preferredDeliveryChannel: "telegram",
      paddleCustomerId: "ctm_01h9x8y7z6",
      paddleSubscriptionId: "sub_01h9x8y7z6",
      subscriptionStatus: "active",
      onboardingCompletedAt: new Date(),
    },
    {
      id: freeUserId,
      name: "Sarah Chen",
      email: "free.user@example.com",
      emailVerified: true,
      role: "user",
      plan: "FREE",
      persona: "Senior Fullstack Developer",
      preferredDeliveryChannel: "telegram",
      subscriptionStatus: "trialing",
      onboardingCompletedAt: new Date(),
    },
  ]);

  // 3. Seed User Preferences
  logger.info("⚙️  Seeding user preferences...");
  await db.insert(schema.userPreferences).values([
    {
      id: "pref_admin",
      userId: adminId,
      topics: ["ai", "engineering", "devops", "security"],
      skillLevel: "advanced",
      timezone: "UTC",
      deliveryHour: 7,
      audioEnabled: true,
      channelEnabled: true,
      deliveryCadence: "daily",
      voicePersona: "neutral",
      playbackSpeed: 1,
      emailDigest: true,
      emailAlerts: true,
    },
    {
      id: "pref_pro",
      userId: proUserId,
      topics: ["ai", "startups", "engineering", "devops"],
      skillLevel: "intermediate",
      timezone: "UTC",
      deliveryHour: 7,
      audioEnabled: true,
      channelEnabled: true,
      deliveryCadence: "daily",
      voicePersona: "neutral",
      playbackSpeed: 1,
      emailDigest: true,
      emailAlerts: true,
    },
    {
      id: "pref_free",
      userId: freeUserId,
      topics: ["frontend", "engineering", "ai"],
      skillLevel: "intermediate",
      timezone: "UTC",
      deliveryHour: 8,
      audioEnabled: false,
      channelEnabled: false,
      deliveryCadence: "weekly",
      voicePersona: "neutral",
      playbackSpeed: 1.25,
      emailDigest: true,
      emailAlerts: false,
    },
  ]);

  // 4. Seed Stories & Memberships
  logger.info("📰 Seeding stories & memberships...");
  const story1Id = "sty_deepseek_v3";
  const story2Id = "sty_valkey_8";
  const story3Id = "sty_turbo_bun";
  const story4Id = "sty_pgvector_17";

  await db.insert(schema.stories).values([
    {
      id: story1Id,
      canonicalTitle:
        "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
      dominantSource: "hackernews",
      status: "active",
      embeddingModel: "text-embedding-3-small",
      topics: ["ai", "engineering"],
    },
    {
      id: story2Id,
      canonicalTitle:
        "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
      dominantSource: "github",
      status: "active",
      embeddingModel: "text-embedding-3-small",
      topics: ["devops", "engineering"],
    },
    {
      id: story3Id,
      canonicalTitle: "Turborepo 2.11 & Bun 1.3: Benchmarking Monorepo Build Acceleration",
      dominantSource: "forem",
      status: "active",
      embeddingModel: "text-embedding-3-small",
      topics: ["startups", "devops"],
    },
    {
      id: story4Id,
      canonicalTitle: "PostgreSQL 17 pgvector: In-Memory Indexing for 10M+ Vector Scale",
      dominantSource: "reddit",
      status: "active",
      embeddingModel: "text-embedding-3-small",
      topics: ["ai", "devops"],
    },
  ]);

  await db.insert(schema.storyMemberships).values([
    {
      id: "mem_hn_01",
      storyId: story1Id,
      sourceItemId: "hn:41829102",
      source: "hackernews",
      url: "https://news.ycombinator.com/item?id=41829102",
      title: "DeepSeek-V3 Paper: Architecture, FP8 and Training Details",
      summary:
        "Comprehensive architectural breakdown of DeepSeek-V3 showing novel MLA attention and 3x throughput.",
      upvotes: 412,
      comments: 184,
      rankScore: 0.94,
      topics: ["ai", "engineering"],
    },
    {
      id: "mem_gh_01",
      storyId: story2Id,
      sourceItemId: "gh:valkey-io/valkey:8.0.0",
      source: "github",
      url: "https://github.com/valkey-io/valkey/releases/tag/v8.0.0",
      title: "Valkey 8.0.0 Release Notes and Performance Benchmarks",
      summary:
        "Official release announcement with multi-threaded I/O thread pooling and backward compatibility.",
      upvotes: 890,
      comments: 64,
      rankScore: 0.88,
      topics: ["devops", "engineering"],
    },
    {
      id: "mem_dev_01",
      storyId: story3Id,
      sourceItemId: "forem:devto:19284",
      source: "forem",
      url: "https://dev.to/firstcup/turborepo-bun-speedup-2026",
      title: "Why We Swapped Our Microservices for Bun Workspaces + Turborepo",
      summary: "Case study cutting CI execution times from 9 minutes to 38 seconds.",
      upvotes: 215,
      comments: 32,
      rankScore: 0.82,
      topics: ["startups", "devops"],
    },
    {
      id: "mem_rd_01",
      storyId: story4Id,
      sourceItemId: "reddit:databases:pgvector17",
      source: "reddit",
      url: "https://reddit.com/r/Database/comments/pgvector_17",
      title: "Pgvector on PG17 handles 10M vectors with HNSW in-memory index",
      summary: "Production scale test comparing pgvector on PG17 against dedicated vector DBs.",
      upvotes: 350,
      comments: 91,
      rankScore: 0.79,
      topics: ["ai", "devops"],
    },
  ]);

  // 5. Seed Digests & Digest Items
  logger.info("🎙️  Seeding daily digests & audio briefs...");
  const digestTodayId = "dig_today_pro_01";
  const digestYesterdayId = "dig_yesterday_pro_01";

  await db.insert(schema.digests).values([
    {
      id: digestTodayId,
      userId: proUserId,
      digestType: "daily_audio",
      status: "delivered",
      title: `Daily Executive Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      digestDate: new Date(),
      generatedAt: new Date(Date.now() - 3600 * 1000),
      deliveredAt: new Date(Date.now() - 3300 * 1000),
      isMaster: false,
    },
    {
      id: digestYesterdayId,
      userId: proUserId,
      digestType: "daily_audio",
      status: "delivered",
      title: "Daily Executive Briefing — Yesterday",
      digestDate: new Date(Date.now() - 86400 * 1000),
      generatedAt: new Date(Date.now() - 90000 * 1000),
      deliveredAt: new Date(Date.now() - 89000 * 1000),
      isMaster: false,
    },
  ]);

  await db.insert(schema.digestItems).values([
    {
      id: "dgi_01",
      digestId: digestTodayId,
      storyId: story1Id,
      title: "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
      url: "https://news.ycombinator.com/item?id=41829102",
      source: "hackernews",
      summary:
        "New technical whitepaper highlights novel mixture-of-experts optimizations achieving 3x token throughput on commodity H100 clusters.",
      whyItMatters:
        "Lowers self-hosted LLM inference unit economics by 60% compared to dense weights.",
      position: 1,
      rankScore: 0.94,
      topics: ["ai", "engineering"],
    },
    {
      id: "dgi_02",
      digestId: digestTodayId,
      storyId: story2Id,
      title:
        "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
      url: "https://github.com/valkey-io/valkey/releases/tag/v8.0.0",
      source: "github",
      summary:
        "The Linux Foundation backed fork releases v8 with asynchronous multi-threaded I/O pipelines and native cluster slot rebalancing.",
      whyItMatters: "Drop-in Redis replacement ready for high-concurrency production queues.",
      position: 2,
      rankScore: 0.88,
      topics: ["devops", "engineering"],
    },
    {
      id: "dgi_03",
      digestId: digestTodayId,
      storyId: story3Id,
      title: "Turborepo 2.11 & Bun 1.3: Benchmarking Monorepo Build Acceleration",
      url: "https://dev.to/firstcup/turborepo-bun-speedup-2026",
      source: "forem",
      summary:
        "Case study cutting CI execution times from 9 minutes to 38 seconds using Bun workspaces alongside Turborepo task hashing.",
      whyItMatters:
        "Demonstrates tangible velocity gains when unifying the JavaScript tooling layer.",
      position: 3,
      rankScore: 0.82,
      topics: ["startups", "devops"],
    },
  ]);

  // 6. Seed Audio Brief
  await db.insert(schema.audioBriefs).values({
    id: "aud_today_01",
    digestId: digestTodayId,
    status: "ready",
    script:
      "Good morning! Here is your First Cup briefing for today. First, DeepSeek-V3 demonstrates major inference savings through FP8 quantization. Second, Valkey 8.0 brings asynchronous I/O thread pooling. And third, Turborepo paired with Bun accelerates monorepo builds dramatically.",
    audioUrl: "https://storage.example.com/audio/dig_today_pro_01.mp3",
    durationSec: 194,
    provider: "elevenlabs",
    deliveryChannel: "telegram",
    deliveryStatus: "sent",
    deliveryMessageId: "msg_9921",
  });

  // 7. Seed Feedback
  await db.insert(schema.feedback).values({
    id: "fb_01",
    userId: proUserId,
    digestId: digestTodayId,
    digestItemId: "dgi_01",
    type: "helpful",
    weight: 1.0,
    note: "Great technical depth on the attention mechanism.",
  });

  // 8. Seed Blog Posts
  logger.info("📝 Seeding blog posts...");
  await db.insert(schema.blogPosts).values([
    {
      id: "blog_01",
      slug: "tech-pulse-2026-10-08",
      title: "Next.js 16 and Bun 1.3: The Serverless Convergence",
      excerpt:
        "An executive overview of full-stack TypeScript runtime evolutions and containerized deployment models.",
      contentHtml:
        "<p>The boundary between lightweight edge runtimes and persistent long-running microservices has fundamentally shifted. In this article, we break down how Bun and Next.js 16 interact in modern monorepos.</p>",
      tags: ["nextjs", "bun", "architecture"],
      publishedAt: new Date(Date.now() - 3600 * 1000 * 12),
      digestDate: new Date(),
    },
    {
      id: "blog_02",
      slug: "state-of-quantization-2026",
      title: "The State of Open Source AI Quantization",
      excerpt:
        "Why FP8 and 4-bit KV caching are revolutionizing private cloud LLM inference economics.",
      contentHtml:
        "<p>Running frontier-class models inside private VPCs was once constrained by exorbitant VRAM footprints. Novel quantization standards have changed the equation.</p>",
      tags: ["ai", "llm", "quantization"],
      publishedAt: new Date(Date.now() - 3600 * 1000 * 36),
      digestDate: new Date(Date.now() - 86400 * 1000),
    },
  ]);

  // 9. Seed Newsletter Subscribers
  logger.info("📬 Seeding newsletter subscribers...");
  await db.insert(schema.newsletterSubscribers).values([
    {
      id: "sub_01",
      email: "subscriber1@example.com",
      status: "active",
      unsubscribeToken: "token_sub_01",
    },
    {
      id: "sub_02",
      email: "subscriber2@example.com",
      status: "active",
      unsubscribeToken: "token_sub_02",
    },
  ]);

  // 10. Seed System Settings
  logger.info("🔧 Seeding system settings...");
  await db.insert(schema.systemSettings).values([
    {
      key: "crawler_interval_minutes",
      value: "60",
      updatedAt: new Date(),
    },
    {
      key: "default_audio_provider",
      value: "elevenlabs",
      updatedAt: new Date(),
    },
    {
      key: "min_relevance_score",
      value: "0.75",
      updatedAt: new Date(),
    },
  ]);

  logger.info("✅ First Cup Tech database seed completed successfully!");
  await sql.end();
}

seed().catch((err) => {
  logger.error({ err }, "❌ Seed failed:");
  process.exit(1);
});
