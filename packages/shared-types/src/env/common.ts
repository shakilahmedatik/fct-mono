import { z } from "zod";

/**
 * Log levels understood by pino (the structured logger used across the repo).
 */
export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export const logLevelSchema = z.enum(LOG_LEVELS).default("info");

export type LogLevel = (typeof LOG_LEVELS)[number];
