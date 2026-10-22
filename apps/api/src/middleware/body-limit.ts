import { createMiddleware } from "hono/factory";

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MiB

/**
 * Reject oversized request bodies before they are buffered.
 *
 * Without this, `c.req.json()` reads the whole body into memory per request,
 * which — combined with a permissive rate limit — is a cheap memory-exhaustion
 * vector on the public endpoints.
 */
export function bodyLimit(maxBytes = DEFAULT_MAX_BYTES) {
  const configured = Number.parseInt(process.env.MAX_BODY_BYTES ?? "", 10);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : maxBytes;

  return createMiddleware(async (c, next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength) {
      const declared = Number.parseInt(contentLength, 10);
      if (Number.isFinite(declared) && declared > limit) {
        return c.json({ error: "Payload too large" }, 413);
      }
    }

    await next();
  });
}
