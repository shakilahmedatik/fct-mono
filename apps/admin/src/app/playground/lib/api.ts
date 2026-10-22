// =============================================================================
// Playground API client
// =============================================================================

import {
  type AIProviderId,
  type AIProviderStatus,
  type AISettings,
  API_BASE,
  type AudioProviderId,
  type AudioProviderStatus,
  type AudioSettings,
  type QueueJob,
} from "./types";

interface ExportResponse {
  sessionId: string;
  exportedAt: string;
  tier1: { signalCount: number } | null;
  tier2_normalized: { signalCount: number } | null;
  tier2_clusters: { clusterCount: number } | null;
  tier3_ranked: unknown | null;
  tier3_digest: unknown | null;
  tier3_audio_script: unknown | null;
  tier3_blog: { title: string; contentHtml: string; excerpt?: string } | null;
  tier3_audio_file: {
    format: string;
    provider: string;
    voiceId: string;
    durationSec: number;
    sizeBytes: number;
  } | null;
  tier3_email: { html: string } | null;
}

export async function createNewSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/playground/session/create`, { method: "POST" });
  const data = await res.json();
  return data.sessionId;
}

export async function listPastSessions(): Promise<
  { sessionId: string; lastActivity: string | null }[]
> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/sessions`);
    const data = await res.json();
    return data.sessions || [];
  } catch {
    return [];
  }
}

export async function getSessionStatus(sessionId: string): Promise<{
  sessionId: string;
  cachedSteps: string[];
  lastActivity: string | null;
}> {
  const res = await fetch(`${API_BASE}/admin/playground/session/${sessionId}/status`);
  return res.json();
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/admin/playground/session/${sessionId}`, { method: "DELETE" });
}

export async function loadSources(): Promise<{
  sources: unknown[];
  categories: string[];
  audioProviders: unknown[];
  aiSettings?: AISettings;
  aiProviders?: AIProviderStatus[];
  audioSettings?: AudioSettings;
  audioStatuses?: AudioProviderStatus[];
}> {
  const res = await fetch(`${API_BASE}/admin/playground/sources`);
  return res.json();
}

export async function loadQueueStatuses(): Promise<
  {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }[]
> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/queues/status`);
    const data = await res.json();
    return data.queues || [];
  } catch {
    return [];
  }
}

export async function fetchQueueJobs(
  queueName: string,
  status: "waiting" | "active" | "completed" | "failed" | "delayed" = "failed",
  limit = 20,
): Promise<QueueJob[]> {
  try {
    const res = await fetch(
      `${API_BASE}/admin/playground/queues/${encodeURIComponent(queueName)}/jobs?status=${status}&limit=${limit}`,
    );
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

export async function retryQueueJob(queueName: string, jobId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/admin/playground/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/retry`,
      {
        method: "POST",
      },
    );
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function exportSession(sessionId: string): Promise<ExportResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/export/${sessionId}`);
    return res.json();
  } catch {
    return null;
  }
}

/**
 * The API resolves a request's AI provider from the provider id in the
 * `x-ai-provider` header — it never accepts a caller-supplied base URL or API
 * key. Sending one used to let a caller aim the server's outbound LLM traffic
 * at an arbitrary host (SSRF); the server now owns that configuration.
 *
 * The header is a plain provider id (`local`, `openrouter`, `openai`,
 * `anthropic`, `gemini`).
 *
 * CORS: the API deliberately removed `x-ai-provider` from its allowed request
 * headers, so it can only travel on a same-origin request (no preflight).
 * A cross-origin admin deployment therefore lets the server use the provider
 * it has configured as active — which the AI Config panel sets through
 * `POST /admin/playground/ai/settings`.
 */
function canSendProviderHeader(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URL(API_BASE, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export async function apiPost<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  providerId?: AIProviderId,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (providerId && canSendProviderHeader()) {
    headers["x-ai-provider"] = providerId;
  }
  const res = await fetch(`${API_BASE}/admin/playground${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId: body.sessionId ?? "", ...body }),
  });
  return res.json();
}

/**
 * The provider id the server should use for this request.
 *
 * The active provider is resolved from the server's own settings, so the
 * browser never has to know a base URL or an API key.
 */
export async function resolveActiveProviderId(): Promise<AIProviderId | undefined> {
  const ai = await fetchAISettings();
  if (!ai) return undefined;
  const active = ai.providers?.find((p) => p.isActive);
  return active?.id ?? ai.settings?.activeProvider;
}

export async function fetchAISettings(): Promise<{
  settings: AISettings;
  providers: AIProviderStatus[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/ai/settings`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateAISettings(updates: {
  activeProvider?: AIProviderId;
  model?: string;
}): Promise<{ settings: AISettings; providers: AIProviderStatus[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/ai/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function testAIConnection(
  providerId?: AIProviderId,
  model?: string,
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/ai/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model }),
    });
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      latencyMs: 0,
      message: err instanceof Error ? err.message : "Network error testing connection",
    };
  }
}

export async function fetchAudioSettings(): Promise<{
  settings: AudioSettings;
  providers: AudioProviderStatus[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/audio/settings`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateAudioSettings(updates: {
  provider?: AudioProviderId;
  deepgramModel?: string;
  elevenlabsVoiceId?: string;
  kokoroVoiceId?: string;
  openaiVoiceId?: string;
}): Promise<{ settings: AudioSettings; providers: AudioProviderStatus[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/audio/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function testAudioSynthesis(payload: {
  provider?: AudioProviderId;
  script?: string;
  voiceId?: string;
}): Promise<{
  success: boolean;
  provider?: string;
  voiceId?: string;
  durationSec?: number;
  sizeBytes?: number;
  audioBase64?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/audio/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error testing audio synthesis",
    };
  }
}
