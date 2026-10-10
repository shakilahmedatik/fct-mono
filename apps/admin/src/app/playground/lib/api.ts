// =============================================================================
// Playground API client
// =============================================================================

import { type AiConfig, API_BASE } from "./types";

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

export async function exportSession(sessionId: string): Promise<ExportResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/playground/export/${sessionId}`);
    return res.json();
  } catch {
    return null;
  }
}

export async function apiPost<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  aiConfig: AiConfig,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (aiConfig.baseURL || aiConfig.apiKey || aiConfig.model) {
    headers["x-ai-provider"] = JSON.stringify(aiConfig);
  }
  const res = await fetch(`${API_BASE}/admin/playground${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId: body.sessionId ?? "", ...body }),
  });
  return res.json();
}
