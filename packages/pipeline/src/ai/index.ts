import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI } from "@google/genai";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { pipeline } from "@huggingface/transformers";
import OpenAI from "openai";
import { logger } from "../stages/logger";
import { getActiveAIConfig } from "./settings";
import { assertSafeHttpUrl } from "./url-guard";

export * from "./settings";

export interface AIProviderConfig {
  id?: string;
  name?: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export const aiConfigStorage = new AsyncLocalStorage<AIProviderConfig>();

let openaiClient: OpenAI | null = null;
let genAIClient: GoogleGenAI | null = null;

const OPENAI_CLIENT_TIMEOUT_MS = 30_000;

function isLocalBaseUrl(baseURL: string): boolean {
  try {
    const host = new URL(baseURL).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Build an OpenAI-compatible client for a provider configuration.
 *
 * The base URL is validated by the SSRF guard: only http(s) URLs that do not
 * point at a loopback, private, link-local or metadata address are accepted,
 * unless the host is explicitly allow-listed (`LLM_ALLOWED_BASE_URLS`) or the
 * URL is the locally hosted model configured in `LLM_BASE_URL`.
 */
function getOpenAIClient(overrideConfig?: AIProviderConfig): OpenAI {
  const config = overrideConfig || aiConfigStorage.getStore();

  if (config) {
    const baseURL = assertSafeHttpUrl(config.baseURL, {
      allowlistEnvVar: "LLM_ALLOWED_BASE_URLS",
      context: "LLM provider base URL",
      configuredUrlEnvVar: "LLM_BASE_URL",
    }).toString();

    const isLocal = isLocalBaseUrl(baseURL);
    return new OpenAI({
      baseURL,
      apiKey: config.apiKey || (isLocal ? "local" : "none"),
      defaultHeaders: baseURL.includes("openrouter.ai")
        ? {
            "HTTP-Referer": "https://firstcup.tech",
            "X-Title": "First Cup Tech",
          }
        : undefined,
      timeout: OPENAI_CLIENT_TIMEOUT_MS,
    });
  }

  const baseURL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey =
    process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";

  if (openaiClient) return openaiClient;

  const validatedBaseURL = assertSafeHttpUrl(baseURL, {
    allowlistEnvVar: "LLM_ALLOWED_BASE_URLS",
    context: "LLM provider base URL",
    configuredUrlEnvVar: "LLM_BASE_URL",
  }).toString();

  openaiClient = new OpenAI({
    baseURL: validatedBaseURL,
    apiKey,
    defaultHeaders: validatedBaseURL.includes("openrouter.ai")
      ? {
          "HTTP-Referer": "https://firstcup.tech",
          "X-Title": "First Cup Tech",
        }
      : undefined,
    timeout: OPENAI_CLIENT_TIMEOUT_MS,
  });

  return openaiClient;
}

function _getGenAIClient(): GoogleGenAI {
  if (genAIClient) return genAIClient;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is missing from environment");
  }

  genAIClient = new GoogleGenAI({ apiKey });
  return genAIClient;
}

// Cache the pipeline instance so we don't load the model on every call
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let embeddingPipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Generate an embedding for a piece of text.
 *
 * A failed embedding is a hard error: the previous implementation returned a
 * zero vector, which never exceeds the clustering similarity threshold, so
 * every signal silently became its own cluster while the pipeline still
 * reported success. The caller must never be able to mistake a degenerate run
 * for a good one.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!embeddingPipeline) {
      if (!embeddingPipelinePromise) {
        // Xenova/all-MiniLM-L6-v2 is a 384-dimensional model (fast and small)
        const loadEmbedding = pipeline as (
          task: "feature-extraction",
          model: string,
        ) => Promise<FeatureExtractionPipeline>;

        const loadPromise = loadEmbedding("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        embeddingPipelinePromise = loadPromise;

        // If the model fails to load, drop the cached promise so the next call
        // retries the load instead of re-throwing the same rejection forever.
        loadPromise.catch(() => {
          if (embeddingPipelinePromise === loadPromise) {
            embeddingPipelinePromise = null;
          }
        });
      }
      embeddingPipeline = await embeddingPipelinePromise;
    }

    if (!embeddingPipeline) {
      throw new Error("Failed to initialize embedding pipeline");
    }

    // Generate embeddings
    const output = await embeddingPipeline(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      { err: message },
      "Embedding generation failed — refusing to return a degenerate zero vector",
    );
    throw new Error(`Embedding generation failed: ${message}`);
  }
}

const MAX_COMPLETION_ATTEMPTS = 3;
const COMPLETION_RETRY_BASE_DELAY_MS = 500;

/**
 * Only transient failures are retried: rate limits (429) and server errors
 * (5xx). A 4xx is a client error — retrying it would just burn the budget.
 */
function isTransientCompletionError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") {
    return status === 429 || status >= 500;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|socket hang up|network error|fetch failed/i.test(
    message,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateCompletion(
  prompt: string,
  systemPrompt = "You are a professional technology journalist.",
): Promise<string> {
  const storeConfig = aiConfigStorage.getStore();
  const activeConfig = storeConfig || (await getActiveAIConfig());
  const model = activeConfig.model;

  // Fail fast and loudly when no credential is available: a request without a
  // key cannot succeed, and waiting for the provider to reject it only hides
  // the real problem.
  if (!activeConfig.apiKey && !isLocalBaseUrl(activeConfig.baseURL)) {
    throw new Error(
      `No API key is configured for AI provider "${activeConfig.id ?? "unknown"}" (base URL ${activeConfig.baseURL}).`,
    );
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_COMPLETION_ATTEMPTS; attempt++) {
    try {
      const client = getOpenAIClient(activeConfig);
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      lastError = error;

      const canRetry = attempt < MAX_COMPLETION_ATTEMPTS && isTransientCompletionError(error);
      if (!canRetry) break;

      const delay = COMPLETION_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(
        {
          attempt,
          model,
          delayMs: delay,
          err: error instanceof Error ? error.message : String(error),
        },
        "Transient LLM failure — retrying completion",
      );
      await sleep(delay);
    }
  }

  logger.error(
    { model, err: lastError instanceof Error ? lastError.message : String(lastError) },
    "Completion generation failed",
  );
  throw new Error(
    `AI generation failed with model [${model}]: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
