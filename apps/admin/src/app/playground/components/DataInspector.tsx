"use client";

import { useState } from "react";
import { PIPELINE_STEP_IDS, type PlaygroundStep, STEPS } from "../lib/types";

interface Props {
  currentResult: unknown;
  displayedInspectorStep: PlaygroundStep | null;
  onPickStep: (step: PlaygroundStep | null) => void;
}

export function DataInspector({ currentResult, displayedInspectorStep, onPickStep }: Props) {
  const [compact, setCompact] = useState(false);

  function maybeCompact<T>(value: T): T {
    if (!compact || !value || typeof value !== "object") return value;
    const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    // Drop noisy arrays from the inspector when compact mode is on.
    for (const k of ["signals", "clusters", "stories", "items"]) {
      if (Array.isArray(clone[k])) {
        clone[k] = `[${(clone[k] as unknown[]).length} items — toggle Compact off to view]`;
      }
    }
    // Recurse into nested .data if present
    if (clone.data && typeof clone.data === "object") {
      const d = { ...(clone.data as Record<string, unknown>) };
      for (const k of ["signals", "clusters", "stories", "items"]) {
        if (Array.isArray(d[k])) {
          d[k] = `[${(d[k] as unknown[]).length} items — toggle Compact off to view]`;
        }
      }
      clone.data = d;
    }
    return clone as T;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 min-h-[400px] max-h-[600px] overflow-auto">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Step:</span>
          <select
            value={displayedInspectorStep ?? ""}
            onChange={(e) => onPickStep((e.target.value as PlaygroundStep) || null)}
            className="text-xs rounded-lg border border-border/50 bg-muted/20 px-2 py-1"
          >
            <option value="">Select a step…</option>
            {PIPELINE_STEP_IDS.map((id) => (
              <option key={id} value={id}>
                {STEPS.find((s) => s.id === id)?.icon} {STEPS.find((s) => s.id === id)?.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
            compact
              ? "bg-accent/20 text-accent"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
          }`}
          title="Hide noisy arrays like signals[] / clusters[]"
        >
          {compact ? "✓ Compact" : "Compact"}
        </button>
      </div>
      {currentResult ? (
        <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words">
          {JSON.stringify(maybeCompact(currentResult), null, 2)}
        </pre>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground/50 text-sm">
          Execute a step to see results here
        </div>
      )}
    </div>
  );
}
