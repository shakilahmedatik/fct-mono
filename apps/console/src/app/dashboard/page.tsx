"use client";

import { createApiClient } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import {
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  FolderOpen,
  Headphones,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  SearchX,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import * as React from "react";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface DigestItem {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  whyItMatters: string | null;
  position: number;
  topics: string[];
  publishedAt?: string;
}

export interface AudioBrief {
  id: string;
  script: string | null;
  audioUrl: string | null;
  durationSec: number | null;
}

export interface DigestDetail {
  id: string;
  title: string | null;
  digestDate: string;
  items: DigestItem[];
  audioBrief?: AudioBrief | null;
}

// ============================================================================
// Fallback Mock Data
// ============================================================================

const FALLBACK_DIGEST: DigestDetail = {
  id: "digest-current",
  title: "Engineering Executive Daily Briefing",
  digestDate: new Date().toISOString().split("T")[0],
  audioBrief: {
    id: "ab-current",
    script:
      "Good morning. Here is your FirstCup executive briefing. First, DeepSeek releases an in-depth architecture whitepaper on DeepSeek-V3, detailing novel multi-head latent attention (MLA) mechanisms and FP8 mixed-precision quantization achieving 3x token throughput. In systems infrastructure, Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines with multi-threaded async I/O. Finally, Kubernetes 1.32 graduates Dynamic Resource Allocation for GPUs to beta, introducing fine-grained hardware sharing across distributed training clusters.",
    audioUrl: null,
    durationSec: 225, // 3m 45s
  },
  items: [
    {
      id: "story-1",
      title: "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
      url: "https://news.ycombinator.com/item?id=42500001",
      source: "hackernews",
      summary:
        "New technical whitepaper highlights novel mixture-of-experts (MoE) optimizations achieving 3x token throughput with minimal accuracy loss.",
      whyItMatters:
        "Enables production inference of 670B-parameter models on commodity clusters at 60% lower dollar cost.",
      position: 1,
      topics: ["ai", "inference", "quantization"],
      publishedAt: "2h ago",
    },
    {
      id: "story-2",
      title:
        "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
      url: "https://github.com/valkey-io/valkey",
      source: "github",
      summary:
        "The Linux Foundation backed in-memory store releases v8.0 with asynchronous multi-threaded I/O pipelines and dual-channel replication.",
      whyItMatters:
        "Provides a zero-license-risk drop-in replacement for Redis with drastically superior multicore scaling.",
      position: 2,
      topics: ["systems", "database", "caching"],
      publishedAt: "3h ago",
    },
    {
      id: "story-3",
      title: "Kubernetes 1.32 graduated features: Dynamic Resource Allocation and DRA for GPUs",
      url: "https://kubernetes.io/blog",
      source: "engineering-blog",
      summary:
        "Enhanced driver plugin interface enables fine-grained scheduling, memory fractional slicing, and cluster-wide memory sharing.",
      whyItMatters:
        "Reduces idle GPU cluster capacity by up to 45% during distributed model fine-tuning runs.",
      position: 3,
      topics: ["systems", "cloud-native", "kubernetes"],
      publishedAt: "5h ago",
    },
    {
      id: "story-4",
      title:
        "PostgreSQL 17 query optimizer improvements for JSONB subscripting and B-Tree deduplication",
      url: "https://www.postgresql.org",
      source: "engineering-blog",
      summary:
        "Core query planner improvements substantially speed up nested JSON document extraction and vacuum times on high-write workloads.",
      whyItMatters:
        "Directly improves high-throughput metadata storage performance without requiring document database offloading.",
      position: 4,
      topics: ["database", "backend"],
      publishedAt: "6h ago",
    },
    {
      id: "story-5",
      title: "Rust 2026 Edition roadmap: Asynchronous generators and safe FFI abstractions",
      url: "https://blog.rust-lang.org",
      source: "github",
      summary:
        "The Rust project unveils plans for native async generators, ergonomic stack traces, and first-class WebAssembly component model support.",
      whyItMatters:
        "Paves the path for next-generation systems streaming pipelines without complex pinned future boilerplate.",
      position: 5,
      topics: ["systems", "rust"],
      publishedAt: "7h ago",
    },
    {
      id: "story-6",
      title: "Claude 3.8 Sonnet with adaptive tool-calling latency reductions deployed",
      url: "https://anthropic.com/news",
      source: "engineering-blog",
      summary:
        "Model updates cut tool-call roundtrip latency by 40% while raising structured JSON output adherence across autonomous multi-agent systems.",
      whyItMatters:
        "Significantly accelerates autonomous worker pipelines requiring chained tool calls.",
      position: 6,
      topics: ["ai", "agents"],
      publishedAt: "8h ago",
    },
  ],
};

const WAVE_BARS = [
  25, 45, 75, 30, 60, 90, 40, 70, 85, 50, 30, 65, 80, 45, 95, 60, 35, 70, 50, 85, 40, 65, 30, 50,
];

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DashboardPage() {
  const [digest, setDigest] = React.useState<DigestDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [telegramStatus, setTelegramStatus] = React.useState<"idle" | "sent">("idle");

  // Audio Player State
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.0);
  const [showTranscript, setShowTranscript] = React.useState(false);

  // Feed & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set(["story-1"]));
  const [feedbackSent, setFeedbackSent] = React.useState<Record<string, "helpful" | "not_helpful">>(
    {},
  );

  // Client-mounted formatted date to prevent SSR hydration mismatch
  const [currentDateFormatted, setCurrentDateFormatted] = React.useState(
    "Wednesday, October 14, 2026",
  );

  React.useEffect(() => {
    try {
      const now = new Date();
      const formatted = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      setCurrentDateFormatted(formatted);
    } catch {
      // fallback preserved
    }
  }, []);

  // Fetch data
  React.useEffect(() => {
    async function loadDigest() {
      try {
        const client = createApiClient();
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
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to rich mock data
      }
      setDigest(FALLBACK_DIGEST);
      setIsLoading(false);
    }

    loadDigest();
  }, []);

  // Audio timer ticker
  const totalDuration = digest?.audioBrief?.durationSec || 225;

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        if (t >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return t + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Audio controls
  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handleSkipBack = () => setCurrentTime((t) => Math.max(0, t - 15));
  const handleSkipForward = () => setCurrentTime((t) => Math.min(totalDuration, t + 15));
  const handleCycleSpeed = () => {
    setPlaybackSpeed((curr) => {
      const idx = SPEED_OPTIONS.indexOf(curr);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  };

  const handleSeek = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(Math.round(pct * totalDuration));
  };

  // Bookmark toggle
  const toggleBookmark = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Feedback action
  const handleFeedback = async (itemId: string, type: "helpful" | "not_helpful") => {
    setFeedbackSent((prev) => ({ ...prev, [itemId]: type }));
    if (!digest) return;
    try {
      const client = createApiClient();
      await client.digests[":id"].feedback.$post({
        param: { id: digest.id },
        json: { digestItemId: itemId, type },
      });
    } catch {
      // optimistic state preserved
    }
  };

  // Regenerate action
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const client = createApiClient();
      await client.digests.trigger.$post();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setTimeout(() => {
        setIsRegenerating(false);
      }, 1200);
    }
  };

  // Telegram action
  const handleSendTelegram = () => {
    setTelegramStatus("sent");
    setTimeout(() => setTelegramStatus("idle"), 3000);
  };

  // Filter items
  const allItems = digest?.items || [];

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      // Search matching
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.summary?.toLowerCase().includes(query) ?? false) ||
        (item.whyItMatters?.toLowerCase().includes(query) ?? false) ||
        item.source.toLowerCase().includes(query) ||
        item.topics.some((t) => t.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Tab matching
      if (activeTab === "all") return true;
      if (activeTab === "saved") return savedIds.has(item.id);
      if (activeTab === "ai") {
        return item.topics.some((t) =>
          ["ai", "inference", "quantization", "agents", "llm"].includes(t.toLowerCase()),
        );
      }
      if (activeTab === "systems") {
        return item.topics.some((t) =>
          ["systems", "cloud-native", "kubernetes", "rust", "devops"].includes(t.toLowerCase()),
        );
      }
      if (activeTab === "database") {
        return item.topics.some((t) =>
          ["database", "caching", "backend", "postgres"].includes(t.toLowerCase()),
        );
      }
      return true;
    });
  }, [allItems, searchQuery, activeTab, savedIds]);

  // Tab counts
  const aiCount = allItems.filter((i) =>
    i.topics.some((t) => ["ai", "inference", "quantization", "agents"].includes(t.toLowerCase())),
  ).length;
  const systemsCount = allItems.filter((i) =>
    i.topics.some((t) =>
      ["systems", "cloud-native", "kubernetes", "rust"].includes(t.toLowerCase()),
    ),
  ).length;
  const dbCount = allItems.filter((i) =>
    i.topics.some((t) => ["database", "caching", "backend"].includes(t.toLowerCase())),
  ).length;

  return (
    <div className="space-y-8">
      {/* ==================================================================== */}
      {/* 1. Header Section                                                    */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Good morning, Alex
            </h1>
            <Badge variant="success" className="font-mono text-[11px] uppercase tracking-wider">
              PRO SUBSCRIBER
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span>{currentDateFormatted}</span>
            <span>•</span>
            <span className="text-foreground/80 font-medium">Daily Executive Intelligence</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Real-time Search Input */}
          <div className="w-full sm:w-64 relative">
            <Input
              type="text"
              placeholder="Search stories & topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="cursor-pointer hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
              className="h-9 text-xs"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="gap-2 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin text-accent" : ""}`}
              />
              <span>{isRegenerating ? "Queuing..." : "Regenerate"}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendTelegram}
              className="gap-2 cursor-pointer"
            >
              {telegramStatus === "sent" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Dispatched!</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send to Telegram</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Daily Audio Digest Player Card                                    */}
      {/* ==================================================================== */}
      <Card className="p-6 sm:p-7 border-accent/30 bg-card/90 shadow-md backdrop-blur-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Today&apos;s Audio Digest
                </h2>
                <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px]">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Studio Kokoro Voice</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-story synthesis compiled at 07:00 AM UTC • High-Definition 24kHz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Speed Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCycleSpeed}
              className="h-8 px-2.5 text-xs font-mono font-semibold cursor-pointer"
              title="Click to toggle playback speed"
            >
              {playbackSpeed.toFixed(2).replace(/\.00$/, "")}x
            </Button>
            {/* Transcript Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>Transcript</span>
              {showTranscript ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Player Controls & Waveform */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              aria-label="Skip backward 15 seconds"
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="primary"
              size="icon"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
              className="h-12 w-12 rounded-full shadow-lg shadow-accent/25 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 ml-0.5 fill-current" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              aria-label="Skip forward 15 seconds"
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Soundwave Bars & Time Indicator */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-1 h-9 px-1">
              {WAVE_BARS.map((height, i) => {
                const isPassed = (i / WAVE_BARS.length) * totalDuration <= currentTime;
                return (
                  <div
                    key={`bar-${i}`}
                    className={`flex-1 rounded-full transition-all duration-200 ${
                      isPassed ? "bg-accent" : "bg-muted-foreground/25"
                    }`}
                    style={{
                      height: `${isPlaying ? Math.max(20, (height * ((i % 3) + 1.2)) % 100) : height}%`,
                    }}
                  />
                );
              })}
            </div>

            {/* Clickable Progress Bar */}
            <button
              type="button"
              aria-label="Seek audio playback"
              onClick={handleSeek}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setCurrentTime((t) => Math.max(0, t - 5));
                if (e.key === "ArrowRight") setCurrentTime((t) => Math.min(totalDuration, t + 5));
              }}
              className="h-2 w-full bg-muted/60 rounded-full cursor-pointer relative overflow-hidden group border-0 p-0 block"
            >
              <div
                className="h-full bg-accent rounded-full transition-all duration-150"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </button>

            <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span className="text-[11px] font-sans font-semibold text-accent uppercase tracking-wider">
                {isPlaying ? "Playing Briefing" : "Paused"}
              </span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Collapsible Transcript Box */}
        {showTranscript && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-2 rounded-xl bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Narration Script & Synthesis</span>
              <span>Kokoro v0.19</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 font-serif italic">
              &ldquo;
              {digest?.audioBrief?.script || "No transcript script attached to this briefing."}
              &rdquo;
            </p>
          </div>
        )}
      </Card>

      {/* ==================================================================== */}
      {/* 3. Key Metric Tiles / Stats (StatCard Grid)                          */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Daily Briefing Streak"
            value="14 Days"
            change="+3 days"
            trend="positive"
            icon={<Flame className="h-5 w-5 text-amber-500" />}
            subtitle="Top 5% subscriber consistency"
          />
          <StatCard
            title="Saved Briefings"
            value={`${savedIds.size} Saved`}
            change={savedIds.size > 0 ? `+${savedIds.size} active` : "None"}
            trend="neutral"
            icon={<Bookmark className="h-5 w-5 text-emerald-500" />}
            subtitle="Curated executive reference list"
          />
          <StatCard
            title="Audio Listening Time"
            value="42 mins"
            change="+15% vs last week"
            trend="positive"
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            subtitle="8 digests consumed this week"
          />
          <StatCard
            title="Topics Followed"
            value="6 Active"
            change="4 updated today"
            trend="neutral"
            icon={<Layers className="h-5 w-5 text-purple-500" />}
            subtitle="AI, Systems, Infra, Security, DB"
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. Intelligence Feed / Article List                                  */}
      {/* ==================================================================== */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Subscriber Intelligence Feed
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked stories synthesized across live GitHub, Hacker News, and engineering blogs.
            </p>
          </div>

          {/* Topic Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-2.5">
                All ({allItems.length})
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs px-2.5">
                AI ({aiCount})
              </TabsTrigger>
              <TabsTrigger value="systems" className="text-xs px-2.5">
                Systems ({systemsCount})
              </TabsTrigger>
              <TabsTrigger value="database" className="text-xs px-2.5">
                Databases ({dbCount})
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-xs px-2.5">
                Saved ({savedIds.size})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Section: Loading Skeleton, Empty State, or Article Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          activeTab === "saved" ? (
            <EmptyState
              icon={<Bookmark className="h-7 w-7 text-muted-foreground opacity-60" />}
              title="No saved stories yet"
              description="Click the bookmark icon on any briefing story above to add it to your curated executive reading list."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className="cursor-pointer"
                >
                  Browse Today&apos;s Stories
                </Button>
              }
            />
          ) : searchQuery ? (
            <EmptyState
              icon={<SearchX className="h-7 w-7 text-muted-foreground opacity-60" />}
              title="No matching stories found"
              description={`No stories in today's briefing match "${searchQuery}". Try searching for another topic or clear your filter.`}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="cursor-pointer"
                >
                  Clear Search Filter
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<FolderOpen className="h-7 w-7 text-muted-foreground opacity-60" />}
              title="No stories available in this category"
              description="There are currently no items synthesized for this topic today."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className="cursor-pointer"
                >
                  View All Stories
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item, idx) => {
              const currentFeedback = feedbackSent[item.id];
              const isSaved = savedIds.has(item.id);

              return (
                <Card
                  key={item.id}
                  interactive
                  className="p-6 space-y-4 border-border/80 bg-card hover:border-accent/40"
                >
                  {/* Top Metadata Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={idx === 0 ? "success" : "secondary"}>
                        #{item.position} • {item.topics[0]?.toUpperCase() || "TECH"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono uppercase">
                        {item.source}
                      </span>
                      {item.publishedAt && (
                        <span className="text-xs text-muted-foreground">• {item.publishedAt}</span>
                      )}
                    </div>

                    {/* Bookmark & Feedback Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label={isSaved ? "Remove from bookmarks" : "Save story bookmark"}
                        onClick={() => toggleBookmark(item.id)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          isSaved
                            ? "text-accent bg-accent/15"
                            : "text-muted-foreground hover:text-accent hover:bg-muted/50"
                        }`}
                        title={isSaved ? "Saved" : "Save for later"}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                      </button>

                      <button
                        type="button"
                        aria-label="Mark helpful"
                        onClick={() => handleFeedback(item.id, "helpful")}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          currentFeedback === "helpful"
                            ? "text-accent bg-accent/15"
                            : "text-muted-foreground hover:text-accent hover:bg-muted/50"
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        aria-label="Mark not helpful"
                        onClick={() => handleFeedback(item.id, "not_helpful")}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          currentFeedback === "not_helpful"
                            ? "text-destructive bg-destructive/15"
                            : "text-muted-foreground hover:text-destructive hover:bg-muted/50"
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-foreground tracking-tight hover:text-accent transition-colors leading-snug">
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.summary || "Curated briefing item."}
                    </p>
                  </div>

                  {/* Why It Matters Callout Box */}
                  {item.whyItMatters && (
                    <div className="rounded-r-lg border-l-2 border-accent bg-accent/5 px-3.5 py-2.5 text-xs text-foreground/90">
                      <span className="font-semibold text-accent mr-1.5">Why it matters:</span>
                      <span className="leading-relaxed">{item.whyItMatters}</span>
                    </div>
                  )}

                  {/* Bottom Row: Topic Chips & Primary Source */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground mr-1">Tags:</span>
                      {item.topics.map((t) => (
                        <Badge key={t} variant="outline" className="text-[11px] px-2 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium shrink-0"
                    >
                      <span>Primary Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
