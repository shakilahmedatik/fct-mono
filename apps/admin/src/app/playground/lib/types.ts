// =============================================================================
// Playground shared types
// =============================================================================

export type PlaygroundStep =
  | "ingest"
  | "normalize"
  | "cluster"
  | "rank"
  | "digest"
  | "audio_script"
  | "audio_generate"
  | "blog"
  | "email"
  | "enqueue_prod";

export interface StepDef {
  id: PlaygroundStep;
  tier: number;
  label: string;
  description: string;
  icon: string;
}

export interface SourceDef {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  categories: string[];
  description: string;
  icon: string;
  config: Record<string, unknown>;
}

export interface AudioProviderDef {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultVoice: string;
  voices: { id: string; name: string; description?: string; gender?: string }[];
  supportedFormats: string[];
  freeTier: string;
  website: string;
  isConfigured: boolean;
}

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: string;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface AiConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export type AIProviderId = "local" | "openrouter" | "openai" | "gemini" | "anthropic";

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

export type AudioProviderId = "elevenlabs" | "deepgram" | "kokoro" | "openai";

export interface AudioSettings {
  provider: AudioProviderId;
  deepgramModel: string;
  elevenlabsVoiceId?: string;
  kokoroVoiceId?: string;
  openaiVoiceId?: string;
}

export interface AudioVoiceOption {
  id: string;
  name: string;
  description?: string;
}

export interface AudioProviderStatus {
  id: AudioProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  isAvailable: boolean;
  isActive: boolean;
  missingRequirements?: string[];
  activeModelOrVoice?: string;
  availableVoices: AudioVoiceOption[];
}

export interface PipelineParameters {
  clusterThreshold: number;
  rankLimit: number;
  targetMinDuration: number;
  targetMaxDuration: number;
  selectedProvider: string;
  selectedVoice: string;
}

export interface ParameterPreset {
  id: string;
  name: string;
  params: PipelineParameters;
  createdAt: string;
}

// Ordered pipeline steps — single source of truth used by the UI, status
// computation, "run all", and downstream-invalidation logic.
export const PIPELINE_STEP_IDS: PlaygroundStep[] = [
  "ingest",
  "normalize",
  "cluster",
  "rank",
  "digest",
  "audio_script",
  "audio_generate",
  "blog",
  "email",
  "enqueue_prod",
];

export const STEPS: StepDef[] = [
  { id: "ingest", tier: 1, label: "Ingest", description: "Crawl data sources", icon: "📡" },
  { id: "normalize", tier: 2, label: "Normalize", description: "Clean & score signals", icon: "⚙️" },
  { id: "cluster", tier: 2, label: "Cluster", description: "Group into stories", icon: "🧬" },
  { id: "rank", tier: 3, label: "Rank", description: "Score & select top", icon: "📊" },
  { id: "digest", tier: 3, label: "Digest", description: "Create master digest", icon: "📋" },
  { id: "audio_script", tier: 3, label: "Audio Script", description: "Generate script", icon: "🎙️" },
  {
    id: "audio_generate",
    tier: 3,
    label: "Generate Audio",
    description: "TTS synthesis",
    icon: "🔊",
  },
  { id: "blog", tier: 3, label: "Blog Post", description: "Generate blog", icon: "📰" },
  { id: "email", tier: 3, label: "Email Preview", description: "Email HTML", icon: "📧" },
  {
    id: "enqueue_prod",
    tier: 4,
    label: "Run Autonomous Pipeline",
    description: "Send to BullMQ",
    icon: "🚀",
  },
];

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
