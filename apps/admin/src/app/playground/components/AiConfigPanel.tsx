"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Cpu,
  Globe,
  Loader2,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { testAIConnection, updateAISettings } from "../lib/api";
import type { AIProviderId, AIProviderStatus, AISettings } from "../lib/types";

interface Props {
  settings: AISettings | null;
  providers: AIProviderStatus[];
  onRefresh: () => void;
}

const PROVIDER_ICONS: Record<AIProviderId, React.ReactNode> = {
  local: <Cpu className="w-4 h-4 text-emerald-400" />,
  openrouter: <Globe className="w-4 h-4 text-blue-400" />,
  openai: <Zap className="w-4 h-4 text-purple-400" />,
  gemini: <Sparkles className="w-4 h-4 text-amber-400" />,
  anthropic: <Bot className="w-4 h-4 text-orange-400" />,
};

export function AiConfigPanel({ settings, providers, onRefresh }: Props) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});

  const activeProviderId = settings?.activeProvider || "openrouter";

  const handleSetActive = async (providerId: AIProviderId) => {
    setSavingId(providerId);
    try {
      const model = modelOverrides[providerId];
      await updateAISettings({
        activeProvider: providerId,
        model: model?.trim() || undefined,
      });
      onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const handleTest = async (providerId: AIProviderId) => {
    setTestingId(providerId);
    try {
      const model = modelOverrides[providerId];
      const result = await testAIConnection(providerId, model?.trim() || undefined);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: result.success, message: result.message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-sm p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-foreground">AI / LLM Provider Management</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
              Active: {activeProviderId.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Providers and secret API keys are managed safely in your server{" "}
            <code className="text-foreground/80 font-mono">.env</code>. Select your active
            intelligence provider below.
          </p>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {(providers || []).map((p) => {
          const isActive = p.id === activeProviderId;
          const isTesting = testingId === p.id;
          const isSaving = savingId === p.id;
          const testResult = testResults[p.id];
          const currentModel = modelOverrides[p.id] ?? p.activeModel;

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                isActive
                  ? "border-blue-500/70 bg-blue-500/10 ring-1 ring-blue-500/40 shadow-sm"
                  : p.isConfigured
                    ? "border-border/60 bg-card/60 hover:border-border/90"
                    : "border-border/30 bg-muted/10 opacity-75"
              }`}
            >
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {PROVIDER_ICONS[p.id]}
                    <span className="font-semibold text-xs text-foreground truncate" title={p.name}>
                      {p.name}
                    </span>
                  </div>

                  {isActive ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold flex items-center gap-1 shrink-0">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      Active
                    </span>
                  ) : p.isConfigured ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Ready in .env
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1 shrink-0">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Not in .env
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>

                {/* Details */}
                <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Base URL:</span>
                    <span
                      className="font-mono text-[10px] text-foreground truncate max-w-[170px]"
                      title={p.baseURL}
                    >
                      {p.baseURL}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>API Key:</span>
                    <span className="font-mono text-[10px] text-foreground">
                      {p.maskedKey
                        ? `••••${p.maskedKey}`
                        : p.isConfigured
                          ? "Local (no key)"
                          : "Missing"}
                    </span>
                  </div>

                  {/* Model input */}
                  <div className="pt-1 border-t border-border/30">
                    <label
                      htmlFor={`model-override-${p.id}`}
                      className="text-[10px] text-muted-foreground block mb-1"
                    >
                      Model identifier:
                    </label>
                    <input
                      id={`model-override-${p.id}`}
                      type="text"
                      disabled={!p.isConfigured}
                      value={currentModel}
                      onChange={(e) =>
                        setModelOverrides((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder={p.activeModel}
                      className="w-full text-xs font-mono px-2 py-1 rounded bg-background border border-border/50 text-foreground disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Missing Requirements warning */}
                {!p.isConfigured && p.missingRequirements && p.missingRequirements.length > 0 && (
                  <div className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-2 py-1">
                    Configure <code className="font-mono">{p.missingRequirements.join(", ")}</code>{" "}
                    in <code className="font-mono">.env</code> to enable.
                  </div>
                )}

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`text-[11px] rounded-lg p-2 font-mono leading-relaxed wrap-break-word ${
                      testResult.success
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-300 border border-red-500/20"
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  disabled={!p.isConfigured || isActive || isSaving}
                  onClick={() => handleSetActive(p.id)}
                  className={`flex-1 text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 cursor-default"
                      : p.isConfigured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isActive ? (
                    "Active Provider"
                  ) : (
                    "Set as Active"
                  )}
                </button>

                <button
                  type="button"
                  disabled={!p.isConfigured || isTesting}
                  onClick={() => handleTest(p.id)}
                  className="text-xs py-1.5 px-2.5 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-40"
                  title="Test model connectivity"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
