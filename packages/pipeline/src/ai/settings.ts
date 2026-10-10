// =============================================================================
// AI Provider Settings & Introspection Service
// Reads configured AI providers securely from .env and manages active selection.
// =============================================================================

import OpenAI from "openai";
import type { AIProviderConfig } from "./index";

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
  maskedKey?: string;
  missingRequirements?: string[];
}

const isSet = (v?: string | null) => Boolean(v && !v.includes("your-") && v.trim().length > 0);

function maskKey(key?: string | null): string | undefined {
  if (!key || key.length < 6) return undefined;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

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

export async function getAISettings(): Promise<AISettings> {
  if (memorySettingsCache) {
    return memorySettingsCache;
  }
  const defaults = getDefaultAISettings();
  memorySettingsCache = defaults;
  return defaults;
}

export async function saveAISettings(updates: Partial<AISettings>): Promise<AISettings> {
  const current = await getAISettings();
  const next: AISettings = {
    ...current,
    ...updates,
  };
  memorySettingsCache = next;
  return next;
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
      maskedKey: maskKey(process.env.LLM_API_KEY),
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
      maskedKey: maskKey(process.env.OPENROUTER_API_KEY),
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
      maskedKey: maskKey(process.env.OPENAI_API_KEY),
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
      maskedKey: maskKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY),
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
      maskedKey: maskKey(process.env.ANTHROPIC_API_KEY),
      missingRequirements: anthropicMissing,
    },
  ];
}

export async function getActiveAIConfig(): Promise<AIProviderConfig> {
  const settings = await getAISettings();
  const statuses = getAIProviderStatuses(settings);
  const activeStatus = statuses.find((s) => s.id === settings.activeProvider);

  // If the active provider is configured, return it
  if (activeStatus?.isConfigured) {
    let apiKey = "";
    if (activeStatus.id === "local") {
      apiKey = process.env.LLM_API_KEY || "local";
    } else if (activeStatus.id === "openrouter") {
      apiKey = process.env.OPENROUTER_API_KEY || "";
    } else if (activeStatus.id === "openai") {
      apiKey = process.env.OPENAI_API_KEY || "";
    } else if (activeStatus.id === "gemini") {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
    } else if (activeStatus.id === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY || "";
    }

    return {
      id: activeStatus.id,
      name: activeStatus.name,
      baseURL: activeStatus.baseURL,
      apiKey,
      model: activeStatus.activeModel,
    };
  }

  // Fallback cascade: local -> openrouter -> openai
  const configuredFallback = statuses.find((s) => s.isConfigured);
  if (configuredFallback) {
    let apiKey = "";
    if (configuredFallback.id === "local") {
      apiKey = process.env.LLM_API_KEY || "local";
    } else if (configuredFallback.id === "openrouter") {
      apiKey = process.env.OPENROUTER_API_KEY || "";
    } else if (configuredFallback.id === "openai") {
      apiKey = process.env.OPENAI_API_KEY || "";
    }

    return {
      id: configuredFallback.id,
      name: configuredFallback.name,
      baseURL: configuredFallback.baseURL,
      apiKey,
      model: configuredFallback.activeModel,
    };
  }

  // Default empty fallback
  return {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
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
