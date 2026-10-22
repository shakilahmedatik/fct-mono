import { z } from "zod";
import { logLevelSchema } from "./common";

export const webEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: logLevelSchema,
});

export type WebEnv = z.infer<typeof webEnvSchema>;
