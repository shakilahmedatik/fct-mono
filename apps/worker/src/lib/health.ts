import type { Worker } from "bullmq";
import { workerLogger } from "./logger";
import { redisConnection } from "./redis";

/**
 * The daily cron runs at 06:00 UTC. A pipeline run is therefore considered
 * fresh for a little over one day.
 */
export const PIPELINE_FRESHNESS_WINDOW_MS = 26 * 60 * 60 * 1000;

const LAST_PIPELINE_RUN_KEY = "worker:last-pipeline-run";

/**
 * How long a single Redis probe may take before it is treated as a failure.
 *
 * The worker connection is created with `maxRetriesPerRequest: null` (BullMQ
 * requires that for its blocking commands), so while Redis is unreachable every
 * command sits in the offline queue and the promise never settles. A readiness
 * probe that waits forever is worse than no probe at all: the orchestrator sees
 * a hung container instead of an unhealthy one. Every Redis read in this
 * module is therefore bounded.
 */
export const REDIS_PROBE_TIMEOUT_MS = 2_000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let lastPipelineRunAt: number | null = null;
const registeredWorkers: Worker[] = [];

export function registerHealthWorkers(workers: Worker[]): void {
  registeredWorkers.length = 0;
  registeredWorkers.push(...workers);
}

/**
 * Record that a pipeline run finished. The timestamp is kept in memory and
 * mirrored into Redis so that it survives a restart of the worker process.
 */
export async function recordPipelineRun(at: number = Date.now()): Promise<void> {
  lastPipelineRunAt = at;
  try {
    await withTimeout(
      redisConnection.set(LAST_PIPELINE_RUN_KEY, String(at)),
      REDIS_PROBE_TIMEOUT_MS,
    );
  } catch (err) {
    workerLogger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Could not persist the last pipeline run timestamp",
    );
  }
}

export async function getLastPipelineRunAt(): Promise<number | null> {
  if (lastPipelineRunAt !== null) return lastPipelineRunAt;

  const stored = await withTimeout(
    redisConnection.get(LAST_PIPELINE_RUN_KEY),
    REDIS_PROBE_TIMEOUT_MS,
  );
  if (stored) {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      lastPipelineRunAt = parsed;
      return lastPipelineRunAt;
    }
  }

  return null;
}

export interface ReadinessCheck {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * The readiness checks of the worker process.
 *
 * The worker is only ready when Redis is connected, every BullMQ worker is
 * running and the last pipeline run is recent enough.
 */
export async function getReadinessChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  checks.push({
    name: "redis",
    ok: redisConnection.status === "ready",
    detail: `redis status is "${redisConnection.status}"`,
  });

  for (const worker of registeredWorkers) {
    const running = worker.isRunning();
    checks.push({
      name: `worker:${worker.name}`,
      ok: running,
      detail: running ? "worker is running" : "worker is not running",
    });
  }

  const lastRun = await getLastPipelineRunAt();
  const ageMs = lastRun === null ? null : Date.now() - lastRun;
  const fresh = ageMs !== null && ageMs <= PIPELINE_FRESHNESS_WINDOW_MS;

  checks.push({
    name: "pipeline_recency",
    ok: fresh,
    detail:
      lastRun === null
        ? "no pipeline run has been recorded yet"
        : `last pipeline run was ${Math.round((ageMs as number) / 60000)} minutes ago`,
  });

  return checks;
}
