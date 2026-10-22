import { createMiddleware } from "hono/factory";
import { logger } from "./logger";

const DEFAULT_TIMEOUT_MS = 30_000;

class RequestTimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * Bound how long a request may take.
 *
 * Without this a request that blocks on an unresponsive dependency holds its
 * socket, promise and memory indefinitely — a slow dependency turns into
 * unbounded resource accumulation rather than a clean failure.
 */
export function requestTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const configured = Number.parseInt(process.env.REQUEST_TIMEOUT_MS ?? "", 10);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : timeoutMs;

  return createMiddleware(async (c, next) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new RequestTimeoutError(limit));
      }, limit);
    });

    try {
      await Promise.race([next(), timeout]);
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        logger.error(
          { method: c.req.method, path: c.req.path, requestId: c.get("requestId") },
          "Request timed out",
        );
        return c.json(
          {
            error: "Request timed out",
            requestId: c.get("requestId"),
          },
          503,
        );
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
}
