// =============================================================================
// Pipeline Logger
// =============================================================================
//
// The pipeline package is loaded by several processes (the worker, the API
// playground, the admin playground). It therefore owns its own structured
// logger instead of reaching into a host application's logger.
//
// NOTE: this logger is process local. Each process gets its own instance and
// its own log stream.
// =============================================================================

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
