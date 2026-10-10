// =============================================================================
// Playground Redis Cache — session-scoped data persistence
// =============================================================================

import { redis } from "../../lib/redis";

const CACHE_TTL = 7200; // 2 hours
const KEY_PREFIX = "playground";

function key(sessionId: string, ...parts: string[]): string {
  return `${KEY_PREFIX}:${sessionId}:${parts.join(":")}`;
}

export async function cacheSet(sessionId: string, step: string, data: string): Promise<void> {
  const k = key(sessionId, step);
  const stepsKey = key(sessionId, "_steps");
  const metaKey = key(sessionId, "_meta");
  const metaValue = JSON.stringify({ lastActivity: new Date().toISOString() });

  // Single pipeline: SET step data, SADD to step-set + global sessions, EXPIRE step-set,
  // SET meta with TTL — one round-trip instead of five.
  const pipeline = redis.pipeline();
  pipeline.set(k, data, "EX", CACHE_TTL);
  pipeline.sadd(stepsKey, step);
  pipeline.expire(stepsKey, CACHE_TTL);
  pipeline.sadd("playground_sessions", sessionId);
  pipeline.set(metaKey, metaValue, "EX", CACHE_TTL);
  await pipeline.exec();
}

export async function cacheGet(sessionId: string, step: string): Promise<string | null> {
  return redis.get(key(sessionId, step));
}

export async function cacheHas(sessionId: string, step: string): Promise<boolean> {
  return (await redis.exists(key(sessionId, step))) === 1;
}

export async function cacheClear(sessionId: string): Promise<void> {
  const steps = await redis.smembers(key(sessionId, "_steps"));
  const keys = [
    key(sessionId, "_steps"),
    key(sessionId, "_meta"),
    ...steps.map((s) => key(sessionId, s)),
  ];
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.srem("playground_sessions", sessionId);
}

export async function getCacheStatus(sessionId: string): Promise<{
  sessionId: string;
  cachedSteps: string[];
  lastActivity: string | null;
}> {
  const steps = await redis.smembers(key(sessionId, "_steps"));
  const meta = await redis.get(key(sessionId, "_meta"));
  const parsed = meta ? JSON.parse(meta) : null;
  return {
    sessionId,
    cachedSteps: steps,
    lastActivity: parsed?.lastActivity || null,
  };
}

export async function listAllSessions(): Promise<
  { sessionId: string; lastActivity: string | null }[]
> {
  const sessionIds = await redis.smembers("playground_sessions");
  if (sessionIds.length === 0) return [];

  // One pipeline round-trip for all session metas, plus a cleanup pipeline for any
  // sessions whose meta key has already expired.
  const metaPipeline = redis.pipeline();
  for (const id of sessionIds) metaPipeline.get(key(id, "_meta"));
  const results = await metaPipeline.exec();
  if (!results) return [];

  const sessions: { sessionId: string; lastActivity: string | null }[] = [];
  const toCleanup: string[] = [];
  results.forEach(([err, meta], idx) => {
    if (err || !meta) {
      toCleanup.push(sessionIds[idx]);
      return;
    }
    try {
      const parsed = JSON.parse(meta as string);
      sessions.push({
        sessionId: sessionIds[idx],
        lastActivity: parsed?.lastActivity || null,
      });
    } catch {
      toCleanup.push(sessionIds[idx]);
    }
  });

  if (toCleanup.length > 0) {
    await redis.srem("playground_sessions", ...toCleanup);
  }

  // Sort by newest first
  return sessions.sort((a, b) => {
    if (!a.lastActivity || !b.lastActivity) return 0;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });
}
