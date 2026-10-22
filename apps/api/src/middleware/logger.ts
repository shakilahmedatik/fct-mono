import { createMiddleware } from "hono/factory";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  if (path === "/admin/playground/queues/status") return;

  const payload = {
    method,
    path,
    status,
    durationMs: duration,
    requestId: c.get("requestId"),
  };

  // Server errors are logged at error level so they can be alerted on
  // separately from ordinary traffic.
  if (status >= 500) {
    logger.error(payload, "Request failed");
  } else {
    logger.info(payload);
  }
});
