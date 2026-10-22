import { createMiddleware } from "hono/factory";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Attach a correlation id to every request.
 *
 * A client-supplied id is only honoured when it matches a strict pattern.
 * Reflecting an arbitrary value into a response header is unsafe — a value
 * containing CRLF makes the header setter throw, turning any request into a
 * 500 — and an unbounded value inflates every log record.
 */
export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();

  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  await next();
});
