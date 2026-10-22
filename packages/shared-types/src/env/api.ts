import { z } from "zod";
import { logLevelSchema } from "./common";

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  // The API reads ALLOWED_ORIGINS (see apps/api/src/lib/origins.ts).
  ALLOWED_ORIGINS: z.string().optional(),
  /**
   * @deprecated Not read by the API. Use ALLOWED_ORIGINS instead.
   */
  CORS_ORIGIN: z.string().optional(),
  // Domain the auth cookies are scoped to (apps/api/src/auth.ts).
  COOKIE_DOMAIN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: logLevelSchema,
  // Request guards — read by apps/api/src/middleware/*.
  MAX_BODY_BYTES: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).optional(),
  RSS_ALLOWED_HOSTS: z.string().optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
