import { createMiddleware } from "hono/factory";

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const incomingId = c.req.header("x-request-id");
  const requestId = incomingId || crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});
