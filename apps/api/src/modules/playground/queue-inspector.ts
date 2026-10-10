// =============================================================================
// BullMQ Queue Inspector — Dashboard data for playground
// =============================================================================

import { Queue } from "bullmq";
import { redis } from "../../lib/redis";

const QUEUE_NAMES = [
  "digest-pipeline",
  "audio-generation",
  "telegram-delivery",
  "email-delivery",
] as const;

// Reuse queue instances for introspection
const queues = QUEUE_NAMES.map(
  (name) =>
    new Queue(name, {
      connection: redis,
    }),
);

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: string;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export async function getAllQueueStatuses(): Promise<QueueStatus[]> {
  const statuses: QueueStatus[] = [];

  for (const queue of queues) {
    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );
      statuses.push({
        name: queue.name,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: 0,
      });
    } catch {
      statuses.push({
        name: queue.name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      });
    }
  }

  return statuses;
}

export async function getQueueJobs(
  queueName: string,
  status: "waiting" | "active" | "completed" | "failed" | "delayed" = "completed",
  limit = 20,
): Promise<QueueJob[]> {
  const queue = queues.find((q) => q.name === queueName);
  if (!queue) return [];

  try {
    const jobs = await queue.getJobs([status], 0, limit - 1);
    return jobs.map((job) => ({
      id: job.id || "",
      name: job.name,
      data: job.data as Record<string, unknown>,
      status,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));
  } catch {
    return [];
  }
}

export async function retryFailedJob(queueName: string, jobId: string): Promise<boolean> {
  const queue = queues.find((q) => q.name === queueName);
  if (!queue) return false;

  try {
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function cleanQueue(
  queueName: string,
  status: "completed" | "failed" = "completed",
  age = 3600000,
): Promise<number> {
  const queue = queues.find((q) => q.name === queueName);
  if (!queue) return 0;

  try {
    const removed = await queue.clean(age, 100, status);
    return removed.length;
  } catch {
    return 0;
  }
}
