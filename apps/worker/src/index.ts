import { setupJobSchedulers } from "./cron/schedulers";
import { workerLogger } from "./lib/logger";
import { redisConnection } from "./lib/redis";
import { createAudioGenerationWorker } from "./workers/audio-generation.worker";
import { createDigestPipelineWorker } from "./workers/digest-pipeline.worker";
import { createEmailWorker } from "./workers/email.worker";
import { createTelegramDeliveryWorker } from "./workers/telegram-delivery.worker";

workerLogger.info("⚡ Starting First Cup Tech background workers on Bun...");

const digestWorker = createDigestPipelineWorker();
const audioWorker = createAudioGenerationWorker();
const telegramWorker = createTelegramDeliveryWorker();
const emailWorker = createEmailWorker();

setupJobSchedulers().catch((err) => {
  workerLogger.error({ err: err.message }, "Failed to setup job schedulers");
});

workerLogger.info("✅ All workers initialized and listening for jobs.");

async function handleShutdown(signal: string) {
  workerLogger.info(`Received ${signal}. Gracefully stopping all BullMQ workers...`);

  await Promise.allSettled([
    digestWorker.close(),
    audioWorker.close(),
    telegramWorker.close(),
    emailWorker.close(),
  ]);

  await redisConnection.quit();
  workerLogger.info("Workers stopped. Exiting process.");
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
