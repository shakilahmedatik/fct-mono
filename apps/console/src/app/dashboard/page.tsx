"use client";

import { createApiClient } from "@repo/api-client";
import { Badge, Button, Card } from "@repo/ui";
import {
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DigestItemView {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  whyItMatters: string | null;
  position: number;
  topics: string[];
}

interface DigestDetail {
  id: string;
  title: string | null;
  digestDate: string;
  items: DigestItemView[];
  audioBrief?: {
    id: string;
    script: string | null;
    audioUrl: string | null;
    durationSec: number | null;
  } | null;
}

export default function DashboardPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [digest, setDigest] = useState<DigestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string>>({});
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    async function loadDigest() {
      try {
        const client = createApiClient();
        // First try authenticated latest, fallback to public latest
        const res = await client.digests.latest.$get();
        if (res.ok) {
          const data = await res.json();
          if (data.digest) {
            setDigest(data.digest as DigestDetail);
            setIsLoading(false);
            return;
          }
        }

        const publicRes = await client.digests.public.latest.$get();
        if (publicRes.ok) {
          const publicData = await publicRes.json();
          if (publicData.digest) {
            setDigest(publicData.digest as DigestDetail);
          }
        }
      } catch {
        // Handled via fallback
      } finally {
        setIsLoading(false);
      }
    }

    loadDigest();
  }, []);

  const handleFeedback = async (itemId: string, type: "helpful" | "not_helpful") => {
    if (!digest) return;
    setFeedbackSent((prev) => ({ ...prev, [itemId]: type }));

    try {
      const client = createApiClient();
      await client.digests[":id"].feedback.$post({
        param: { id: digest.id },
        json: {
          digestItemId: itemId,
          type,
        },
      });
    } catch {
      // Best-effort feedback submission
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const client = createApiClient();
      await client.digests.trigger.$post();
      // Reload after brief timeout
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch {
      setIsRegenerating(false);
    }
  };

  const durationMin = digest?.audioBrief?.durationSec
    ? Math.floor(digest.audioBrief.durationSec / 60)
    : 3;
  const durationRemainderSec = digest?.audioBrief?.durationSec
    ? digest.audioBrief.durationSec % 60
    : 12;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {digest?.title || "Today's Intelligence Briefing"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Synthesized across live GitHub, Hacker News, and engineering blogs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Queuing..." : "Regenerate"}</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <Send className="h-3.5 w-3.5" />
            <span>Send to Telegram</span>
          </Button>
        </div>
      </div>

      {/* Audio Player Card */}
      <Card className="p-6 border-accent/30 bg-card">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <button
            type="button"
            aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 w-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/25 hover:bg-accent/90 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-base">Executive Studio Audio Brief</span>
                <span className="text-xs text-muted-foreground ml-2">Voice Synthesis</span>
              </div>
              <span className="text-xs font-mono text-accent">
                {durationMin}:{durationRemainderSec.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-accent w-2/5 rounded-full transition-all" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0:45</span>
              <span>
                {durationMin}:{durationRemainderSec.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Briefing Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Synthesized Briefing Items</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span>Loading latest intelligence briefing...</span>
          </div>
        ) : digest?.items?.length ? (
          digest.items.map((item, idx) => {
            const currentFeedback = feedbackSent[item.id];
            return (
              <Card key={item.id} className="p-6 space-y-3 border-border/80 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={idx === 0 ? "success" : "secondary"}>
                      #{item.position} • {item.topics[0]?.toUpperCase() || "TECH"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono uppercase">
                      {item.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Mark helpful"
                      onClick={() => handleFeedback(item.id, "helpful")}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        currentFeedback === "helpful"
                          ? "text-accent bg-accent/15"
                          : "text-muted-foreground hover:text-accent"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mark not helpful"
                      onClick={() => handleFeedback(item.id, "not_helpful")}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        currentFeedback === "not_helpful"
                          ? "text-destructive bg-destructive/15"
                          : "text-muted-foreground hover:text-destructive"
                      }`}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.summary || "Curated briefing item."}
                </p>
                {item.whyItMatters && (
                  <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
                    <span>
                      <strong className="text-accent">Why it matters:</strong> {item.whyItMatters}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline shrink-0 ml-4"
                    >
                      <span>Primary Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No items currently available.</p>
        )}
      </div>
    </div>
  );
}
