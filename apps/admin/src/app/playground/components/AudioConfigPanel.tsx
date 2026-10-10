"use client";

import { AlertCircle, CheckCircle2, Headphones, Loader2, Play, Radio, Volume2 } from "lucide-react";
import { useState } from "react";
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedVoiceOverrides, setSelectedVoiceOverrides] = useState<Record<string, string>>({});

  // Audio test synthesis state
  const [testScript, setTestScript] = useState(DEFAULT_SAMPLE_SCRIPT);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [testResult, setTestResult] = useState<{
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
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
              Active: {activeProviderId.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage ElevenLabs, Deepgram Aura, Local Kokoro (ONNX), and OpenAI TTS engines. Switch
            voices and test playback in real time.
          </p>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
              <div className="space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold text-xs text-foreground truncate" title={p.name}>
                    {p.name}
                  </span>

                  {isActive ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 shrink-0">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      Active
                    </span>
                  ) : p.isConfigured ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1 shrink-0">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Missing Keys
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>

                {/* Voice Selector */}
                <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5 text-[11px]">
                  <label
                    htmlFor={`voice-select-${p.id}`}
                    className="text-[10px] text-muted-foreground block font-medium"
                  >
                    Active Voice / Model:
                  </label>
                  {p.availableVoices && p.availableVoices.length > 0 ? (
                    <select
                      id={`voice-select-${p.id}`}
                      disabled={!p.isConfigured}
                      value={currentVoice}
                      onChange={(e) =>
                        setSelectedVoiceOverrides((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border/50 text-foreground outline-none disabled:opacity-50"
                    >
                      {p.availableVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.description ? `(${v.description})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="font-mono text-xs text-foreground truncate">
                      {p.activeModelOrVoice || "Default Voice"}
                    </div>
                  )}
                </div>

                {/* Missing Requirements */}
                {!p.isConfigured && p.missingRequirements && p.missingRequirements.length > 0 && (
                  <div className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-2 py-1">
                    Missing in <code className="font-mono">.env</code>:{" "}
                    {p.missingRequirements.join(", ")}
                  </div>
                )}
              </div>

              {/* Set Active Button */}
              <button
                type="button"
                disabled={!p.isConfigured || isActive || isSaving}
                onClick={() => handleSetActive(p.id)}
                className={`w-full text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                    : p.isConfigured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isActive ? (
                  "Active TTS Engine"
                ) : (
                  "Set as Active"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Voice Synthesis Test Sandbox (Modeled directly after v1 audio-test) */}
      <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-foreground">Voice Synthesis Test Bench</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Tests active engine:{" "}
            <strong className="text-foreground">{activeProviderId.toUpperCase()}</strong>
          </span>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={testScript}
            onChange={(e) => setTestScript(e.target.value)}
            placeholder="Type sample briefing text to synthesize..."
            className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSynthesizing || !testScript.trim()}
              onClick={() => handleSynthesizeTest()}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Audio...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Synthesize Sample Audio
                </>
              )}
            </button>

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
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
            {testResult.error}
          </div>
        )}
      </div>
    </div>
  );
}
