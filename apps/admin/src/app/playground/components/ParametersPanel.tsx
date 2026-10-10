"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { AudioProviderDef, ParameterPreset, PipelineParameters } from "../lib/types";

interface Props {
  params: PipelineParameters;
  updateParam: <K extends keyof PipelineParameters>(key: K, value: PipelineParameters[K]) => void;
  audioProviders: AudioProviderDef[];
  presets: ParameterPreset[];
  activePresetId: string;
  onSavePreset: (name: string) => void;
  onApplyPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  // Inline counts from the most recent run, for parameter fine-tuning UX.
  clusterCount: number | null;
  normalizedCount: number | null;
  rankedCount: number | null;
}

export function ParametersPanel({
  params,
  updateParam,
  audioProviders,
  presets,
  activePresetId,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  clusterCount,
  normalizedCount,
  rankedCount,
}: Props) {
  const [presetName, setPresetName] = useState("");
  const currentProvider = audioProviders?.find((p) => p.id === params.selectedProvider);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-5">
      <h3 className="font-bold text-sm">Parameters</h3>

      {/* Cluster params */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="cluster-threshold"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Cluster Threshold
          </label>
          <span className="text-[10px] text-muted-foreground">
            last run:{" "}
            <span className="font-mono text-foreground/80">
              {clusterCount !== null ? `${clusterCount} clusters` : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="cluster-threshold"
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={params.clusterThreshold}
            onChange={(e) => updateParam("clusterThreshold", Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-xs font-mono bg-muted/40 px-2 py-0.5 rounded w-12 text-center">
            {params.clusterThreshold}
          </span>
        </div>
      </div>

      {/* Rank params */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="rank-limit"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Rank Limit (Top N)
          </label>
          <span className="text-[10px] text-muted-foreground">
            last run:{" "}
            <span className="font-mono text-foreground/80">
              {rankedCount !== null ? `${rankedCount} stories` : "—"}
            </span>
          </span>
        </div>
        <input
          id="rank-limit"
          type="number"
          min={1}
          max={20}
          value={params.rankLimit}
          onChange={(e) => updateParam("rankLimit", Number(e.target.value))}
          className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm font-mono"
        />
      </div>

      {/* Audio Duration */}
      <div className="space-y-2">
        <label
          htmlFor="target-min-duration"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Audio Duration Target (sec)
        </label>
        <div className="flex gap-2">
          <input
            id="target-min-duration"
            type="number"
            min={30}
            max={300}
            value={params.targetMinDuration}
            onChange={(e) => updateParam("targetMinDuration", Number(e.target.value))}
            className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm font-mono"
            placeholder="Min"
          />
          <span className="text-muted-foreground self-center">–</span>
          <input
            id="target-max-duration"
            type="number"
            min={30}
            max={600}
            value={params.targetMaxDuration}
            onChange={(e) => updateParam("targetMaxDuration", Number(e.target.value))}
            className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm font-mono"
            placeholder="Max"
          />
        </div>
      </div>

      {/* Audio Provider */}
      <div className="space-y-2">
        <label
          htmlFor="selected-provider"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Audio Provider
        </label>
        <select
          id="selected-provider"
          value={params.selectedProvider}
          onChange={(e) => {
            updateParam("selectedProvider", e.target.value);
            const prov = audioProviders.find((p) => p.id === e.target.value);
            updateParam("selectedVoice", prov?.defaultVoice || "");
          }}
          className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm"
        >
          {audioProviders.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.isConfigured}>
              {p.name} {p.isConfigured ? "✓" : "(not configured)"}
            </option>
          ))}
        </select>
        {currentProvider && (
          <div className="text-[10px] text-muted-foreground">{currentProvider.freeTier}</div>
        )}
      </div>

      {/* Voice Selection */}
      {currentProvider && (
        <div className="space-y-2">
          <label
            htmlFor="selected-voice"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Voice
          </label>
          <select
            id="selected-voice"
            value={params.selectedVoice}
            onChange={(e) => updateParam("selectedVoice", e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm"
          >
            {currentProvider.voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.description} {v.gender ? `(${v.gender})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Presets */}
      <div className="space-y-2 pt-3 border-t border-border/30">
        <label
          htmlFor="preset-name"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Parameter Presets
        </label>
        <div className="flex gap-2">
          <input
            id="preset-name"
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={!presetName.trim()}
            onClick={() => {
              onSavePreset(presetName.trim());
              setPresetName("");
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
        {presets.length > 0 ? (
          <ul className="space-y-1">
            {presets.map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${
                  activePresetId === p.id ? "bg-accent/15 text-accent" : "bg-muted/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onApplyPreset(p.id)}
                  className="flex-1 text-left truncate font-mono"
                  title={`Cluster ${p.params.clusterThreshold}, Rank ${p.params.rankLimit}, Audio ${p.params.targetMinDuration}–${p.params.targetMaxDuration}s`}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(p.id)}
                  aria-label={`Delete ${p.name}`}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Save the current combination to reuse later.
          </p>
        )}
        {normalizedCount !== null && (
          <p className="text-[10px] text-muted-foreground pt-1">
            Normalized pool size: <span className="font-mono">{normalizedCount}</span>
          </p>
        )}
      </div>
    </div>
  );
}
