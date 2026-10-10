// =============================================================================
// Pipeline Playground API Routes
// Step-by-step pipeline execution with caching, WebSocket, and BullMQ dashboard
// =============================================================================

import { zValidator } from "@hono/zod-validator";
import { db, schema } from "@repo/db";
import {
  type AIProviderConfig,
  type AIProviderId,
  type AISettings,
  AUDIO_PROVIDERS,
  type AudioProviderId,
  type AudioScriptOptions,
  type AudioSettings,
  aiConfigStorage,
  type ClusteredStory,
  clusterSignalsInMemory,
  DEFAULT_SOURCES,
  deserializeFromTransport,
  generateAudio,
  generateBlogPreview,
  generateDailyAudioScript,
  getAIProviderStatuses,
  getAISettings,
  getAllCategories,
  getAudioProviderStatuses,
  getAudioSettings,
  ingestFromSources,
  isProviderConfigured,
  type NormalizedSignal,
  normalizeSignals,
  type RankedStory,
  type RankingOptions,
  type RawSignal,
  rankAndSelectStories,
  type SourceDefinition,
  saveAISettings,
  saveAudioSettings,
  serializeForTransport,
  testAIConnection,
} from "@repo/pipeline";
import { Hono } from "hono";
import { z } from "zod";
import { audioQueue } from "../../lib/queue-client";
import { logger } from "../../middleware/logger";
import type { AppBindings } from "../../types";
import { cacheClear, cacheGet, cacheSet, getCacheStatus, listAllSessions } from "./cache";
import { cleanQueue, getAllQueueStatuses, getQueueJobs, retryFailedJob } from "./queue-inspector";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal HTML-entity escaper for safe interpolation into template literals. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const sessionIdSchema = z.object({ sessionId: z.string().min(1) });

const ingestSchema = z.object({
  sessionId: z.string().min(1),
  // Each override is a partial SourceDefinition. Today the playground only flips
  // `enabled`, but we allow id+enabled (and the union-typed config for custom RSS)
  // so the Add Custom RSS flow stays valid.
  sourceOverrides: z
    .array(
      z
        .object({
          id: z.string().min(1),
          enabled: z.boolean().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
          categories: z.array(z.string()).optional(),
          name: z.string().optional(),
        })
        .passthrough(),
    )
    .optional(),
  categoryFilter: z.array(z.string()).optional(),
});

const normalizeSchema = z.object({ sessionId: z.string().min(1) });

const clusterSchema = z.object({
  sessionId: z.string().min(1),
  clusterThreshold: z.number().min(0).max(1).optional(),
});

const rankSchema = z.object({
  sessionId: z.string().min(1),
  limit: z.number().min(1).max(20).optional(),
  preferredTopics: z.array(z.string()).optional(),
  engagementWeight: z.number().min(0).max(1).optional(),
  freshnessWeight: z.number().min(0).max(1).optional(),
  sourceWeights: z.record(z.string(), z.number()).optional(),
  maxPerSource: z.number().min(1).max(10).optional(),
  maxPerTopic: z.number().min(1).max(10).optional(),
});

const audioScriptSchema = z.object({
  sessionId: z.string().min(1),
  targetMinDuration: z.number().optional(),
  targetMaxDuration: z.number().optional(),
  introTemplate: z.string().optional(),
  outroTemplate: z.string().optional(),
  wordsPerMinute: z.number().optional(),
});

const audioGenerateSchema = z.object({
  sessionId: z.string().min(1),
  provider: z.enum(["elevenlabs", "deepgram", "openai", "kokoro", "google", "playht"]),
  voiceId: z.string().min(1),
  format: z.string().optional(),
  speed: z.number().optional(),
});

const digestSchema = z.object({
  sessionId: z.string().min(1),
  persist: z.boolean().optional(),
});

const blogSchema = z.object({
  sessionId: z.string().min(1),
  persist: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const playgroundRouter = new Hono<AppBindings>()

  .use("*", async (c, next) => {
    const aiConfigStr = c.req.header("x-ai-provider");
    let aiConfig: AIProviderConfig | undefined;
    if (aiConfigStr) {
      try {
        aiConfig = JSON.parse(aiConfigStr);
      } catch {
        // ignore
      }
    }
    if (aiConfig) {
      return await aiConfigStorage.run(aiConfig, next);
    }
    return await next();
  })

  // ── Sources Configuration ─────────────────────────────────────────────────
  .get("/sources", async (c) => {
    const categories = getAllCategories(DEFAULT_SOURCES);
    const configuredProviders = AUDIO_PROVIDERS.map((p) => ({
      ...p,
      isConfigured: isProviderConfigured(p.id),
    }));
    const aiSettings = await getAISettings();
    const aiProviders = getAIProviderStatuses(aiSettings);
    const audioSettings = await getAudioSettings();
    const audioStatuses = getAudioProviderStatuses(audioSettings);

    return c.json({
      sources: DEFAULT_SOURCES,
      categories,
      audioProviders: configuredProviders,
      aiSettings,
      aiProviders,
      audioSettings,
      audioStatuses,
    });
  })

  // ── AI Provider Management ────────────────────────────────────────────────
  .get("/ai/settings", async (c) => {
    const settings = await getAISettings();
    const providers = getAIProviderStatuses(settings);
    return c.json({ success: true, settings, providers });
  })

  .post("/ai/settings", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { activeProvider, model } = body as {
      activeProvider?: AIProviderId;
      model?: string;
    };
    const updates: Partial<AISettings> = {};
    if (activeProvider) updates.activeProvider = activeProvider;
    if (typeof model === "string") updates.model = model.trim();

    const settings = await saveAISettings(updates);
    const providers = getAIProviderStatuses(settings);
    return c.json({ success: true, settings, providers });
  })

  .post("/ai/test", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { providerId, model } = body as {
      providerId?: AIProviderId;
      model?: string;
    };
    const settings = await getAISettings();
    const targetProvider = providerId || settings.activeProvider;
    const result = await testAIConnection(targetProvider, model);
    return c.json(result);
  })

  // ── Audio / Voice Provider Management ─────────────────────────────────────
  .get("/audio/settings", async (c) => {
    const settings = await getAudioSettings();
    const providers = getAudioProviderStatuses(settings);
    return c.json({ success: true, settings, providers });
  })

  .post("/audio/settings", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { provider, deepgramModel, elevenlabsVoiceId, kokoroVoiceId, openaiVoiceId } = body as {
      provider?: AudioProviderId;
      deepgramModel?: string;
      elevenlabsVoiceId?: string;
      kokoroVoiceId?: string;
      openaiVoiceId?: string;
    };
    const updates: Partial<AudioSettings> = {};
    if (provider) updates.provider = provider;
    if (typeof deepgramModel === "string") updates.deepgramModel = deepgramModel.trim();
    if (typeof elevenlabsVoiceId === "string") updates.elevenlabsVoiceId = elevenlabsVoiceId.trim();
    if (typeof kokoroVoiceId === "string") updates.kokoroVoiceId = kokoroVoiceId.trim();
    if (typeof openaiVoiceId === "string") updates.openaiVoiceId = openaiVoiceId.trim();

    const settings = await saveAudioSettings(updates);
    const providers = getAudioProviderStatuses(settings);
    return c.json({ success: true, settings, providers });
  })

  .post("/audio/test", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { provider, script, voiceId } = body as {
      provider?: AudioProviderId;
      script?: string;
      voiceId?: string;
    };
    const settings = await getAudioSettings();
    const targetProvider = provider || settings.provider;

    const testScript =
      (script || "").trim() ||
      "Good morning. This is your First Cup Tech daily executive briefing. AI architecture breakthroughs curated for founders. Have a focused build day.";

    let targetVoiceId = voiceId;
    if (!targetVoiceId) {
      if (targetProvider === "elevenlabs")
        targetVoiceId = settings.elevenlabsVoiceId || "JBFqnCBsd6RMkjVDRZzb";
      else if (targetProvider === "deepgram")
        targetVoiceId = settings.deepgramModel || "aura-asteria-en";
      else if (targetProvider === "kokoro") targetVoiceId = settings.kokoroVoiceId || "af_bella";
      else if (targetProvider === "openai") targetVoiceId = settings.openaiVoiceId || "alloy";
    }
    const resolvedVoiceId = targetVoiceId || "default";

    try {
      const result = await generateAudio({
        provider: targetProvider,
        script: testScript,
        voiceId: resolvedVoiceId,
        format: "mp3",
      });

      const audioBase64 = result.audioBuffer.toString("base64");
      return c.json({
        success: true,
        provider: targetProvider,
        voiceId: resolvedVoiceId,
        durationSec: result.durationSec,
        sizeBytes: result.sizeBytes,
        audioBase64,
        message: `Successfully synthesized audio using ${targetProvider.toUpperCase()} (${targetVoiceId})!`,
      });
    } catch (err: unknown) {
      return c.json(
        {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  })

  // ── Session Management ────────────────────────────────────────────────────
  .post("/session/create", async (c) => {
    const sessionId = crypto.randomUUID();
    // Cache empty status to register session in global list immediately
    await cacheSet(sessionId, "_meta", JSON.stringify({ lastActivity: new Date().toISOString() }));
    return c.json({ sessionId, createdAt: new Date().toISOString() });
  })

  .get("/sessions", async (c) => {
    const sessions = await listAllSessions();
    return c.json({ sessions });
  })

  .get("/session/:sessionId/status", async (c) => {
    const sessionId = c.req.param("sessionId");
    const status = await getCacheStatus(sessionId);
    return c.json(status);
  })

  .delete("/session/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    await cacheClear(sessionId);
    return c.json({ cleared: true });
  })

  // ── Tier 1: Ingest ───────────────────────────────────────────────────────
  .post("/tier1/ingest", zValidator("json", ingestSchema), async (c) => {
    const { sessionId, sourceOverrides, categoryFilter } = c.req.valid("json");
    const startedAt = Date.now();

    try {
      const result = await ingestFromSources(
        sourceOverrides as Partial<SourceDefinition>[] | undefined,
        categoryFilter,
      );

      // Cache the raw signals
      await cacheSet(sessionId, "tier1_raw", serializeForTransport(result.signals));
      await cacheSet(
        sessionId,
        "tier1_meta",
        JSON.stringify({
          sourceResults: result.sourceResults,
          totalDurationMs: result.totalDurationMs,
          signalCount: result.signals.length,
          timestamp: new Date().toISOString(),
        }),
      );

      return c.json({
        success: true,
        step: "ingest",
        data: {
          signalCount: result.signals.length,
          sourceResults: result.sourceResults,
          totalDurationMs: result.totalDurationMs,
          signals: result.signals.slice(0, 100), // Limit payload for large datasets
        },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "ingest",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  .get("/tier1/cached/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const cached = await cacheGet(sessionId, "tier1_raw");
    const meta = await cacheGet(sessionId, "tier1_meta");

    if (!cached) {
      return c.json({ cached: false, data: null });
    }

    const signals = deserializeFromTransport<RawSignal[]>(cached);
    return c.json({
      cached: true,
      data: {
        signals: signals.slice(0, 100),
        totalSignals: signals.length,
        meta: meta ? JSON.parse(meta) : null,
      },
    });
  })

  // ── Tier 2a: Normalize ────────────────────────────────────────────────────
  .post("/tier2/normalize", zValidator("json", normalizeSchema), async (c) => {
    const { sessionId } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier1_raw");
    if (!cached) {
      return c.json({ success: false, error: "No cached Tier 1 data. Run ingest first." }, 400);
    }

    try {
      const rawSignals = deserializeFromTransport<RawSignal[]>(cached);
      const normalized = await normalizeSignals(rawSignals);

      await cacheSet(sessionId, "tier2_normalized", serializeForTransport(normalized));

      // Compute topic distribution
      const topicDist: Record<string, number> = {};
      const sourceDist: Record<string, number> = {};
      for (const sig of normalized) {
        for (const t of sig.topics) topicDist[t] = (topicDist[t] || 0) + 1;
        sourceDist[sig.source] = (sourceDist[sig.source] || 0) + 1;
      }

      return c.json({
        success: true,
        step: "normalize",
        data: {
          inputCount: rawSignals.length,
          outputCount: normalized.length,
          deduplicatedCount: rawSignals.length - normalized.length,
          topicDistribution: topicDist,
          sourceDistribution: sourceDist,
          avgFreshness: normalized.reduce((s, n) => s + n.freshnessScore, 0) / normalized.length,
          avgEngagement: normalized.reduce((s, n) => s + n.engagementScore, 0) / normalized.length,
          signals: normalized.slice(0, 50),
        },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "normalize",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 2b: Cluster ──────────────────────────────────────────────────────
  .post("/tier2/cluster", zValidator("json", clusterSchema), async (c) => {
    const { sessionId, clusterThreshold } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier2_normalized");
    if (!cached) {
      return c.json(
        { success: false, error: "No cached normalized data. Run normalize first." },
        400,
      );
    }

    try {
      const normalized = deserializeFromTransport<NormalizedSignal[]>(cached);
      const clusters = await clusterSignalsInMemory(normalized, clusterThreshold ?? 0.75);

      await cacheSet(sessionId, "tier2_clusters", serializeForTransport(clusters));

      return c.json({
        success: true,
        step: "cluster",
        data: {
          inputSignals: normalized.length,
          clustersFormed: clusters.length,
          clusterThreshold: clusterThreshold ?? 0.75,
          clusters: clusters.map((c) => ({
            id: c.id,
            canonicalTitle: c.canonicalTitle,
            dominantSource: c.dominantSource,
            topics: c.topics,
            signalCount: c.signals.length,
            isExistingStory: c.isExistingStory,
          })),
        },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "cluster",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3: Rank ──────────────────────────────────────────────────────────
  .post("/tier3/rank", zValidator("json", rankSchema), async (c) => {
    const { sessionId, limit, ...rankOpts } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier2_clusters");
    if (!cached) {
      return c.json({ success: false, error: "No cached cluster data. Run cluster first." }, 400);
    }

    try {
      const clusters = deserializeFromTransport<ClusteredStory[]>(cached);
      const options: RankingOptions = {
        preferredTopics: rankOpts.preferredTopics,
        engagementWeight: rankOpts.engagementWeight,
        freshnessWeight: rankOpts.freshnessWeight,
        sourceWeights: rankOpts.sourceWeights,
        maxPerSource: rankOpts.maxPerSource,
        maxPerTopic: rankOpts.maxPerTopic,
      };

      const ranked = await rankAndSelectStories(clusters, limit ?? 6, options);
      await cacheSet(sessionId, "tier3_ranked", serializeForTransport(ranked));

      return c.json({
        success: true,
        step: "rank",
        data: {
          inputClusters: clusters.length,
          selectedStories: ranked.length,
          limit: limit ?? 6,
          stories: ranked.map((r) => ({
            position: r.position,
            title: r.story.canonicalTitle,
            dominantSource: r.story.dominantSource,
            topics: r.story.topics,
            rankScore: r.rankScore,
            whyItMatters: r.whyItMatters,
            signalCount: r.story.signals.length,
          })),
        },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "rank",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3: Digest (Insert/Preview) ────────────────────────────────────────
  .post("/tier3/digest", zValidator("json", digestSchema), async (c) => {
    const { sessionId, persist } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier3_ranked");
    if (!cached) {
      return c.json({ success: false, error: "No cached ranked data. Run rank first." }, 400);
    }

    try {
      const ranked = deserializeFromTransport<RankedStory[]>(cached);
      const now = new Date();
      const formattedDateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const digestData = {
        id: crypto.randomUUID(),
        title: `Master Tech Briefing — ${formattedDateStr}`,
        digestDate: now.toISOString(),
        itemCount: ranked.length,
        items: ranked.map((r) => ({
          storyId: r.story.id,
          title: r.story.canonicalTitle,
          url: r.story.signals[0]?.url || "https://firstcup.tech",
          source: r.story.dominantSource,
          summary: r.story.signals[0]?.summary || "Curated technology briefing.",
          whyItMatters: r.whyItMatters,
          rankScore: r.rankScore,
          position: r.position,
          topics: r.story.topics,
        })),
      };

      if (persist) {
        // Actually persist to DB
        await db.insert(schema.digests).values({
          id: digestData.id,
          userId: null,
          digestType: "daily_audio",
          status: "generated",
          title: digestData.title,
          digestDate: now,
          generatedAt: new Date(),
          isMaster: true,
        });

        for (const item of ranked) {
          const topSig = item.story.signals[0];
          await db.insert(schema.digestItems).values({
            id: crypto.randomUUID(),
            digestId: digestData.id,
            storyId: item.story.id,
            title: item.story.canonicalTitle,
            url: topSig?.url || "https://firstcup.tech",
            source: item.story.dominantSource,
            summary: topSig?.summary || "Curated technology briefing.",
            whyItMatters: item.whyItMatters,
            rankScore: item.rankScore,
            position: item.position,
            topics: item.story.topics,
            publishedAt: topSig?.publishedAt || now,
          });
        }
      }

      await cacheSet(sessionId, "tier3_digest", JSON.stringify(digestData));

      return c.json({
        success: true,
        step: "digest",
        persisted: persist ?? false,
        data: digestData,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "digest",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3c: Audio Script ────────────────────────────────────────────────
  .post("/tier3/audio-script", zValidator("json", audioScriptSchema), async (c) => {
    const { sessionId, ...scriptOpts } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier3_ranked");
    if (!cached) {
      return c.json({ success: false, error: "No cached ranked data. Run rank first." }, 400);
    }

    try {
      const ranked = deserializeFromTransport<RankedStory[]>(cached);
      const options: AudioScriptOptions = {
        targetMinDuration: scriptOpts.targetMinDuration,
        targetMaxDuration: scriptOpts.targetMaxDuration,
        introTemplate: scriptOpts.introTemplate,
        outroTemplate: scriptOpts.outroTemplate,
        wordsPerMinute: scriptOpts.wordsPerMinute,
      };

      const { script, durationSec, wordCount } = await generateDailyAudioScript(
        ranked,
        new Date(),
        options,
      );

      await cacheSet(
        sessionId,
        "tier3_audio_script",
        JSON.stringify({ script, durationSec, wordCount }),
      );

      return c.json({
        success: true,
        step: "audio_script",
        data: { script, durationSec, wordCount },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "audio_script",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3d: Audio Generation ────────────────────────────────────────────
  .post("/tier3/audio-generate", zValidator("json", audioGenerateSchema), async (c) => {
    const { sessionId, provider, voiceId, format, speed } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier3_audio_script");
    if (!cached) {
      return c.json(
        { success: false, error: "No cached audio script. Generate script first." },
        400,
      );
    }

    try {
      const { script } = JSON.parse(cached) as { script: string };

      const result = await generateAudio({
        provider,
        script,
        voiceId,
        format,
        speed,
      });

      // Store audio as base64 in cache (for download)
      const audioBase64 = result.audioBuffer.toString("base64");
      await cacheSet(
        sessionId,
        "tier3_audio_file",
        JSON.stringify({
          base64: audioBase64,
          format: result.format,
          provider: result.provider,
          voiceId: result.voiceId,
          durationSec: result.durationSec,
          sizeBytes: result.sizeBytes,
        }),
      );

      return c.json({
        success: true,
        step: "audio_generate",
        data: {
          provider: result.provider,
          voiceId: result.voiceId,
          format: result.format,
          durationSec: result.durationSec,
          sizeBytes: result.sizeBytes,
          audioBase64,
        },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      logger.error(err, "Audio generation failed");
      return c.json(
        {
          success: false,
          step: "audio_generate",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3e: Blog Post ──────────────────────────────────────────────────
  .post("/tier3/blog", zValidator("json", blogSchema), async (c) => {
    const { sessionId, persist } = c.req.valid("json");
    const startedAt = Date.now();

    const cached = await cacheGet(sessionId, "tier3_ranked");
    if (!cached) {
      return c.json({ success: false, error: "No cached ranked data. Run rank first." }, 400);
    }

    try {
      const ranked = deserializeFromTransport<RankedStory[]>(cached);
      const preview = await generateBlogPreview(ranked, new Date());

      await cacheSet(sessionId, "tier3_blog", JSON.stringify(preview));

      if (persist) {
        // Import and call the persist function dynamically
        const { generateAndPersistBlogPost } = await import("@repo/pipeline");
        await generateAndPersistBlogPost(ranked, new Date());
      }

      return c.json({
        success: true,
        step: "blog",
        persisted: persist ?? false,
        data: preview,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "blog",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3f: Email Template Preview ─────────────────────────────────────────
  .post("/tier3/email", zValidator("json", blogSchema), async (c) => {
    const { sessionId } = c.req.valid("json");
    const startedAt = Date.now();

    // Reuse the blog preview from the prior /tier3/blog step when present — it
    // already produced the same content via an LLM call. Only generate a fresh
    // one when the user explicitly skipped the blog step.
    const ranked = await cacheGet(sessionId, "tier3_ranked");
    if (!ranked) {
      return c.json({ success: false, error: "No cached ranked data. Run rank first." }, 400);
    }

    try {
      let preview: {
        title: string;
        slug: string;
        excerpt: string;
        contentHtml: string;
        tags: string[];
      };

      const cachedBlog = await cacheGet(sessionId, "tier3_blog");
      if (cachedBlog) {
        preview = JSON.parse(cachedBlog);
      } else {
        const rankedStories = deserializeFromTransport<RankedStory[]>(ranked);
        preview = await generateBlogPreview(rankedStories, new Date());
        await cacheSet(sessionId, "tier3_blog", JSON.stringify(preview));
      }

      const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; border: 1px solid #eaeaea; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { color: #666; margin-top: 5px; font-size: 14px; }
            .content article { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .content h3 { font-size: 20px; margin-top: 0; margin-bottom: 10px; color: #111; }
            .content a { color: #0066cc; text-decoration: none; }
            .content a:hover { text-decoration: underline; }
            .why-matters { background: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #0066cc; }
            .why-matters strong { display: block; font-size: 12px; text-transform: uppercase; color: #0066cc; margin-bottom: 5px; }
            .footer { text-align: center; font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>First Cup Tech</h1>
              <p>${escapeHtml(preview.title)}</p>
            </div>
            <div class="content">
              <p style="font-size: 16px; color: #555; margin-bottom: 25px;">${escapeHtml(preview.excerpt)}</p>
              ${preview.contentHtml}
            </div>
            <div class="footer">
              <p>You're receiving this because you're subscribed to the First Cup Tech daily briefing.</p>
              <p>© ${new Date().getFullYear()} First Cup Tech</p>
            </div>
          </div>
        </body>
      </html>
      `;

      // Cache the email render so it survives session reload.
      await cacheSet(sessionId, "tier3_email", JSON.stringify({ html: emailHtml }));

      return c.json({
        success: true,
        step: "email",
        reusedBlog: Boolean(cachedBlog),
        data: { html: emailHtml },
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "email",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        },
        500,
      );
    }
  })

  // ── Tier 3d (Queue): Enqueue Audio Job ─────────────────────────────────
  .post("/tier3/audio-enqueue", zValidator("json", sessionIdSchema), async (c) => {
    const { sessionId } = c.req.valid("json");

    const digestCached = await cacheGet(sessionId, "tier3_digest");
    if (!digestCached) {
      return c.json({ success: false, error: "No digest created. Run digest step first." }, 400);
    }

    try {
      const digest = JSON.parse(digestCached);
      const job = await audioQueue.add("generate-audio", { digestId: digest.id });

      return c.json({
        success: true,
        step: "audio_enqueue",
        data: { jobId: job.id, digestId: digest.id, queueName: "audio-generation" },
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "audio_enqueue",
          error: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  })

  // ── Tier 4: Enqueue Prod Job ──────────────────────────────────────────────
  .post("/tier4/enqueue-prod", zValidator("json", sessionIdSchema), async (c) => {
    const { sessionId } = c.req.valid("json");
    const rawAiConfig = c.req.header("x-ai-provider");
    let aiConfig: AIProviderConfig | undefined;
    if (rawAiConfig) {
      try {
        aiConfig = JSON.parse(rawAiConfig);
      } catch {}
    }

    try {
      const { digestQueue } = await import("../../lib/queue-client");
      const job = await digestQueue.add("generate-digest", {
        type: "admin",
        force: true,
        // Pass sessionId so the worker / dashboard can correlate the queue job
        // back to the playground run that triggered it.
        sourceSessionId: sessionId,
        aiConfig,
      });

      return c.json({
        success: true,
        step: "enqueue_prod",
        data: { jobId: job.id, queueName: "digest-pipeline", sessionId },
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          step: "enqueue_prod",
          error: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  })

  // ── Cache Status / Clear ──────────────────────────────────────────────────
  .get("/cache/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const status = await getCacheStatus(sessionId);
    return c.json(status);
  })

  .delete("/cache/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    await cacheClear(sessionId);
    return c.json({ cleared: true });
  })

  // ── BullMQ Dashboard ─────────────────────────────────────────────────────
  .get("/queues/status", async (c) => {
    const statuses = await getAllQueueStatuses();
    return c.json({ queues: statuses });
  })

  .get("/queues/:name/jobs", async (c) => {
    const name = c.req.param("name");
    const status =
      (c.req.query("status") as "waiting" | "active" | "completed" | "failed" | "delayed") ||
      "completed";
    const limit = Number(c.req.query("limit")) || 20;
    const jobs = await getQueueJobs(name, status, limit);
    return c.json({ jobs });
  })

  .post("/queues/:name/jobs/:jobId/retry", async (c) => {
    const name = c.req.param("name");
    const jobId = c.req.param("jobId");
    const success = await retryFailedJob(name, jobId);
    return c.json({ success });
  })

  .post("/queues/:name/clean", async (c) => {
    const name = c.req.param("name");
    const status = (c.req.query("status") as "completed" | "failed") || "completed";
    const removed = await cleanQueue(name, status);
    return c.json({ removed });
  })

  // ── Data Export ─────────────────────────────────────────────────────────
  .get("/export/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");

    const [
      rawData,
      normalizedData,
      clusterData,
      rankedData,
      digestData,
      audioScript,
      blogData,
      audioFile,
      emailData,
    ] = await Promise.all([
      cacheGet(sessionId, "tier1_raw"),
      cacheGet(sessionId, "tier2_normalized"),
      cacheGet(sessionId, "tier2_clusters"),
      cacheGet(sessionId, "tier3_ranked"),
      cacheGet(sessionId, "tier3_digest"),
      cacheGet(sessionId, "tier3_audio_script"),
      cacheGet(sessionId, "tier3_blog"),
      cacheGet(sessionId, "tier3_audio_file"),
      cacheGet(sessionId, "tier3_email"),
    ]);

    const audioMeta = audioFile
      ? (() => {
          const parsed = JSON.parse(audioFile) as {
            format: string;
            provider: string;
            voiceId: string;
            durationSec: number;
            sizeBytes: number;
          };
          return {
            format: parsed.format,
            provider: parsed.provider,
            voiceId: parsed.voiceId,
            durationSec: parsed.durationSec,
            sizeBytes: parsed.sizeBytes,
          };
        })()
      : null;

    return c.json({
      sessionId,
      exportedAt: new Date().toISOString(),
      tier1: rawData
        ? { signalCount: deserializeFromTransport<RawSignal[]>(rawData).length }
        : null,
      tier2_normalized: normalizedData
        ? { signalCount: deserializeFromTransport<NormalizedSignal[]>(normalizedData).length }
        : null,
      tier2_clusters: clusterData
        ? { clusterCount: deserializeFromTransport<ClusteredStory[]>(clusterData).length }
        : null,
      tier3_ranked: rankedData
        ? JSON.parse(serializeForTransport(deserializeFromTransport(rankedData)))
        : null,
      tier3_digest: digestData ? JSON.parse(digestData) : null,
      tier3_audio_script: audioScript ? JSON.parse(audioScript) : null,
      tier3_blog: blogData ? JSON.parse(blogData) : null,
      tier3_audio_file: audioMeta,
      tier3_email: emailData ? JSON.parse(emailData) : null,
    });
  })

  // ── Audio File Download ────────────────────────────────────────────────
  .get("/audio/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const cached = await cacheGet(sessionId, "tier3_audio_file");

    if (!cached) {
      return c.json({ error: "No audio file cached for this session." }, 404);
    }

    const { base64, format } = JSON.parse(cached);
    const buffer = Buffer.from(base64, "base64");

    // Map provider-specific format strings to proper MIME types / extensions.
    const f = (format || "").toLowerCase();
    let contentType = "audio/mpeg";
    let ext = "mp3";
    if (f === "wav" || f === "pcm") {
      contentType = "audio/wav";
      ext = "wav";
    } else if (f === "opus") {
      contentType = "audio/opus";
      ext = "opus";
    } else if (f === "flac") {
      contentType = "audio/flac";
      ext = "flac";
    } else if (f === "aac" || f === "m4a") {
      contentType = "audio/aac";
      ext = "m4a";
    } else if (f === "mp3" || f.startsWith("mp3_")) {
      contentType = "audio/mpeg";
      ext = "mp3";
    } else if (f === "linear16" || f === "mulaw" || f === "alaw") {
      // Raw PCM formats — serve as wav so browsers can attempt playback
      contentType = "audio/wav";
      ext = "wav";
    }

    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="briefing.${ext}"`);
    c.header("Content-Length", String(buffer.length));

    return c.body(buffer);
  });
