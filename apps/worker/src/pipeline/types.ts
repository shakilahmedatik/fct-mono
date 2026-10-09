export type SourceName = "hackernews" | "github" | "reddit" | "forem" | "producthunt" | "rss";

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

export interface PipelineOptions {
  targetDate?: Date;
  limit?: number;
  triggerSource?: "cron" | "admin" | "manual";
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
  audioJobsEnqueued: number;
  errors: string[];
  durationMs: number;
}
