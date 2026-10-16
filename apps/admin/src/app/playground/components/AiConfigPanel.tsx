"use client";

import { Alert, AlertDescription, Badge, Button, Input } from "@repo/ui";
import { AlertCircle, Bot, CheckCircle2, Cpu, Globe, Radio, Sparkles, Zap } from "lucide-react";
import * as React from "react";
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
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResults, setTestResults] = React.useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [modelOverrides, setModelOverrides] = React.useState<Record<string, string>>({});

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
            <Badge variant="outline" className="text-blue-300 border-blue-500/30">
              Active: {activeProviderId.toUpperCase()}
            </Badge>
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
                    <Badge variant="success" className="gap-1 shrink-0">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      Active
                    </Badge>
                  ) : p.isConfigured ? (
                    <Badge variant="outline" className="gap-1 shrink-0 text-emerald-400">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Ready in .env
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 shrink-0 text-amber-400">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Not in .env
                    </Badge>
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
                  <div className="pt-1 border-t border-border/30 space-y-1">
                    <label
                      htmlFor={`model-override-${p.id}`}
                      className="text-[10px] text-muted-foreground block"
                    >
                      Model identifier:
                    </label>
                    <Input
                      id={`model-override-${p.id}`}
                      type="text"
                      disabled={!p.isConfigured}
                      value={currentModel}
                      onChange={(e) =>
                        setModelOverrides((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder={p.activeModel}
                      className="h-7 text-xs font-mono"
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
                  <Alert variant={testResult.success ? "success" : "destructive"}>
                    <AlertDescription className="font-mono text-[10px]">
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant={isActive ? "secondary" : "primary"}
                  size="sm"
                  disabled={!p.isConfigured || isActive || isSaving}
                  onClick={() => handleSetActive(p.id)}
                  isLoading={isSaving}
                  className="flex-1 text-xs cursor-pointer h-7"
                >
                  {isActive ? "Active Provider" : "Set as Active"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!p.isConfigured || isTesting}
                  onClick={() => handleTest(p.id)}
                  isLoading={isTesting}
                  className="text-xs cursor-pointer h-7 px-3"
                  title="Test model connectivity"
                >
                  Test
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
