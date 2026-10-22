"use client";

import { Button } from "@repo/ui";
import { X } from "lucide-react";
import type { SourceDef } from "../lib/types";
import { AddCustomRssDialog } from "./AddCustomRssDialog";

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
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground">Data Sources Configuration</h3>
        <div className="flex gap-2 flex-wrap items-center">
          <AddCustomRssDialog onAdd={onAdd} existingUrls={(sources || []).map((s) => s.id)} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enableAll}
            className="text-xs h-8 cursor-pointer"
          >
            Enable All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={disableAll}
            className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Disable All
          </Button>
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
                  ? "border-accent/40 bg-accent/5 shadow-xs"
                  : "border-border/30 bg-muted/20 opacity-60"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(source.id)}
                className="flex-1 flex items-start gap-3 text-left min-w-0 cursor-pointer"
                aria-pressed={source.enabled}
              >
                <span className="text-lg mt-0.5 shrink-0">{source.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate text-foreground">
                    {source.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {source.description}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {source.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full shrink-0 mt-1 transition-colors ${
                    source.enabled ? "bg-accent" : "bg-muted-foreground/30"
                  }`}
                />
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={() => onRemove(source.id)}
                  aria-label={`Remove ${source.name}`}
                  className="absolute top-1.5 right-1.5 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
