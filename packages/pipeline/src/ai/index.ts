import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI } from "@google/genai";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { pipeline } from "@huggingface/transformers";
import OpenAI from "openai";
import { getActiveAIConfig } from "./settings";

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

function getOpenAIClient(overrideConfig?: AIProviderConfig): OpenAI {
  const config = overrideConfig || aiConfigStorage.getStore();

  if (config) {
    const isLocal = config.baseURL.includes("localhost") || config.baseURL.includes("127.0.0.1");
    return new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey || (isLocal ? "local" : "none"),
      defaultHeaders: config.baseURL.includes("openrouter.ai")
        ? {
            "HTTP-Referer": "https://firstcup.tech",
            "X-Title": "First Cup Tech",
          }
        : undefined,
      timeout: 30000,
    });
  }

  const baseURL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey =
    process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";

  if (openaiClient) return openaiClient;

  openaiClient = new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: baseURL.includes("openrouter.ai")
      ? {
          "HTTP-Referer": "https://firstcup.tech",
          "X-Title": "First Cup Tech",
        }
      : undefined,
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

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!embeddingPipeline) {
      if (!embeddingPipelinePromise) {
        // Xenova/all-MiniLM-L6-v2 is a 384-dimensional model (fast and small)
        const loadEmbedding = pipeline as (
          task: "feature-extraction",
          model: string,
        ) => Promise<FeatureExtractionPipeline>;
        embeddingPipelinePromise = loadEmbedding("feature-extraction", "Xenova/all-MiniLM-L6-v2");
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
    console.error("Embedding generation failed, falling back to empty vector", error);
    // Return a dummy array if embedding fails so pipeline doesn't crash completely
    return new Array(384).fill(0);
  }
}

export async function generateCompletion(
  prompt: string,
  systemPrompt = "You are a professional technology journalist.",
): Promise<string> {
  const storeConfig = aiConfigStorage.getStore();
  const activeConfig = storeConfig || (await getActiveAIConfig());
  const client = getOpenAIClient(activeConfig);
  const model = activeConfig.model;

  try {
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
    console.error("Completion generation failed", error);
    throw new Error(
      `AI generation failed with model [${model}]: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
