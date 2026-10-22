// =============================================================================
// Playground Redis Cache — session-scoped data persistence
// =============================================================================

import { redis } from "../../lib/redis";

const CACHE_TTL = 7200; // 2 hours
const KEY_PREFIX = "playground";

/**
 * The global session index.
 *
 * It is a sorted set scored by the session's last activity timestamp rather
 * than a plain set: a plain set had no TTL and no size bound, so every
 * session ever created accumulated forever, and listing them issued one Redis
 * command per member.
 */
const SESSIONS_KEY = `${KEY_PREFIX}:sessions`;
const MAX_SESSIONS = 500;

/** Sessions older than this are pruned from the index. */
const SESSION_INDEX_TTL = 24 * 60 * 60;

function key(sessionId: string, ...parts: string[]): string {
  return `${KEY_PREFIX}:${sessionId}:${parts.join(":")}`;
}

/**
 * Record a session in the global index and prune the index.
 *
 * Pruning happens on write so the index cannot grow without bound, and stale
 * entries disappear on their own even if no further writes occur.
 */
async function registerSession(sessionId: string): Promise<void> {
  const score = Date.now();
  await redis
    .multi()
    .zadd(SESSIONS_KEY, score, sessionId)
    .zremrangebyscore(SESSIONS_KEY, 0, score - SESSION_INDEX_TTL * 1000)
    .zremrangebyrank(SESSIONS_KEY, 0, -(MAX_SESSIONS + 1))
    .expire(SESSIONS_KEY, SESSION_INDEX_TTL)
    .exec();
}

export async function cacheSet(sessionId: string, step: string, data: string): Promise<void> {
  const k = key(sessionId, step);
  const stepsKey = key(sessionId, "_steps");
  const metaKey = key(sessionId, "_meta");
  const metaValue = JSON.stringify({ lastActivity: new Date().toISOString() });

  // Single pipeline: SET step data, SADD to step-set, EXPIRE step-set,
  // SET meta with TTL — one round-trip instead of five.
  const pipeline = redis.pipeline();
  pipeline.set(k, data, "EX", CACHE_TTL);
  pipeline.sadd(stepsKey, step);
  pipeline.expire(stepsKey, CACHE_TTL);
  pipeline.set(metaKey, metaValue, "EX", CACHE_TTL);
  await pipeline.exec();

  await registerSession(sessionId);
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
  await redis.zrem(SESSIONS_KEY, sessionId);
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
  // Only the most recent sessions, newest first. The previous implementation
  // read every member of an unbounded set and issued one GET per member.
  const sessionIds = await redis.zrevrange(SESSIONS_KEY, 0, MAX_SESSIONS - 1);
  if (sessionIds.length === 0) return [];

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
    await redis.zrem(SESSIONS_KEY, ...toCleanup);
  }

  return sessions;
}
