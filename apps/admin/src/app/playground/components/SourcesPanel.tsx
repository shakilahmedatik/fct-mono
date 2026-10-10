"use client";

import { X } from "lucide-react";
import type { SourceDef } from "../lib/types";

interface Props {
  sources: SourceDef[];
  setSources: (next: SourceDef[]) => void;
  onAdd: (url: string, name: string) => void;
  onRemove: (id: string) => void;
}

export function SourcesPanel({ sources, setSources, onAdd, onRemove }: Props) {
  function toggle(id: string) {
    setSources(sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }
  function enableAll() {
    setSources(sources.map((s) => ({ ...s, enabled: true })));
  }
  function disableAll() {
    setSources(sources.map((s) => ({ ...s, enabled: false })));
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Data Sources Configuration</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const url = window.prompt("Enter RSS Feed URL (e.g., https://hnrss.org/newest):");
              if (!url) return;
              try {
                const def = new URL(url);
                const name = window.prompt("Enter a short name for this feed:", def.hostname);
                if (!name) return;
                onAdd(url, name);
              } catch {
                alert("Invalid URL format.");
              }
            }}
            className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
          >
            + Add Custom RSS
          </button>
          <button
            type="button"
            onClick={enableAll}
            className="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="text-xs px-2 py-1 rounded bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {(sources || []).map((source) => {
          const isCustom = source.id.startsWith("custom-rss-");
          return (
            <div
              key={source.id}
              className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                source.enabled
                  ? "border-accent/40 bg-accent/5 shadow-sm"
                  : "border-border/30 bg-muted/20 opacity-60"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(source.id)}
                className="flex-1 flex items-start gap-3 text-left min-w-0"
                aria-pressed={source.enabled}
              >
                <span className="text-lg mt-0.5 shrink-0">{source.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{source.name}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {source.description}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {source.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full shrink-0 mt-1 ${source.enabled ? "bg-accent" : "bg-muted-foreground/30"}`}
                />
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={() => onRemove(source.id)}
                  aria-label={`Remove ${source.name}`}
                  className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
