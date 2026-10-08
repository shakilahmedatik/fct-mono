"use client";

import { Badge, Button, Card } from "@repo/ui";
import { ExternalLink, Pause, Play, RefreshCw, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Today&apos;s Intelligence Briefing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated at 07:00 AM UTC • Synthesized from 14 high-signal sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Regenerate</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <Send className="h-3.5 w-3.5" />
            <span>Send to Telegram</span>
          </Button>
        </div>
      </div>

      {/* Audio Player Card */}
      <Card className="p-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <button
            type="button"
            aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-base">October 8 Executive Brief</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ElevenLabs Adam (Studio Audio)
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400">03:14</span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-2/5 rounded-full transition-all" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1:18</span>
              <span>3:14</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Briefing Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Synthesized Briefing Items</h2>

        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="success">#1 AI / INFERENCE</Badge>
              <span className="text-xs text-muted-foreground font-mono">Hacker News</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Mark helpful"
                className="p-1 rounded text-muted-foreground hover:text-emerald-400"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Mark not helpful"
                className="p-1 rounded text-muted-foreground hover:text-red-400"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <h3 className="text-lg font-semibold">
            DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            New technical whitepaper highlights novel mixture-of-experts (MoE) optimizations
            achieving 3x token throughput on commodity H100 clusters.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
            <span>
              <strong>Why it matters:</strong> Lowers self-hosted LLM inference unit economics by
              60%.
            </span>
            <a
              href="https://news.ycombinator.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>Original Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">#2 DISTRIBUTED SYSTEMS</Badge>
              <span className="text-xs text-muted-foreground font-mono">GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Mark helpful"
                className="p-1 rounded text-muted-foreground hover:text-emerald-400"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Mark not helpful"
                className="p-1 rounded text-muted-foreground hover:text-red-400"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <h3 className="text-lg font-semibold">
            Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Linux Foundation backed fork releases v8.0 with asynchronous multi-threaded I/O
            pipelines and native cluster slot rebalancing.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
            <span>
              <strong>Why it matters:</strong> Drop-in Redis replacement ready for high-concurrency
              production queues.
            </span>
            <a
              href="https://github.com/valkey-io/valkey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>Original Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
