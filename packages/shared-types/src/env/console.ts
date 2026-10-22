import { z } from "zod";
import { logLevelSchema } from "./common";

export const consoleEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: logLevelSchema,
});

export type ConsoleEnv = z.infer<typeof consoleEnvSchema>;
