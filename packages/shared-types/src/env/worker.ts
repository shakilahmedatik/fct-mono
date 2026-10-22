import { z } from "zod";
import { logLevelSchema } from "./common";

export const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  // Source crawling / transcription.
  GITHUB_TOKEN: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  // LLM providers (see packages/pipeline/src/ai/settings.ts).
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  // S3 compatible object storage.
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default("first-cup-tech-audio"),
  // RustFS / MinIO / R2 style storage endpoints used by the audio pipeline.
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  /**
   * Selects the background task provider used by the worker queues.
   */
  TASK_PROVIDER: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: logLevelSchema,
  CONCURRENCY: z.coerce.number().default(5),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
