import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI } from "@google/genai";
import type { FeatureExtractionPipeline } from "@xenova/transformers";
import { pipeline } from "@xenova/transformers";
import OpenAI from "openai";

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

function getOpenAIClient(): OpenAI {
  const config = aiConfigStorage.getStore();

  const baseURL = config?.baseURL || process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey = config?.apiKey || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || "";

  if (config) {
    return new OpenAI({ baseURL, apiKey });
  }

  if (openaiClient) return openaiClient;

  openaiClient = new OpenAI({
    baseURL,
    apiKey,
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

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!embeddingPipeline) {
      // Xenova/all-mpnet-base-v2 is a 768-dimensional model
      embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2");
    }

    // Generate embeddings
    const output = await embeddingPipeline(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Embedding generation failed, falling back to empty vector", error);
    // Return a dummy array if embedding fails so pipeline doesn't crash completely
    return new Array(768).fill(0);
  }
}

export async function generateCompletion(
  prompt: string,
  systemPrompt = "You are a professional technology journalist.",
): Promise<string> {
  const client = getOpenAIClient();
  const config = aiConfigStorage.getStore();
  const model = config?.model || process.env.LLM_MODEL || "meta-llama/llama-3-8b-instruct:free";

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
      `AI generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
