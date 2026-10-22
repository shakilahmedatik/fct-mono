import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { redis } from "../lib/redis";
import { logger } from "./logger";

/**
 * Number of trusted reverse proxies in front of this API.
 *
 * `0` (the default) means the API is exposed directly, so the client IP is
 * taken from the socket peer and forwarding headers are ignored entirely.
 * Set it to the number of proxies in front of the API when it is not exposed
 * directly — the client IP is then the Nth entry from the right of
 * `X-Forwarded-For`, which a client cannot forge because each trusted proxy
 * appends to the header.
 */
function trustedProxyHops(): number {
  const parsed = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function socketPeerIp(c: Context): string | undefined {
  const env = c.env as
    | { server?: { requestIP?: (req: Request) => { address?: string } | null } }
    | undefined;
  const server = env?.server;
  if (!server?.requestIP) return undefined;
  try {
    return server.requestIP(c.req.raw)?.address ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the client IP from a source that cannot be spoofed by the caller.
 */
export function getClientIp(c: Context): string {
  const hops = trustedProxyHops();

  if (hops > 0) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const index = parts.length - hops;
      if (index >= 0 && parts[index]) return parts[index];
    }
  }

  const peer = socketPeerIp(c);
  if (peer) return peer;

  // No socket information available (e.g. in-process `app.request()` calls).
  // Fall back to the last forwarded entry, which is still safer than the first
  // entry a caller would choose.
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

/**
 * Bounded in-memory fallback used when Redis is unavailable.
 *
 * Entries are expired lazily on read and the store is swept periodically so it
 * cannot grow without bound.
 */
interface Bucket {
  count: number;
  expiresAt: number;
}

const memoryStore = new Map<string, Bucket>();
const MEMORY_STORE_MAX_ENTRIES = 50_000;
let lastSweep = 0;

function sweepMemoryStore(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of memoryStore) {
    if (bucket.expiresAt < now) memoryStore.delete(key);
  }
  // Hard cap: if the store is still oversized, drop the oldest entries.
  if (memoryStore.size > MEMORY_STORE_MAX_ENTRIES) {
    const excess = memoryStore.size - MEMORY_STORE_MAX_ENTRIES;
    let removed = 0;
    for (const key of memoryStore.keys()) {
      memoryStore.delete(key);
      removed++;
      if (removed >= excess) break;
    }
  }
}

function checkMemoryBucket(key: string, windowSec: number): number {
  const now = Date.now();
  sweepMemoryStore(now);

  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
    return 1;
  }

  existing.count += 1;
  return existing.count;
}

/**
 * Increment the counter and set the TTL atomically.
 *
 * Doing `INCR` then `EXPIRE` separately leaves a window in which the key
 * exists without an expiry, so a crash in between would leave a permanent
 * bucket. A Lua script makes the pair atomic.
 */
const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

export function rateLimiter(limit = 60, windowSec = 60) {
  const configuredLimit = Number.parseInt(process.env.RATE_LIMIT_MAX ?? "", 10);
  const effectiveLimit =
    Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : limit;

  return createMiddleware(async (c, next) => {
    const ip = getClientIp(c);
    // A single key per client, not per path: a per-path key makes the
    // effective ceiling "limit x number of distinct paths", which is
    // unbounded.
    const key = `ratelimit:${ip}`;
    let count: number;

    try {
      if (redis.status === "ready") {
        count = Number(await redis.eval(INCREMENT_SCRIPT, 1, key, String(windowSec)));
      } else {
        count = checkMemoryBucket(key, windowSec);
      }
    } catch (error) {
      // Degrade to the in-process limiter rather than letting every request
      // through unthrottled. The in-process limiter is stricter than a real
      // shared limiter (it is per replica), but it is still a limit.
      logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        "Rate limiter Redis call failed; using in-process fallback",
      );
      count = checkMemoryBucket(key, windowSec);
    }

    if (count > effectiveLimit) {
      const retryAfter = windowSec;
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter,
          requestId: c.get("requestId"),
        },
        429,
      );
    }

    await next();
  });
}
