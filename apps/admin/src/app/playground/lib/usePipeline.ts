// =============================================================================
// usePipeline — single hook that owns all playground state and step execution
// =============================================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSession as apiClearSession,
  apiPost,
  createNewSession,
  exportSession,
  fetchAISettings,
  fetchAudioSettings,
  getSessionStatus,
  listPastSessions,
  loadQueueStatuses,
  loadSources,
} from "./api";
import {
  type AIProviderStatus,
  type AISettings,
  type AudioProviderDef,
  type AudioProviderStatus,
  type AudioSettings,
  type LogEntry,
  type ParameterPreset,
  PIPELINE_STEP_IDS,
  type PipelineParameters,
  type PlaygroundStep,
  type QueueStatus,
  type SourceDef,
  STEPS,
} from "./types";

export type StepStatus = "completed" | "active" | "available" | "locked";

const DEFAULT_PARAMS: PipelineParameters = {
  clusterThreshold: 0.75,
  rankLimit: 6,
  targetMinDuration: 120,
  targetMaxDuration: 180,
  selectedProvider: "elevenlabs",
  selectedVoice: "",
};

const DEFAULT_AI_CONFIG = { baseURL: "", apiKey: "", model: "" };

// =============================================================================
// Helpers
// =============================================================================

function loadAiConfigFromStorage(): { baseURL: string; apiKey: string; model: string } {
  try {
    const raw = localStorage.getItem("fct_playground_ai_config");
    if (raw) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_AI_CONFIG;
}

function loadSourcesFromStorage(): SourceDef[] | null {
  try {
    const raw = localStorage.getItem("fct_playground_sources");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function loadPresetsFromStorage(): ParameterPreset[] {
  try {
    const raw = localStorage.getItem("fct_playground_presets");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// =============================================================================
// Hook
// =============================================================================

export function usePipeline() {
  // --- Core session state ---
  const [sessionId, setSessionId] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<Set<PlaygroundStep>>(new Set());
  const [activeStep, setActiveStep] = useState<PlaygroundStep | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, unknown>>({});

  // --- Logs ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsScrolledUpRef = useRef(false);
  const [logsScrolledUp, setLogsScrolledUp] = useState(false);
  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { level, message, timestamp: new Date().toISOString() }]);
  }, []);

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState<"data" | "logs" | "output">("data");
  const [outputTab, setOutputTab] = useState<"blog" | "email" | "audio" | "digest" | "dataset">(
    "blog",
  );
  const [inspectorStep, setInspectorStep] = useState<PlaygroundStep | null>(null);

  // --- Sources & providers ---
  const [sources, setSources] = useState<SourceDef[]>([]);
  const [audioProviders, setAudioProviders] = useState<AudioProviderDef[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showSourceConfig, setShowSourceConfig] = useState(false);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [showAudioConfig, setShowAudioConfig] = useState(false);

  // --- AI Settings & Introspection ---
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiProviders, setAiProviders] = useState<AIProviderStatus[]>([]);

  // --- Audio Settings & Introspection ---
  const [audioSettings, setAudioSettings] = useState<AudioSettings | null>(null);
  const [audioStatuses, setAudioStatuses] = useState<AudioProviderStatus[]>([]);

  // --- AI config ---
  const [aiConfig, setAiConfig] = useState(DEFAULT_AI_CONFIG);

  // --- Pipeline parameters ---
  const [params, setParams] = useState<PipelineParameters>(DEFAULT_PARAMS);
  const updateParam = useCallback(
    <K extends keyof PipelineParameters>(key: K, value: PipelineParameters[K]) => {
      setParams((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  // --- Presets ---
  const [presets, setPresets] = useState<ParameterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>("");

  // --- Past sessions ---
  const [pastSessions, setPastSessions] = useState<
    { sessionId: string; lastActivity: string | null }[]
  >([]);

  // --- Queue ---
  const [queueStatuses, setQueueStatuses] = useState<QueueStatus[]>([]);

  // ---------------------------------------------------------------------------
  // Mount: hydrate from localStorage + initial API loads
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setAiConfig(loadAiConfigFromStorage());
    setPresets(loadPresetsFromStorage());

    initSession();
    loadSourceConfig();
    loadQueueStatus();
    refreshPastSessions();

    // Tab-visibility aware queue polling
    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(loadQueueStatus, 5000);
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        loadQueueStatus();
        startPolling();
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync sources to localStorage whenever they change
  useEffect(() => {
    if (sources.length > 0) {
      localStorage.setItem("fct_playground_sources", JSON.stringify(sources));
    }
  }, [sources]);

  // Save AI config
  useEffect(() => {
    if (aiConfig.baseURL || aiConfig.apiKey || aiConfig.model) {
      localStorage.setItem("fct_playground_ai_config", JSON.stringify(aiConfig));
    }
  }, [aiConfig]);

  // Persist presets
  useEffect(() => {
    localStorage.setItem("fct_playground_presets", JSON.stringify(presets));
  }, [presets]);

  // Auto-scroll logs unless user scrolled up to read older entries
  useEffect(() => {
    if (logsScrolledUpRef.current) return;
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function resetStepResults() {
    setStepResults({});
    setInspectorStep(null);
  }

  async function initSession() {
    try {
      const id = await createNewSession();
      setSessionId(id);
      addLog("info", `Session created: ${id.slice(0, 8)}...`);
    } catch {
      addLog("error", "Failed to create session");
    }
  }

  async function loadSourceConfig() {
    try {
      const data = await loadSources();
      const savedSources = loadSourcesFromStorage();
      let mergedSources: SourceDef[];
      if (savedSources) {
        mergedSources = ((data.sources as SourceDef[]) || []).map((s) => {
          const saved = savedSources.find((ss) => ss.id === s.id);
          return saved ? { ...s, enabled: saved.enabled } : s;
        });
        const customSources = savedSources.filter((ss) => ss.id.startsWith("custom-rss-"));
        mergedSources = [...customSources, ...mergedSources];
      } else {
        mergedSources = (data.sources as SourceDef[]) || [];
      }
      setSources(mergedSources);
      setCategories(data.categories || []);
      const providers = (data.audioProviders as AudioProviderDef[]) || [];
      setAudioProviders(providers);
      const configured = providers.find((p) => p.isConfigured);
      if (configured) {
        updateParam("selectedProvider", configured.id);
        updateParam("selectedVoice", configured.defaultVoice);
      }
      if (data.aiSettings) setAiSettings(data.aiSettings as AISettings);
      if (data.aiProviders) setAiProviders(data.aiProviders as AIProviderStatus[]);
      if (data.audioSettings) setAudioSettings(data.audioSettings as AudioSettings);
      if (data.audioStatuses) setAudioStatuses(data.audioStatuses as AudioProviderStatus[]);
    } catch {
      addLog("error", "Failed to load source configuration");
    }
  }

  async function loadAiSettings() {
    const res = await fetchAISettings();
    if (res) {
      setAiSettings(res.settings);
      setAiProviders(res.providers);
    }
  }

  async function loadAudioSettings() {
    const res = await fetchAudioSettings();
    if (res) {
      setAudioSettings(res.settings);
      setAudioStatuses(res.providers);
    }
  }

  async function loadQueueStatus() {
    setQueueStatuses(await loadQueueStatuses());
  }

  async function refreshPastSessions() {
    setPastSessions(await listPastSessions());
  }

  // ---------------------------------------------------------------------------
  // Restore session from server-side cache
  // ---------------------------------------------------------------------------

  async function loadSession(id: string) {
    try {
      setSessionId(id);
      setCompletedSteps(new Set());
      resetStepResults();
      setLogs([]);
      addLog("info", `Loaded session: ${id.slice(0, 8)}...`);

      const status = await getSessionStatus(id);
      const stepsToMark = new Set<PlaygroundStep>();
      if (status.cachedSteps.includes("tier1_raw")) stepsToMark.add("ingest");
      if (status.cachedSteps.includes("tier2_normalized")) stepsToMark.add("normalize");
      if (status.cachedSteps.includes("tier2_clusters")) stepsToMark.add("cluster");
      if (status.cachedSteps.includes("tier3_ranked")) stepsToMark.add("rank");
      if (status.cachedSteps.includes("tier3_digest")) stepsToMark.add("digest");
      if (status.cachedSteps.includes("tier3_audio_script")) stepsToMark.add("audio_script");
      if (status.cachedSteps.includes("tier3_audio_file")) stepsToMark.add("audio_generate");
      if (status.cachedSteps.includes("tier3_blog")) stepsToMark.add("blog");
      if (status.cachedSteps.includes("tier3_email")) stepsToMark.add("email");
      setCompletedSteps(stepsToMark);

      // Restore stepResults from the /export endpoint so the inspector and
      // output tabs reflect the actual cached data, not just green checkmarks.
      const snap = await exportSession(id);
      if (snap) {
        const restored: Record<string, unknown> = {};
        if (snap.tier1) {
          restored.ingest = {
            success: true,
            step: "ingest",
            data: { signalCount: snap.tier1.signalCount },
            durationMs: 0,
          };
        }
        if (snap.tier2_normalized) {
          restored.normalize = {
            success: true,
            step: "normalize",
            data: { inputCount: snap.tier2_normalized.signalCount },
            durationMs: 0,
          };
        }
        if (snap.tier2_clusters) {
          restored.cluster = {
            success: true,
            step: "cluster",
            data: { clustersFormed: snap.tier2_clusters.clusterCount },
            durationMs: 0,
          };
        }
        if (snap.tier3_ranked) {
          restored.rank = {
            success: true,
            step: "rank",
            data: snap.tier3_ranked,
            durationMs: 0,
          };
        }
        if (snap.tier3_digest) {
          restored.digest = {
            success: true,
            step: "digest",
            data: snap.tier3_digest,
            durationMs: 0,
          };
        }
        if (snap.tier3_audio_script) {
          restored.audio_script = {
            success: true,
            step: "audio_script",
            data: snap.tier3_audio_script,
            durationMs: 0,
          };
        }
        if (snap.tier3_audio_file) {
          restored.audio_generate = {
            success: true,
            step: "audio_generate",
            data: { ...snap.tier3_audio_file, audioBase64: "" },
            durationMs: 0,
          };
        }
        if (snap.tier3_blog) {
          restored.blog = {
            success: true,
            step: "blog",
            data: snap.tier3_blog,
            durationMs: 0,
          };
        }
        if (snap.tier3_email) {
          restored.email = {
            success: true,
            step: "email",
            data: snap.tier3_email,
            durationMs: 0,
          };
        }
        setStepResults(restored);
      }
    } catch {
      addLog("error", "Failed to load session");
    }
  }

  // ---------------------------------------------------------------------------
  // Step execution
  // ---------------------------------------------------------------------------

  function getStepStatus(step: PlaygroundStep): StepStatus {
    if (completedSteps.has(step)) return "completed";
    if (activeStep === step) return "active";
    const idx = PIPELINE_STEP_IDS.indexOf(step);
    if (idx <= 0) return "available";
    const prevId = PIPELINE_STEP_IDS[idx - 1];
    if (prevId && completedSteps.has(prevId)) return "available";
    return "locked";
  }

  /**
   * Invalidate downstream steps when a step is re-run so users don't see
   * stale green checkmarks for outputs produced from the previous input.
   */
  function invalidateDownstreamFrom(step: PlaygroundStep) {
    const idx = PIPELINE_STEP_IDS.indexOf(step);
    if (idx === -1) return;
    const downstream = PIPELINE_STEP_IDS.slice(idx);
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      for (const id of downstream) next.delete(id);
      return next;
    });
    setStepResults((prev) => {
      const next = { ...prev };
      for (const id of downstream) delete next[id];
      return next;
    });
  }

  async function executeStep(step: PlaygroundStep, overrides?: { sessionId?: string }) {
    const sid = overrides?.sessionId ?? sessionId;
    if (!sid) return null;

    setIsRunning(true);
    setActiveStep(step);
    setInspectorStep(step);
    addLog("info", `▶ Executing: ${STEPS.find((s) => s.id === step)?.label}...`);

    // Re-running a step invalidates everything downstream of it.
    invalidateDownstreamFrom(step);

    try {
      let result: Record<string, unknown> | null = null;
      switch (step) {
        case "ingest":
          result = await runIngest(sid);
          break;
        case "normalize":
          result = await runNormalize(sid);
          break;
        case "cluster":
          result = await runCluster(sid);
          break;
        case "rank":
          result = await runRank(sid);
          break;
        case "digest":
          result = await runDigest(sid);
          break;
        case "audio_script":
          result = await runAudioScript(sid);
          break;
        case "audio_generate":
          result = await runAudioGenerate(sid);
          break;
        case "blog":
          result = await runBlog(sid);
          break;
        case "email":
          result = await runEmail(sid);
          break;
        case "enqueue_prod":
          result = await runEnqueueProd(sid);
          break;
      }

      if (result && (result as { success?: boolean }).success) {
        setCompletedSteps((prev) => new Set([...prev, step]));
        setStepResults((prev) => ({ ...prev, [step]: result }));
        addLog(
          "success",
          `✅ ${STEPS.find((s) => s.id === step)?.label} completed (${
            (result as { durationMs?: number }).durationMs || 0
          }ms)`,
        );
        return result;
      }
      addLog(
        "error",
        `❌ ${STEPS.find((s) => s.id === step)?.label} failed: ${
          (result as { error?: string })?.error || "Unknown error"
        }`,
      );
      return result;
    } catch (err) {
      addLog("error", `❌ ${step} error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setIsRunning(false);
      setActiveStep(null);
    }
  }

  async function runIngest(sid: string) {
    const enabledOverrides = sources.map((s) => ({ id: s.id, enabled: s.enabled }));
    return apiPost(
      "/tier1/ingest",
      { sessionId: sid, sourceOverrides: enabledOverrides },
      aiConfig,
    );
  }

  async function runNormalize(sid: string) {
    return apiPost("/tier2/normalize", { sessionId: sid }, aiConfig);
  }

  async function runCluster(sid: string) {
    return apiPost(
      "/tier2/cluster",
      { sessionId: sid, clusterThreshold: params.clusterThreshold },
      aiConfig,
    );
  }

  async function runRank(sid: string) {
    return apiPost("/tier3/rank", { sessionId: sid, limit: params.rankLimit }, aiConfig);
  }

  async function runDigest(sid: string) {
    return apiPost("/tier3/digest", { sessionId: sid, persist: false }, aiConfig);
  }

  async function runAudioScript(sid: string) {
    return apiPost(
      "/tier3/audio-script",
      {
        sessionId: sid,
        targetMinDuration: params.targetMinDuration,
        targetMaxDuration: params.targetMaxDuration,
      },
      aiConfig,
    );
  }

  async function runAudioGenerate(sid: string) {
    const voice =
      params.selectedVoice ||
      audioProviders.find((p) => p.id === params.selectedProvider)?.defaultVoice ||
      "";
    return apiPost(
      "/tier3/audio-generate",
      {
        sessionId: sid,
        provider: params.selectedProvider,
        voiceId: voice,
      },
      aiConfig,
    );
  }

  async function runBlog(sid: string) {
    return apiPost("/tier3/blog", { sessionId: sid, persist: false }, aiConfig);
  }

  async function runEmail(sid: string) {
    return apiPost("/tier3/email", { sessionId: sid }, aiConfig);
  }

  async function runEnqueueProd(sid: string) {
    return apiPost("/tier4/enqueue-prod", { sessionId: sid }, aiConfig);
  }

  /**
   * Run the full pipeline sequentially. Stops on the first failure and logs
   * clearly which step broke. Used by the "Run Full Pipeline" button.
   */
  async function runFullPipeline() {
    for (const id of PIPELINE_STEP_IDS) {
      // Skip email + enqueue_prod; those aren't part of the autonomous pipeline
      if (id === "enqueue_prod") break;
      if (!completedSteps.has(id) || id === "ingest" || id === "normalize") {
        const result = await executeStep(id);
        if (!result || !(result as { success?: boolean }).success) return;
      }
    }
    addLog("success", "🎉 All pipeline steps completed.");
  }

  // ---------------------------------------------------------------------------
  // Sources / presets
  // ---------------------------------------------------------------------------

  function addCustomRss(url: string, name: string) {
    const id = `custom-rss-${Date.now()}`;
    setSources((prev) => [
      {
        id,
        name,
        type: "rss",
        enabled: true,
        categories: ["custom"],
        description: `Custom RSS feed: ${url}`,
        icon: "📌",
        config: { type: "rss", limit: 15, feedUrl: url },
      },
      ...prev,
    ]);
  }

  function removeCustomRss(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  function savePreset(name: string) {
    const preset: ParameterPreset = {
      id: `preset-${Date.now()}`,
      name,
      params: { ...params },
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [...prev, preset]);
    setActivePresetId(preset.id);
  }

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setParams(preset.params);
    setActivePresetId(id);
  }

  function deletePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId("");
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async function startNewSession() {
    await initSession();
    await refreshPastSessions();
  }

  async function clearCurrentSession() {
    if (!sessionId) return;
    try {
      await apiClearSession(sessionId);
    } catch {
      /* server may already have expired it */
    }
    setCompletedSteps(new Set());
    resetStepResults();
    setLogs([]);
    setPastSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    addLog("info", "Session cleared");
    await initSession();
    await refreshPastSessions();
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  function trackLogScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const up = distanceFromBottom > 24;
    logsScrolledUpRef.current = up;
    setLogsScrolledUp(up);
  }

  function jumpToLatestLogs() {
    logsScrolledUpRef.current = false;
    setLogsScrolledUp(false);
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const completedList = Array.from(completedSteps);
  const displayedInspectorStep: PlaygroundStep | null =
    inspectorStep ?? activeStep ?? completedList[completedList.length - 1] ?? null;
  const currentResult = displayedInspectorStep ? stepResults[displayedInspectorStep] : null;

  // Cached counts for inline parameter diffs.
  const clusterCount =
    (stepResults.cluster as { data?: { clustersFormed?: number } } | undefined)?.data
      ?.clustersFormed ??
    (stepResults.cluster as { data?: { clusterCount?: number } } | undefined)?.data?.clusterCount ??
    null;
  const normalizedCount =
    (stepResults.normalize as { data?: { outputCount?: number } } | undefined)?.data?.outputCount ??
    (stepResults.normalize as { data?: { signalCount?: number } } | undefined)?.data?.signalCount ??
    null;
  const rankedCount =
    (stepResults.rank as { data?: { selectedStories?: number } } | undefined)?.data
      ?.selectedStories ?? null;

  return {
    // session
    sessionId,
    completedSteps,
    completedList,
    activeStep,
    isRunning,
    stepResults,
    currentResult,
    displayedInspectorStep,
    pastSessions,
    // tabs
    activeTab,
    setActiveTab,
    outputTab,
    setOutputTab,
    inspectorStep,
    setInspectorStep,
    // sources
    sources,
    setSources,
    audioProviders,
    categories,
    showSourceConfig,
    setShowSourceConfig,
    addCustomRss,
    removeCustomRss,
    // ai
    aiConfig,
    setAiConfig,
    showAiConfig,
    setShowAiConfig,
    aiSettings,
    aiProviders,
    loadAiSettings,
    // audio / voice
    audioSettings,
    audioStatuses,
    showAudioConfig,
    setShowAudioConfig,
    loadAudioSettings,
    // params
    params,
    updateParam,
    presets,
    activePresetId,
    savePreset,
    applyPreset,
    deletePreset,
    // queue
    queueStatuses,
    loadQueueStatus,
    // logs
    logs,
    addLog,
    logsEndRef,
    trackLogScroll,
    jumpToLatestLogs,
    logsScrolledUp,
    // counts
    clusterCount,
    normalizedCount,
    rankedCount,
    // actions
    executeStep,
    runFullPipeline,
    loadSession,
    startNewSession,
    clearCurrentSession,
    loadSourceConfig,
    refreshPastSessions,
    getStepStatus,
  };
}
