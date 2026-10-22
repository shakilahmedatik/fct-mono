import { config } from "dotenv";

config({ path: "../../.env" });

import { emailDelivery, telegramDelivery } from "./delivery";
import { workerLogger } from "./lib/logger";

async function runDeliveryTests() {
  workerLogger.info("🧪 Starting First Cup Tech delivery channel tests...");

  const testPayload = {
    recipientId: "test-chat-id-12345",
    recipientName: "Test Developer",
    title: "Morning Intelligence Brief — Architectural Transition",
    items: [
      {
        title: "Bun 1.3 Released with Turborepo Native Workspaces",
        url: "https://bun.sh/blog/bun-v1.3",
        source: "github",
        summary: "Zero-copy package manager features and optimized workspace links.",
        whyItMatters: "Accelerates local builds across high-scale TypeScript monorepos.",
      },
      {
        title: "Drizzle ORM Vector Similarity Queries at Scale",
        url: "https://orm.drizzle.team",
        source: "hackernews",
        summary: "Native pgvector cosine distance operators with zero overhead.",
        whyItMatters: "Eliminates heavy Python middleware for clustering tech news.",
      },
    ],
    audioUrl: "http://localhost:9000/first-cup-tech-audio/test-briefing.mp3",
    durationSec: 180,
  };

  // 1. Test Telegram Text formatting & dispatch
  workerLogger.info("1️⃣ Testing Telegram Text Brief Dispatch...");
  const tgTextRes = await telegramDelivery.sendText(testPayload);
  workerLogger.info(tgTextRes, "Telegram Text Dispatch Result");

  // 2. Test Telegram Audio dispatch with fallback
  workerLogger.info("2️⃣ Testing Telegram Audio Brief Dispatch...");
  const tgAudioRes = await telegramDelivery.sendAudio(testPayload);
  workerLogger.info(tgAudioRes, "Telegram Audio Dispatch Result");

  // 3. Test Email Text dispatch with Resend verified test inbox
  workerLogger.info("3️⃣ Testing Resend Email Text Brief Dispatch (delivered@resend.dev)...");
  const emailTextRes = await emailDelivery.sendText({
    ...testPayload,
    recipientId: "delivered@resend.dev",
  });
  workerLogger.info(emailTextRes, "Email Text Dispatch Result");

  // 4. Test Email Audio brief HTML newsletter dispatch with Resend verified test inbox
  workerLogger.info(
    "4️⃣ Testing Resend Email Audio Brief HTML Newsletter Dispatch (delivered@resend.dev)...",
  );
  const emailAudioRes = await emailDelivery.sendAudio({
    ...testPayload,
    recipientId: "delivered@resend.dev",
  });
  workerLogger.info(emailAudioRes, "Email Audio Dispatch Result");

  workerLogger.info("🎉 All delivery channel adapters tested successfully!");
}

runDeliveryTests().catch((err) => {
  workerLogger.error({ err: err.message }, "Delivery testing failed");
  process.exit(1);
});
