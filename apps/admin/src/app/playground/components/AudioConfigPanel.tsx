"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Select,
  SelectOption,
  Textarea,
} from "@repo/ui";
import { AlertCircle, CheckCircle2, Headphones, Play, Radio, Volume2 } from "lucide-react";
import * as React from "react";
import { testAudioSynthesis, updateAudioSettings } from "../lib/api";
import type { AudioProviderId, AudioProviderStatus, AudioSettings } from "../lib/types";

interface Props {
  settings: AudioSettings | null;
  providers: AudioProviderStatus[];
  onRefresh: () => void;
}

const DEFAULT_SAMPLE_SCRIPT =
  "Good morning. This is your First Cup Tech daily executive briefing. AI architecture breakthroughs and engineering signals curated for founders. Have a focused build day.";

export function AudioConfigPanel({ settings, providers, onRefresh }: Props) {
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [selectedVoiceOverrides, setSelectedVoiceOverrides] = React.useState<
    Record<string, string>
  >({});

  // Audio test synthesis state
  const [testScript, setTestScript] = React.useState(DEFAULT_SAMPLE_SCRIPT);
  const [isSynthesizing, setIsSynthesizing] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    audioUrl?: string;
    durationSec?: number;
    provider?: string;
    voiceId?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const activeProviderId = settings?.provider || "elevenlabs";

  const handleSetActive = async (providerId: AudioProviderId) => {
    setSavingId(providerId);
    try {
      const voice = selectedVoiceOverrides[providerId];
      const updates: Parameters<typeof updateAudioSettings>[0] = {
        provider: providerId,
      };

      if (providerId === "elevenlabs" && voice) {
        updates.elevenlabsVoiceId = voice;
      } else if (providerId === "deepgram" && voice) {
        updates.deepgramModel = voice;
      } else if (providerId === "kokoro" && voice) {
        updates.kokoroVoiceId = voice;
      } else if (providerId === "openai" && voice) {
        updates.openaiVoiceId = voice;
      }

      await updateAudioSettings(updates);
      onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const handleSynthesizeTest = async (targetProvider?: AudioProviderId) => {
    const provider = targetProvider || activeProviderId;
    const voiceId = selectedVoiceOverrides[provider];

    setIsSynthesizing(true);
    setTestResult(null);

    try {
      const res = await testAudioSynthesis({
        provider,
        script: testScript.trim(),
        voiceId,
      });

      if (res.success && res.audioBase64) {
        const audioUrl = `data:audio/mp3;base64,${res.audioBase64}`;
        setTestResult({
          audioUrl,
          durationSec: res.durationSec,
          provider: res.provider,
          voiceId: res.voiceId,
          message: res.message,
        });
      } else {
        setTestResult({
          error: res.error || "Audio test synthesis failed.",
        });
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-foreground">
              Speech & Sound TTS Provider Management
            </h3>
            <Badge variant="outline" className="text-emerald-300 border-emerald-500/30">
              Active: {activeProviderId.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Voice synthesis models power daily audio briefings. Local Kokoro ONNX requires zero
            external API keys.
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(providers || []).map((p) => {
          const isActive = p.id === activeProviderId;
          const isSaving = savingId === p.id;
          const currentVoice = selectedVoiceOverrides[p.id] ?? p.activeModelOrVoice;

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                isActive
                  ? "border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-sm"
                  : p.isConfigured
                    ? "border-border/60 bg-card/60 hover:border-border/90"
                    : "border-border/30 bg-muted/10 opacity-75"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
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
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 shrink-0 text-amber-400">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Not in .env
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>

                <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5 text-[11px]">
                  <label
                    htmlFor={`voice-select-${p.id}`}
                    className="text-[10px] text-muted-foreground block font-medium"
                  >
                    Active Voice / Model:
                  </label>
                  {p.availableVoices && p.availableVoices.length > 0 ? (
                    <Select
                      id={`voice-select-${p.id}`}
                      disabled={!p.isConfigured}
                      value={currentVoice}
                      onChange={(e) =>
                        setSelectedVoiceOverrides((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="h-7 text-xs py-1"
                    >
                      {p.availableVoices.map((v) => (
                        <SelectOption key={v.id} value={v.id}>
                          {v.name} {v.description ? `(${v.description})` : ""}
                        </SelectOption>
                      ))}
                    </Select>
                  ) : (
                    <div className="font-mono text-xs text-foreground truncate">
                      {p.activeModelOrVoice || "Default Voice"}
                    </div>
                  )}
                </div>

                {!p.isConfigured && p.missingRequirements && p.missingRequirements.length > 0 && (
                  <div className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-2 py-1">
                    Missing in <code className="font-mono">.env</code>:{" "}
                    {p.missingRequirements.join(", ")}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant={isActive ? "secondary" : "primary"}
                  size="sm"
                  disabled={!p.isConfigured || isActive || isSaving}
                  onClick={() => handleSetActive(p.id)}
                  isLoading={isSaving}
                  className="w-full text-xs h-7 cursor-pointer"
                >
                  {isActive ? "Active Voice Engine" : "Set Active"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Speech Synthesis Test Harness */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-xs text-foreground">
            Interactive Audio Test Synthesis
          </h4>
          <span className="text-[10px] text-muted-foreground">
            Using active engine: <span className="font-mono">{activeProviderId.toUpperCase()}</span>
          </span>
        </div>

        <div className="space-y-2">
          <Textarea
            rows={2}
            value={testScript}
            onChange={(e) => setTestScript(e.target.value)}
            placeholder="Type sample briefing text to synthesize..."
            className="text-xs leading-relaxed"
          />

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!testScript.trim()}
              isLoading={isSynthesizing}
              onClick={() => handleSynthesizeTest()}
              className="gap-1.5 text-xs cursor-pointer font-semibold"
            >
              {!isSynthesizing && <Play className="w-3.5 h-3.5" />}
              <span>Synthesize Sample Audio</span>
            </Button>

            {testResult?.durationSec && (
              <span className="text-xs text-muted-foreground">
                Duration: {testResult.durationSec}s • Engine: {testResult.provider}
              </span>
            )}
          </div>
        </div>

        {/* Audio Player Result */}
        {testResult?.audioUrl && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-300">Audio Output Ready:</span>
              <audio
                controls
                src={testResult.audioUrl}
                className="h-8 max-w-xs"
                aria-label="Synthesized test audio output"
              >
                <track kind="captions" srcLang="en" label="Audio test transcript" />
              </audio>
            </div>
            <a
              href={testResult.audioUrl}
              download={`audio-test-${activeProviderId}.mp3`}
              className="text-xs px-2.5 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium"
            >
              Download MP3
            </a>
          </div>
        )}

        {testResult?.error && (
          <Alert variant="destructive">
            <AlertTitle>Synthesis Failed</AlertTitle>
            <AlertDescription>{testResult.error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
