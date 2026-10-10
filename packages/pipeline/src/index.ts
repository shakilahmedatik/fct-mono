// =============================================================================
// @repo/pipeline — Shared Pipeline Package
// Used by both apps/api (playground) and apps/worker (production)
// =============================================================================

// AI
export {
  type AIProviderConfig,
  aiConfigStorage,
  generateCompletion,
  generateEmbedding,
} from "./ai";
// Audio
export {
  AUDIO_PROVIDERS,
  generateAudio,
  getEnabledProviders,
  getProviderDefinition,
  isProviderConfigured,
} from "./audio";
// Sources
export {
  DEFAULT_SOURCES,
  fetchForemSignals,
  fetchGitHubSignals,
  fetchHackerNewsSignals,
  fetchRedditSignals,
  fetchRssFeedSignals,
  getAllCategories,
  getEnabledSources,
  getSeedFallbackSignals,
  type IngestionResult,
  ingestAllSources,
  ingestFromSources,
  mergeSourceConfig,
  parseRssXml,
  type SourceFetchResult,
} from "./sources";
// Stages
export {
  type AudioScriptOptions,
  calculateEngagementScore,
  calculateFreshnessScore,
  cleanUrl,
  clusterAndPersistStories,
  clusterSignalsInMemory,
  computeContentHash,
  cosineSimilarity,
  deserializeEmbedding,
  EMBEDDING_DIM,
  extractTopics,
  formatBlogDate,
  generateAndPersistBlogPost,
  generateBlogPreview,
  generateDailyAudioScript,
  generateWhyItMatters,
  normalizeSignals,
  processUserCohorts,
  type RankingOptions,
  rankAndSelectStories,
  SOURCE_WEIGHTS,
  serializeEmbedding,
} from "./stages";
// Types
export * from "./types";
