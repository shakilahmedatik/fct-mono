"use client";

import { Button, Select, SelectOption } from "@repo/ui";
import * as React from "react";
import { PIPELINE_STEP_IDS, type PlaygroundStep, STEPS } from "../lib/types";

interface Props {
  currentResult: unknown;
  displayedInspectorStep: PlaygroundStep | null;
  onPickStep: (step: PlaygroundStep | null) => void;
}

export function DataInspector({ currentResult, displayedInspectorStep, onPickStep }: Props) {
  const [compact, setCompact] = React.useState(false);

  function maybeCompact<T>(value: T): T {
    if (!compact || !value || typeof value !== "object") return value;
    const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const k of ["signals", "clusters", "stories", "items"]) {
      if (Array.isArray(clone[k])) {
        clone[k] = `[${(clone[k] as unknown[]).length} items — toggle Compact off to view]`;
      }
    }
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
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 min-h-[400px] max-h-[600px] overflow-auto shadow-xs">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Step:</span>
          <div className="w-56">
            <Select
              value={displayedInspectorStep ?? ""}
              onChange={(e) => onPickStep((e.target.value as PlaygroundStep) || null)}
              className="h-8 text-xs py-1"
            >
              <SelectOption value="">Select a step…</SelectOption>
              {PIPELINE_STEP_IDS.map((id) => (
                <SelectOption key={id} value={id}>
                  {STEPS.find((s) => s.id === id)?.icon} {STEPS.find((s) => s.id === id)?.label}
                </SelectOption>
              ))}
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant={compact ? "primary" : "outline"}
          size="sm"
          onClick={() => setCompact((v) => !v)}
          className="text-xs h-8 cursor-pointer"
          title="Hide noisy arrays like signals[] / clusters[]"
        >
          {compact ? "✓ Compact" : "Compact"}
        </Button>
      </div>

      {currentResult ? (
        <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
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
