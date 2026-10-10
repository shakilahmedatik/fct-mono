"use client";

import type { AiConfig } from "../lib/types";

interface Props {
  aiConfig: AiConfig;
  setAiConfig: (cfg: AiConfig) => void;
}

const PRESETS: Array<{ label: string; cfg: AiConfig }> = [
  {
    label: "Default OpenRouter",
    cfg: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: "",
      model: "meta-llama/llama-3-8b-instruct:free",
    },
  },
  {
    label: "Local Ollama",
    cfg: {
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
      model: "llama3",
    },
  },
  {
    label: "OpenAI",
    cfg: {
      baseURL: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o-mini",
    },
  },
];

export function AiConfigPanel({ aiConfig, setAiConfig }: Props) {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-blue-400">LLM Provider Configuration</h3>
        <span className="text-xs text-muted-foreground">
          Overrides .env values for this session
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="ai-base-url"
            className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block"
          >
            Base URL
          </label>
          <input
            id="ai-base-url"
            type="text"
            placeholder="https://openrouter.ai/api/v1"
            value={aiConfig.baseURL}
            onChange={(e) => setAiConfig({ ...aiConfig, baseURL: e.target.value })}
            className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground"
          />
        </div>
        <div>
          <label
            htmlFor="ai-api-key"
            className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block"
          >
            API Key
          </label>
          <input
            id="ai-api-key"
            type="password"
            placeholder="sk-or-v1-..."
            value={aiConfig.apiKey}
            onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
            className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground"
          />
        </div>
        <div>
          <label
            htmlFor="ai-model"
            className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block"
          >
            Model
          </label>
          <input
            id="ai-model"
            type="text"
            placeholder="meta-llama/llama-3-8b-instruct:free"
            value={aiConfig.model}
            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
            className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setAiConfig({ ...p.cfg })}
            className="text-xs px-2 py-1 rounded bg-muted/60 hover:bg-muted"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
