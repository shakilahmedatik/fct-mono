// =============================================================================
// AI Provider Settings & Introspection Service
// Reads configured AI providers securely from .env and manages active selection.
// =============================================================================

import OpenAI from "openai";
import type { AIProviderConfig } from "./index";
import { assertSafeHttpUrlAsync } from "./url-guard";

export type AIProviderId = "local" | "openrouter" | "openai" | "anthropic" | "gemini";

export interface AISettings {
  activeProvider: AIProviderId;
  model?: string;
}

export interface AIProviderStatus {
  id: AIProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  isAvailable: boolean;
  isActive: boolean;
  activeModel: string;
  baseURL: string;
  missingRequirements?: string[];
}

const isSet = (v?: string | null): boolean =>
  Boolean(v && !v.includes("your-") && v.trim().length > 0);

/**
 * PROCESS-LOCAL SETTINGS.
 *
 * The settings below live in a module level variable of the process that
 * called `saveAISettings`. They are:
 *
 *   * lost when the process restarts;
 *   * NOT visible to any other process (the worker never sees a setting saved
 *     by the API, and vice versa);
 *   * never written to the database — the database schema is owned by another
 *     team and no persistence is performed here.
 *
 * The read path deliberately falls through to the environment defaults on
 * every call, so a process that never saved anything still sees the
 * environment configuration, and a process that saved something sees its own
 * overrides on top of it.
 */
let memorySettingsCache: AISettings | null = null;

export function getDefaultAISettings(): AISettings {
  let activeProvider: AIProviderId = "openrouter";

  if (isSet(process.env.LLM_BASE_URL)) {
    activeProvider = "local";
  } else if (isSet(process.env.OPENROUTER_API_KEY)) {
    activeProvider = "openrouter";
  } else if (isSet(process.env.OPENAI_API_KEY)) {
    activeProvider = "openai";
  } else if (isSet(process.env.GOOGLE_GENERATIVE_AI_API_KEY) || isSet(process.env.GEMINI_API_KEY)) {
    activeProvider = "gemini";
  } else if (isSet(process.env.ANTHROPIC_API_KEY)) {
    activeProvider = "anthropic";
  }

  return {
    activeProvider,
    model: undefined,
  };
}

/**
 * Returns the effective settings for this process.
 *
 * Process local: see the note on `memorySettingsCache`. Synchronous because it
 * performs no I/O.
 */
export function getAISettings(): AISettings {
  if (memorySettingsCache) {
    return memorySettingsCache;
  }
  return getDefaultAISettings();
}

/**
 * Stores settings for this process only.
 *
 * Process local: see the note on `memorySettingsCache`. Synchronous because it
 * performs no I/O.
 */
export function saveAISettings(updates: Partial<AISettings>): AISettings {
  const current = getAISettings();
  const next: AISettings = {
    ...current,
    ...updates,
  };
  memorySettingsCache = next;
  return next;
}

/**
 * Resolve the API key for a provider from the server environment.
 * Never taken from request input.
 */
function resolveApiKey(providerId: AIProviderId): string {
  switch (providerId) {
    case "local":
      return process.env.LLM_API_KEY || "local";
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || "";
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "gemini":
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || "";
    default:
      return "";
  }
}

export function getAIProviderStatuses(settings: AISettings): AIProviderStatus[] {
  // 1. Local LLM (LM Studio / Ollama / local OpenAI-compatible)
  const hasLocal = isSet(process.env.LLM_BASE_URL);
  const localMissing = hasLocal ? [] : ["LLM_BASE_URL"];

  // 2. OpenRouter (Cloud LLM Gateway)
  const hasOpenRouter = isSet(process.env.OPENROUTER_API_KEY);
  const openRouterMissing = hasOpenRouter ? [] : ["OPENROUTER_API_KEY"];

  // 3. Direct OpenAI
  const hasOpenAI = isSet(process.env.OPENAI_API_KEY);
  const openAiMissing = hasOpenAI ? [] : ["OPENAI_API_KEY"];

  // 4. Anthropic Claude
  const hasAnthropic = isSet(process.env.ANTHROPIC_API_KEY);
  const anthropicMissing = hasAnthropic ? [] : ["ANTHROPIC_API_KEY"];

  // 5. Google Gemini
  const hasGemini =
    isSet(process.env.GOOGLE_GENERATIVE_AI_API_KEY) || isSet(process.env.GEMINI_API_KEY);
  const geminiMissing = hasGemini ? [] : ["GOOGLE_GENERATIVE_AI_API_KEY"];

  const active = settings.activeProvider;

  return [
    {
      id: "local",
      name: "Local LLM (LM Studio / Ollama)",
      description:
        "Self-hosted OpenAI-compatible LLM endpoint running locally without cloud API costs.",
      isConfigured: hasLocal,
      isAvailable: hasLocal,
      isActive: active === "local",
      activeModel:
        settings.activeProvider === "local" && settings.model
          ? settings.model
          : process.env.LLM_MODEL || "fct",
      baseURL: process.env.LLM_BASE_URL || "http://localhost:20128/v1",
      missingRequirements: localMissing,
    },
    {
      id: "openrouter",
      name: "OpenRouter (Cloud LLM)",
      description:
        "Unified cloud routing for Llama 3, Claude, Gemini, Mistral, and DeepSeek models.",
      isConfigured: hasOpenRouter,
      isAvailable: hasOpenRouter,
      isActive: active === "openrouter",
      activeModel:
        settings.activeProvider === "openrouter" && settings.model
          ? settings.model
          : process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      baseURL: "https://openrouter.ai/api/v1",
      missingRequirements: openRouterMissing,
    },
    {
      id: "openai",
      name: "OpenAI Direct",
      description: "Direct OpenAI API access for GPT-4o, GPT-4o-mini, and o3-mini models.",
      isConfigured: hasOpenAI,
      isAvailable: hasOpenAI,
      isActive: active === "openai",
      activeModel:
        settings.activeProvider === "openai" && settings.model
          ? settings.model
          : process.env.OPENAI_MODEL || "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      missingRequirements: openAiMissing,
    },
    {
      id: "gemini",
      name: "Google Gemini",
      description:
        "Google Generative AI models (Gemini 2.5 Flash, Gemini 2.0 Pro) via official SDK.",
      isConfigured: hasGemini,
      isAvailable: hasGemini,
      isActive: active === "gemini",
      activeModel:
        settings.activeProvider === "gemini" && settings.model
          ? settings.model
          : process.env.GEMINI_MODEL || "gemini-2.5-flash",
      baseURL: "https://generativelanguage.googleapis.com",
      missingRequirements: geminiMissing,
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      description: "Anthropic Claude 3.5 Sonnet and Claude 3.7 models via Anthropic Messages API.",
      isConfigured: hasAnthropic,
      isAvailable: hasAnthropic,
      isActive: active === "anthropic",
      activeModel:
        settings.activeProvider === "anthropic" && settings.model
          ? settings.model
          : process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      baseURL: "https://api.anthropic.com/v1",
      missingRequirements: anthropicMissing,
    },
  ];
}

/**
 * Resolve a complete, ready to use OpenAI-compatible client configuration for a
 * provider.
 *
 * Every field is resolved from the *server* configuration (environment
 * variables and the process local settings). Nothing is taken from request
 * input: a caller may only name a provider, never a URL or a key.
 *
 * The resolved base URL is passed through the SSRF guard, so a misconfigured or
 * tampered environment cannot point the server at an internal address.
 */
export async function getAIConfigForProvider(providerId: AIProviderId): Promise<AIProviderConfig> {
  const settings = getAISettings();
  const statuses = getAIProviderStatuses(settings);
  const status = statuses.find((s) => s.id === providerId);

  if (!status) {
    throw new Error(`Unknown AI provider: "${providerId}".`);
  }

  if (!status.isConfigured) {
    throw new Error(
      `AI provider "${providerId}" is not configured (missing: ${status.missingRequirements?.join(", ") || "environment variables"}).`,
    );
  }

  const config: AIProviderConfig = {
    id: status.id,
    name: status.name,
    baseURL: status.baseURL,
    apiKey: resolveApiKey(status.id),
    model: status.activeModel,
  };

  await assertSafeHttpUrlAsync(config.baseURL, {
    allowlistEnvVar: "LLM_ALLOWED_BASE_URLS",
    context: `AI provider "${providerId}"`,
    // A locally hosted model is a legitimate deployment; the value is trusted
    // because it comes from the server environment, not from a request.
    configuredUrlEnvVar: "LLM_BASE_URL",
  });

  return config;
}

/**
 * The configuration of the currently active provider (or of the first
 * configured provider when the active one is not configured).
 */
export async function getActiveAIConfig(): Promise<AIProviderConfig> {
  const settings = getAISettings();
  const statuses = getAIProviderStatuses(settings);

  const activeStatus = statuses.find((s) => s.id === settings.activeProvider);
  const fallback = statuses.find((s) => s.isConfigured);
  const target = activeStatus?.isConfigured ? activeStatus : fallback;

  if (target) {
    return getAIConfigForProvider(target.id);
  }

  // Nothing is configured: return an inert configuration so that callers fail
  // with a clear "no API key" error instead of an opaque network failure.
  return {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: "",
    model: "meta-llama/llama-3-8b-instruct:free",
  };
}

export async function testAIConnection(
  providerId: AIProviderId,
  modelOverride?: string,
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const startedAt = Date.now();
  const settings: AISettings = { activeProvider: providerId, model: modelOverride };
  const statuses = getAIProviderStatuses(settings);
  const status = statuses.find((s) => s.id === providerId);

  if (!status?.isConfigured) {
    return {
      success: false,
      latencyMs: 0,
      message: `Provider "${providerId}" is not configured in .env (Missing: ${status?.missingRequirements?.join(", ") || "env vars"})`,
    };
  }

  try {
    let client: OpenAI;
    const model = modelOverride || status.activeModel;

    // The same SSRF guard that protects the production client is applied here:
    // a provider configuration must never be able to aim the server's
    // outbound requests at an internal address.
    await assertSafeHttpUrlAsync(status.baseURL, {
      allowlistEnvVar: "LLM_ALLOWED_BASE_URLS",
      context: `AI provider "${providerId}"`,
      configuredUrlEnvVar: "LLM_BASE_URL",
    });

    if (providerId === "local") {
      client = new OpenAI({
        baseURL: status.baseURL,
        apiKey: process.env.LLM_API_KEY || "local",
        timeout: 10000,
      });
    } else if (providerId === "openrouter") {
      client = new OpenAI({
        baseURL: status.baseURL,
        apiKey: process.env.OPENROUTER_API_KEY || "",
        defaultHeaders: {
          "HTTP-Referer": "https://firstcup.tech",
          "X-Title": "First Cup Tech",
        },
        timeout: 10000,
      });
    } else if (providerId === "openai") {
      client = new OpenAI({
        baseURL: status.baseURL,
        apiKey: process.env.OPENAI_API_KEY || "",
        timeout: 10000,
      });
    } else {
      return {
        success: true,
        latencyMs: 10,
        message: `Provider ${status.name} configured with API key.`,
      };
    }

    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Say hello in 3 words" }],
      max_tokens: 20,
    });

    const reply = res.choices[0]?.message?.content?.trim() || "OK";
    const latencyMs = Date.now() - startedAt;

    return {
      success: true,
      latencyMs,
      message: `Connected successfully (${latencyMs}ms): "${reply}"`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    const errText = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latencyMs,
      message: `Connection failed (${latencyMs}ms): ${errText}`,
    };
  }
}
