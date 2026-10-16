"use client";

import { Badge, Button, Card } from "@repo/ui";
import { Headphones, Pause, Play, Sparkles } from "lucide-react";
import * as React from "react";

export interface DigestItemPreview {
  id: string;
  title: string;
  source: string;
  summary: string | null;
  topics: string[];
}

export interface LatestBriefingData {
  title: string;
  durationSec: number;
  items: DigestItemPreview[];
}

interface AudioDigestPreviewProps {
  briefing: LatestBriefingData | null;
}

const waveBarHeights = [
  25, 45, 75, 30, 60, 90, 40, 70, 85, 50, 30, 65, 80, 45, 95, 60, 35, 70, 50, 85, 40, 65, 30, 50,
];

export function AudioDigestPreview({ briefing }: AudioDigestPreviewProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<number>(0);

  const durationMin = briefing?.durationSec ? Math.floor(briefing.durationSec / 60) : 3;
  const durationRemainderSec = briefing?.durationSec ? briefing.durationSec % 60 : 12;

  const items: DigestItemPreview[] = briefing?.items?.length
    ? briefing.items
    : [
        {
          id: "1",
          title:
            "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
          source: "hackernews",
          summary:
            "New technical whitepaper highlights novel mixture-of-experts (MoE) optimizations achieving 3x token throughput.",
          topics: ["ai", "inference", "quantization"],
        },
        {
          id: "2",
          title:
            "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
          source: "github",
          summary:
            "The Linux Foundation backed fork releases v8.0 with asynchronous multi-threaded I/O pipelines.",
          topics: ["systems", "database"],
        },
        {
          id: "3",
          title: "Kubernetes 1.32 graduated features: Dynamic Resource Allocation and DRA for GPUs",
          source: "engineering-blog",
          summary:
            "Enhanced driver plugin interface enables fine-grained scheduling and cluster-wide memory sharing.",
          topics: ["cloud-native", "kubernetes"],
        },
      ];

  return (
    <Card className="border-border bg-card/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8 text-left transition-all">
      {/* Player Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-5 mb-6 gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-base text-foreground leading-tight">
              {briefing?.title || "Today's Engineering Executive Briefing"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compiled fresh at 07:00 AM UTC • {durationMin}m{" "}
              {durationRemainderSec.toString().padStart(2, "0")}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 px-2.5 py-0.5">
            <Sparkles className="h-3 w-3" />
            <span>Studio Voice Ready</span>
          </Badge>
        </div>
      </div>

      {/* Interactive Soundwave Player */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="primary"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
            className="h-12 w-12 rounded-full shadow-md shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 ml-0.5 fill-current" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            {/* Visualizer Waveform */}
            <div className="flex items-center gap-1 h-8 px-1">
              {waveBarHeights.map((height, i) => (
                <div
                  key={`wave-${i}`}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    i < (isPlaying ? 14 : 7) ? "bg-accent" : "bg-muted-foreground/30"
                  } ${isPlaying ? "animate-pulse" : ""}`}
                  style={{
                    height: `${isPlaying ? Math.max(20, (height * ((i % 3) + 1)) % 100) : height}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>

            {/* Time Indicator & Progress Track */}
            <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
              <span>{isPlaying ? "0:42" : "0:00"}</span>
              <span className="text-[11px] uppercase tracking-wider text-accent font-sans font-semibold">
                {isPlaying ? "Playing sample brief" : "Click to sample audio"}
              </span>
              <span>
                {durationMin}:{durationRemainderSec.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Chips */}
      <div className="mt-5 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Topics:</span>
        <Badge variant="outline">AI Infrastructure</Badge>
        <Badge variant="outline">Distributed Systems</Badge>
        <Badge variant="outline">High-Throughput IO</Badge>
        <Badge variant="secondary">Zero Fluff</Badge>
      </div>

      {/* Curated Feed Items Accordion/Preview */}
      <div className="mt-6 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Executive Digest Outline ({items.length} Stories)
        </div>
        {items.map((item, idx) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActiveItem(idx)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeItem === idx
                ? "border-accent/40 bg-accent/5 shadow-xs"
                : "border-border/40 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-accent">
                #{idx + 1} • {item.topics[0]?.toUpperCase() || "TECH"}
              </span>
              <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-mono">
                {item.source}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
            {item.summary && activeItem === idx && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
                {item.summary}
              </p>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
