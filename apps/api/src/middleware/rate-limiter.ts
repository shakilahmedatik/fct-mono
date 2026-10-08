import { createMiddleware } from "hono/factory";
import { redis } from "../lib/redis";

const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export function rateLimiter(limit = 60, windowSec = 60) {
  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "127.0.0.1";
    const key = `ratelimit:${ip}:${c.req.path}`;

    try {
      if (redis.status === "ready") {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSec);
        }
        if (count > limit) {
          return c.json({ error: "Too many requests. Please slow down." }, 429);
        }
      } else {
        const now = Date.now();
        const record = memoryStore.get(key);
        if (!record || record.expiresAt < now) {
          memoryStore.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
        } else {
          record.count++;
          if (record.count > limit) {
            return c.json({ error: "Too many requests. Please slow down." }, 429);
          }
        }
      }
    } catch {
      // Fallback silently if rate limiting check errors
    }

    await next();
  });
}
