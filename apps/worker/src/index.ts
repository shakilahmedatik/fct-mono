import { setupJobSchedulers } from "./cron/schedulers";
import { getReadinessChecks, registerHealthWorkers } from "./lib/health";
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

registerHealthWorkers([digestWorker, audioWorker, telegramWorker, emailWorker]);

setupJobSchedulers().catch((err) => {
  workerLogger.error({ err: err.message }, "Failed to setup job schedulers");
});

// ---------------------------------------------------------------------------
// Health / readiness server
// ---------------------------------------------------------------------------
// The worker has no other HTTP surface, but an orchestrator has to be able to
// tell "running but wedged" apart from "healthy". `/health` is the liveness
// probe, `/ready` additionally requires Redis, all four BullMQ workers and a
// recent pipeline run.
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 4001);

const healthServer = Bun.serve({
  port: HEALTH_PORT,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "firstcup-worker",
        uptime: Math.round(process.uptime()),
      });
    }

    if (url.pathname === "/ready") {
      // The readiness computation is bounded internally, but the handler is
      // bounded too: a probe that never answers is indistinguishable from a
      // healthy worker to most orchestrators.
      const checks = await Promise.race([
        getReadinessChecks(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
      ]);

      if (checks === null) {
        return Response.json(
          {
            status: "not_ready",
            service: "firstcup-worker",
            failed: [{ name: "readiness", detail: "the readiness check did not complete in time" }],
          },
          { status: 503 },
        );
      }

      const failed = checks.filter((check) => !check.ok);

      if (failed.length > 0) {
        return Response.json(
          {
            status: "not_ready",
            service: "firstcup-worker",
            failed: failed.map((check) => ({ name: check.name, detail: check.detail })),
          },
          { status: 503 },
        );
      }

      return Response.json({
        status: "ready",
        service: "firstcup-worker",
        uptime: Math.round(process.uptime()),
        checks,
      });
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  },
});

// The BullMQ workers keep the process alive; the health server must not be the
// reason the process stays up on its own.
try {
  healthServer.unref();
} catch {
  // Older Bun versions do not expose unref() — the server is closed during
  // shutdown anyway.
}

workerLogger.info({ port: HEALTH_PORT }, "✅ Health server listening on /health and /ready");

workerLogger.info("✅ All workers initialized and listening for jobs.");

async function handleShutdown(signal: string) {
  workerLogger.info(`Received ${signal}. Gracefully stopping all BullMQ workers...`);

  await Promise.allSettled([
    healthServer.stop(true),
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
