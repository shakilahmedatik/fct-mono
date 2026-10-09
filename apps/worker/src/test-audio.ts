import { config } from "dotenv";

config(); // Load monorepo .env

import { db, schema } from "@repo/db";
import { synthesizeAudioWithFailover } from "./audio/synthesizer";
import { workerLogger } from "./lib/logger";
import { redisConnection } from "./lib/redis";

async function main() {
  workerLogger.info("Testing Audio Synthesis and S3 Upload live...");

  // Create a real test digest row to satisfy PostgreSQL foreign key constraint
  const testDigestId = crypto.randomUUID();
  await db.insert(schema.digests).values({
    id: testDigestId,
    title: "Audio Test Digest",
    digestType: "daily_audio",
    status: "pending",
    digestDate: new Date(),
  });

  const testScript =
    "Good morning. Here is your First Cup Tech audio briefing for Friday, October 9, 2026. " +
    "Anthropic has unveiled Claude 3.7 with hybrid reasoning architecture, enabling developers to switch between sub-second inference and extended test-time thinking. " +
    "Meanwhile, Bun 1.2 introduces out-of-the-box S3 API compatibility and faster cryptography routines. " +
    "That concludes your briefing. Have an exceptional build day.";

  const result = await synthesizeAudioWithFailover(testScript, testDigestId);

  console.log("\n================ AUDIO SYNTHESIS REPORT ================");
  console.log(JSON.stringify(result, null, 2));
  console.log("========================================================\n");

  // Verify URL accessibility directly from RustFS / S3
  try {
    const probe = await fetch(result.audioUrl);
    console.log(`Audio URL Probe Status: ${probe.status} ${probe.statusText}`);
    console.log(`Content-Type: ${probe.headers.get("content-type")}`);
    console.log(`Content-Length: ${probe.headers.get("content-length")} bytes`);
  } catch (err: unknown) {
    console.warn("Could not probe audio URL directly:", err);
  }

  await redisConnection.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
