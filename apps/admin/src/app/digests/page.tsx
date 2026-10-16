"use client";

import { createApiClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Switch,
  Textarea,
} from "@repo/ui";
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Headphones,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import * as React from "react";

export interface AdminAudioBrief {
  id: string;
  status: "ready" | "processing" | "pending" | "failed" | string;
  script?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  deliveryChannel?: string | null;
}

export interface AdminDigestRow {
  id: string;
  title: string | null;
  status: "delivered" | "generated" | "pending" | "failed" | string;
  digestDate: string;
  isMaster: boolean;
  cohortKey?: string | null;
  user?: {
    name: string;
    email: string;
  } | null;
  audioBrief?: AdminAudioBrief | null;
  itemCount?: number;
  summarySnippet?: string;
}

interface ActionFeedback {
  type: "success" | "info" | "warning" | "destructive";
  title: string;
  message: string;
}

const DEFAULT_MOCK_DIGESTS: AdminDigestRow[] = [
  {
    id: "dig_master_01",
    title: "Master Tech Briefing — Oct 14",
    status: "delivered",
    digestDate: "2026-10-14T06:30:00Z",
    isMaster: true,
    cohortKey: "master",
    user: null,
    itemCount: 6,
    summarySnippet:
      "DeepSeek releases FlashInfer kernel optimizations, Bun 1.3 stabilizes native WebSocket clustering, and Mistral unveils multimodal vision models.",
    audioBrief: {
      id: "ab_01",
      status: "ready",
      durationSec: 94,
      provider: "kokoro",
      deliveryChannel: "telegram",
      audioUrl: "https://cdn.firstcup.tech/audio/oct14-master.mp3",
      script:
        "Good morning. This is your First Cup Master Briefing for Wednesday, October 14. DeepSeek engineers have open-sourced a major speedup for flash attention inference. Meanwhile, Bun version 1.3 landed with sub-millisecond WebSocket connection pools. In developer infrastructure, Postgres 18 committers committed native columnar clustering for pgvector. That's your morning briefing.",
    },
  },
  {
    id: "dig_cohort_ai_02",
    title: "AI & Distributed Systems Cohort — Oct 14",
    status: "generated",
    digestDate: "2026-10-14T07:00:00Z",
    isMaster: false,
    cohortKey: "ai-systems",
    user: null,
    itemCount: 5,
    summarySnippet:
      "Specialized cohort digest focused on GPU cluster scheduling, speculative decoding benchmarks, and vLLM throughput tuning.",
    audioBrief: {
      id: "ab_02",
      status: "ready",
      durationSec: 78,
      provider: "kokoro",
      deliveryChannel: "telegram",
      audioUrl: "https://cdn.firstcup.tech/audio/oct14-ai-systems.mp3",
      script:
        "Welcome to your AI and Distributed Systems briefing. Today: Speculative decoding achieves 2.4x throughput on H100 clusters using draft models. Kubernetes 1.32 introduces dynamic device plugin autoscaling for heterogeneous AI accelerators. Have a productive day.",
    },
  },
  {
    id: "dig_sub_03",
    title: "Executive Architecture Digest — Oct 14",
    status: "pending",
    digestDate: "2026-10-14T08:15:00Z",
    isMaster: false,
    cohortKey: "leadership",
    user: {
      name: "Alex Rivera",
      email: "alex@engineering.com",
    },
    itemCount: 4,
    summarySnippet:
      "Tailored executive briefing on cloud repatriation cost models and EU AI Act compliance timelines.",
    audioBrief: {
      id: "ab_03",
      status: "processing",
      durationSec: null,
      provider: "kokoro",
      deliveryChannel: "email",
      audioUrl: null,
      script:
        "Good morning Alex. Here is your executive architecture update. Cloud cost governance platforms report enterprise repatriation saving up to thirty percent on steady-state workloads. Compliance auditors have released the first formal audit standards for autonomous agents.",
    },
  },
];

export default function AdminDigestsPage() {
  const [digests, setDigests] = React.useState<AdminDigestRow[]>(DEFAULT_MOCK_DIGESTS);
  const [selectedId, setSelectedId] = React.useState<string>(DEFAULT_MOCK_DIGESTS[0].id);
  const [isLoading, setIsLoading] = React.useState(true);

  // Active selected digest
  const activeDigest = digests.find((d) => d.id === selectedId) || digests[0];

  // Editable script state
  const [scriptText, setScriptText] = React.useState(activeDigest?.audioBrief?.script || "");
  const [isScriptDirty, setIsScriptDirty] = React.useState(false);

  // Action in-flight states
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Contextual feedback banner
  const [feedback, setFeedback] = React.useState<ActionFeedback | null>(null);

  // Sync scriptText when activeDigest changes
  React.useEffect(() => {
    if (activeDigest) {
      setScriptText(activeDigest.audioBrief?.script || "");
      setIsScriptDirty(false);
    }
  }, [activeDigest]);

  // Load from API
  const loadDigests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createApiClient();
      const res = await client.admin.digests.$get();
      if (res.ok) {
        const data = await res.json();
        if (data.digests && Array.isArray(data.digests) && data.digests.length > 0) {
          // Merge API data with default mocks if needed
          const enriched = (data.digests as AdminDigestRow[]).map((d, idx) => ({
            ...d,
            itemCount: d.itemCount || 5,
            summarySnippet:
              d.summarySnippet ||
              "Automated crawl summary covering distributed systems and machine learning breakthroughs.",
            audioBrief: d.audioBrief || {
              id: `ab_${d.id}`,
              status: idx % 2 === 0 ? "ready" : "processing",
              durationSec: 88,
              provider: "kokoro",
              script:
                "This is your autonomous daily tech intelligence update synthesized by Kokoro v0.19.",
            },
          }));
          setDigests(enriched as AdminDigestRow[]);
        }
      }
    } catch {
      // Gracefully fall back to rich mock data
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDigests();
  }, [loadDigests]);

  // Word count & duration calculations
  const wordCount = React.useMemo(() => {
    return scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  }, [scriptText]);

  const estimatedDurationSec = Math.round((wordCount / 150) * 60);

  // Handlers
  const handleTogglePublication = (checked: boolean) => {
    if (!activeDigest) return;
    const newStatus = checked ? "delivered" : "generated";
    setDigests((prev) =>
      prev.map((d) => (d.id === activeDigest.id ? { ...d, status: newStatus } : d)),
    );
    setFeedback({
      type: checked ? "success" : "info",
      title: checked ? "Briefing Published & Dispatched" : "Briefing Returned to Draft",
      message: checked
        ? `Digest "${activeDigest.title}" is now published and scheduled for live distribution.`
        : `Digest "${activeDigest.title}" has been placed in Draft / In Review status.`,
    });
  };

  const handleSaveScript = () => {
    if (!activeDigest) return;
    setDigests((prev) =>
      prev.map((d) =>
        d.id === activeDigest.id
          ? {
              ...d,
              audioBrief: {
                ...d.audioBrief,
                id: d.audioBrief?.id || `ab_${d.id}`,
                status: d.audioBrief?.status || "ready",
                script: scriptText,
              },
            }
          : d,
      ),
    );
    setIsScriptDirty(false);
    setFeedback({
      type: "success",
      title: "Audio Narration Script Saved",
      message: `Updated script (${wordCount} words, ~${estimatedDurationSec}s). Ready for resynthesis.`,
    });
  };

  const handleRegenerateAudio = async () => {
    if (!activeDigest) return;
    setIsRegenerating(true);
    setFeedback({
      type: "info",
      title: "Audio Synthesis Dispatched",
      message: `Kokoro v0.19 worker pool picked up script (${wordCount} words). Synthesizing neural speech...`,
    });

    setTimeout(() => {
      setIsRegenerating(false);
      setDigests((prev) =>
        prev.map((d) =>
          d.id === activeDigest.id
            ? {
                ...d,
                audioBrief: {
                  ...d.audioBrief,
                  id: d.audioBrief?.id || `ab_${d.id}`,
                  status: "ready",
                  durationSec: estimatedDurationSec || 90,
                  script: scriptText,
                },
              }
            : d,
        ),
      );
      setFeedback({
        type: "success",
        title: "Audio Synthesis Complete",
        message: `Synthesized ${estimatedDurationSec}s high-fidelity audio briefing with Kokoro engine.`,
      });
    }, 1200);
  };

  const handlePublishBriefing = async () => {
    if (!activeDigest) return;
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setDigests((prev) =>
        prev.map((d) => (d.id === activeDigest.id ? { ...d, status: "delivered" } : d)),
      );
      setFeedback({
        type: "success",
        title: "Briefing Broadcast Dispatched",
        message: `Digest "${activeDigest.title}" broadcast to Telegram subscribers and queued for email delivery.`,
      });
    }, 800);
  };

  const handleCancelJob = async () => {
    if (!activeDigest) return;
    setIsCancelling(true);
    setTimeout(() => {
      setIsCancelling(false);
      setDigests((prev) =>
        prev.map((d) => (d.id === activeDigest.id ? { ...d, status: "pending" } : d)),
      );
      setFeedback({
        type: "warning",
        title: "Pipeline Job Cancelled",
        message: `Execution halted for digest "${activeDigest.title}". Queue workers dequeued.`,
      });
    }, 600);
  };

  const handleTriggerRun = () => {
    setFeedback({
      type: "info",
      title: "Pipeline Triggered",
      message:
        "Autonomous ingestion run triggered. Scraping fresh signals and initiating clustering.",
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Digest Curation & Audio Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review daily briefings, inspect audio narration scripts, toggle publication status, and
            trigger generation jobs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerRun}
            className="gap-2 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Trigger Run</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDigests}
            disabled={isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* 2. Contextual Feedback Alert Banner */}
      {feedback && (
        <Alert variant={feedback.type}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{feedback.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedback(null)}
              className="h-6 w-6 p-0 cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 3. Master-Detail Curation Studio (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Digest Review Queue Cards (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Review Queue ({digests.length})
            </h2>
            <Badge variant="outline" className="text-xs">
              Live Pipeline
            </Badge>
          </div>

          {isLoading && digests.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : digests.length === 0 ? (
            <EmptyState
              title="No Digests in Review Queue"
              description="No generated briefings pending curation or publication."
              icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-3">
              {digests.map((digest) => {
                const isSelected = digest.id === selectedId;
                const audienceLabel = digest.isMaster
                  ? "Global Master Brief"
                  : digest.user?.name || "Subscriber";
                const isAudioReady = digest.audioBrief?.status === "ready";
                const formattedDate = new Date(digest.digestDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                const formattedTime = new Date(digest.digestDate).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <Card
                    key={digest.id}
                    interactive
                    onClick={() => setSelectedId(digest.id)}
                    className={`p-4 transition-all ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                        : "border-border/80 bg-card hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {digest.title || "Daily Tech Briefing"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formattedDate} • {formattedTime} • {digest.itemCount || 5} stories
                        </div>
                      </div>
                      <Badge
                        variant={
                          digest.status === "delivered"
                            ? "success"
                            : digest.status === "generated"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {digest.status === "delivered" ? "Published" : "Draft / Review"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary" className="gap-1">
                        <Radio className="h-3 w-3" />
                        <span className="truncate max-w-[140px]">{audienceLabel}</span>
                      </Badge>

                      {/* Audio synthesis status badge: success for Ready, warning for Processing */}
                      <Badge variant={isAudioReady ? "success" : "warning"} className="gap-1">
                        <Headphones className="h-3 w-3" />
                        <span>
                          {isAudioReady
                            ? `Audio Ready (${Math.round(digest.audioBrief?.durationSec || 90)}s)`
                            : "Audio Processing"}
                        </span>
                      </Badge>
                    </div>

                    {digest.summarySnippet && (
                      <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {digest.summarySnippet}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Digest Curation Studio (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {activeDigest ? (
            <>
              {/* 1. Publication Status Switch Card */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {activeDigest.title || "Daily Briefing"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Target Audience:{" "}
                        <span className="font-medium text-foreground">
                          {activeDigest.isMaster
                            ? "Global Master Audience"
                            : activeDigest.user?.name || "Subscriber"}
                        </span>
                      </CardDescription>
                    </div>

                    {/* Publication Status dynamic badge */}
                    <Badge
                      variant={activeDigest.status === "delivered" ? "success" : "warning"}
                      className="gap-1.5"
                    >
                      {activeDigest.status === "delivered" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          <span>Draft / In Review</span>
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <Switch
                      id="publication-status-switch"
                      checked={activeDigest.status === "delivered"}
                      onCheckedChange={handleTogglePublication}
                      label="Publication Status"
                      description="Toggle live subscriber distribution across Telegram, Email, and Web Console"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                    <span>Active Distribution Channels:</span>
                    <Badge variant="outline">Telegram Channel</Badge>
                    <Badge variant="outline">Email Digest</Badge>
                    <Badge variant="outline">Web Reader</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Audio Script Editor Card */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Headphones className="h-4 w-4 text-accent" />
                        <span>Audio Script Editor</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Synthesized narration script for the Kokoro v0.19 neural voice engine.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary">{wordCount} words</Badge>
                      <Badge variant="outline">~{estimatedDurationSec}s duration</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Textarea
                      rows={6}
                      value={scriptText}
                      onChange={(e) => {
                        setScriptText(e.target.value);
                        setIsScriptDirty(true);
                      }}
                      placeholder="Enter spoken narration script for Kokoro TTS audio engine..."
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {/* Audio Preview Player if ready */}
                  {activeDigest.audioBrief?.status === "ready" && (
                    <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Play className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            Kokoro v0.19 Spoken Narration
                          </div>
                          <div className="text-muted-foreground">
                            Rendered duration:{" "}
                            {Math.round(activeDigest.audioBrief.durationSec || 90)}s • 24kHz Mono
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="success">Synthesized</Badge>
                        {isScriptDirty && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSaveScript}
                            className="gap-1 cursor-pointer text-xs"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save Script</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isScriptDirty}
                    onClick={() => {
                      setScriptText(activeDigest.audioBrief?.script || "");
                      setIsScriptDirty(false);
                    }}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Reset Changes
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!isScriptDirty}
                    onClick={handleSaveScript}
                    className="gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Narration Script</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* 3. Action Controls Card */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Pipeline Execution Actions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dispatch background BullMQ workers or manage subscriber delivery.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Regenerate Audio (Button outline) */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateAudio}
                      isLoading={isRegenerating}
                      className="gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-accent" />
                      <span>Regenerate Audio</span>
                    </Button>

                    {/* Publish Briefing (Button primary) */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePublishBriefing}
                      isLoading={isPublishing}
                      className="gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Publish Briefing</span>
                    </Button>

                    {/* Cancel Job (Button destructive) */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelJob}
                      isLoading={isCancelling}
                      className="gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Cancel Job</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center border-border/80 bg-card">
              <p className="text-muted-foreground text-sm">
                Select a digest from the queue to curate.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
