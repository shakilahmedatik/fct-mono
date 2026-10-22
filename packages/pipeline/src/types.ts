// =============================================================================
// Pipeline Types — Shared between API playground, Worker, and Admin dashboard
// =============================================================================

export type SourceName = "hackernews" | "github" | "reddit" | "forem" | "producthunt" | "rss";

// ---------------------------------------------------------------------------
// Source Configuration System
// ---------------------------------------------------------------------------

export interface SourceDefinition {
  id: string;
  name: string;
  type: SourceName;
  enabled: boolean;
  categories: string[];
  description: string;
  icon: string;
  config: SourceTypeConfig;
}

export type SourceTypeConfig =
  | HackerNewsSourceConfig
  | GitHubSourceConfig
  | RedditSourceConfig
  | ForemSourceConfig
  | RssSourceConfig;

export interface HackerNewsSourceConfig {
  type: "hackernews";
  limit: number;
  endpoint?: "topstories" | "beststories" | "newstories";
}

export interface GitHubSourceConfig {
  type: "github";
  topics: string[];
  perTopic: number;
  minStars?: number;
}

export interface RedditSourceConfig {
  type: "reddit";
  subreddits: string[];
  perSub: number;
}

export interface ForemSourceConfig {
  type: "forem";
  limit: number;
  baseUrl?: string;
}

export interface RssSourceConfig {
  type: "rss";
  feedUrl: string;
  limit: number;
}

// ---------------------------------------------------------------------------
// Signal Types
// ---------------------------------------------------------------------------

export interface RawSignal {
  source: SourceName;
  sourceItemId: string;
  title: string;
  url: string;
  summary?: string | null;
  publishedAt?: Date | string | null;
  upvotes?: number;
  comments?: number;
  topicHints?: string[];
}

export interface NormalizedSignal {
  id: string;
  source: SourceName;
  sourceItemId: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date;
  freshnessScore: number;
  engagementScore: number;
  topics: string[];
  contentHash: string;
  clusterId?: string;
}

export interface ClusteredStory {
  id: string;
  canonicalTitle: string;
  dominantSource: string;
  topics: string[];
  clusterId: string;
  embedding: Float32Array;
  signals: NormalizedSignal[];
  isExistingStory?: boolean;
}

export interface RankedStory {
  story: ClusteredStory;
  rankScore: number;
  whyItMatters: string;
  position: number;
}

// ---------------------------------------------------------------------------
// Audio Provider Types
// ---------------------------------------------------------------------------

export type AudioProviderName =
  | "elevenlabs"
  | "deepgram"
  | "openai"
  | "kokoro"
  | "google"
  | "playht";

export interface AudioProviderDefinition {
  id: AudioProviderName;
  name: string;
  description: string;
  enabled: boolean;
  envKeyName: string;
  defaultVoice: string;
  voices: AudioVoice[];
  supportedFormats: string[];
  freeTier: string;
  website: string;
}

export interface AudioVoice {
  id: string;
  name: string;
  description?: string;
  gender?: "male" | "female" | "neutral";
  accent?: string;
}

export interface AudioGenerationRequest {
  provider: AudioProviderName;
  script: string;
  voiceId: string;
  format?: string;
  speed?: number;
}

export interface AudioGenerationResult {
  provider: AudioProviderName;
  audioBuffer: Buffer;
  format: string;
  durationSec: number;
  sizeBytes: number;
  voiceId: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Pipeline Orchestration Types
// ---------------------------------------------------------------------------

export interface PipelineOptions {
  targetDate?: Date;
  limit?: number;
  triggerSource?: "cron" | "admin" | "manual" | "playground";
  userId?: string;
}

export interface PipelineReport {
  success: boolean;
  masterDigestId?: string;
  blogPostSlug?: string;
  itemsIngested: number;
  clustersFormed: number;
  storiesPersisted: number;
  digestItemsCreated: number;
  cohortsProcessed: number;
  /** Number of audio generation jobs that were really added to the queue. */
  audioJobsEnqueued: number;
  /** Number of delivery jobs that were really added to the queue. */
  deliveryJobsEnqueued?: number;
  /** True when the run had to fall back to degraded (seed) source content. */
  degraded?: boolean;
  errors: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Playground Session Types
// ---------------------------------------------------------------------------

export interface PlaygroundSession {
  id: string;
  createdAt: string;
  lastActivity: string;
  completedSteps: PlaygroundStep[];
  activeStep: PlaygroundStep | null;
  sourceConfig: SourceDefinition[];
  audioProvider: AudioProviderName;
}

export type PlaygroundStep =
  | "ingest"
  | "normalize"
  | "cluster"
  | "rank"
  | "digest"
  | "audio_script"
  | "audio_generate"
  | "blog"
  | "cohorts";

export interface StepResult<T = unknown> {
  step: PlaygroundStep;
  success: boolean;
  data: T;
  durationMs: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Serialization helpers for JSON transport (Float32Array)
// ---------------------------------------------------------------------------

export function serializeForTransport<T>(data: T): string {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Float32Array) {
      return { __type: "Float32Array", data: Array.from(value) };
    }
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
}

export function deserializeFromTransport<T>(json: string): T {
  return JSON.parse(json, (_key, value) => {
    if (value?.__type === "Float32Array" && Array.isArray(value.data)) {
      return new Float32Array(value.data);
    }
    if (value?.__type === "Date" && typeof value.value === "string") {
      return new Date(value.value);
    }
    return value;
  });
}

// ---------------------------------------------------------------------------
// WebSocket Message Types
// ---------------------------------------------------------------------------

export type WSOutboundMessage =
  | { type: "log"; level: "info" | "warn" | "error"; message: string; timestamp: string }
  | { type: "progress"; step: PlaygroundStep; percent: number; detail?: string }
  | {
      type: "step_complete";
      step: PlaygroundStep;
      duration: number;
      summary: Record<string, unknown>;
    }
  | {
      type: "queue_update";
      queue: string;
      counts: { waiting: number; active: number; completed: number; failed: number };
    }
  | { type: "connected"; sessionId: string };
