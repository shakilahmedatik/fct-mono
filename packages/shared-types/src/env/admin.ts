import { z } from "zod";

export const adminEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3002),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  SENTRY_DSN: z.string().optional(),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;
