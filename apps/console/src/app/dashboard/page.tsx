"use client";

import { createApiClient } from "@repo/api-client";
import * as React from "react";
import { useProfile } from "../../lib/use-profile";
import { AudioDigestPlayer } from "./components/audio-digest-player";
import { DashboardHeader } from "./components/dashboard-header";
import { DashboardStats } from "./components/dashboard-stats";
import { DigestErrorState } from "./components/digest-error-state";
import { IntelligenceFeed } from "./components/intelligence-feed";
import type { DigestDetail, DigestItem } from "./components/types";

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function DashboardPage() {
  const [digest, setDigest] = React.useState<DigestDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Audio Player State
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.0);
  const [showTranscript, setShowTranscript] = React.useState(false);

  // Feed & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set());
  const [feedbackSent, setFeedbackSent] = React.useState<Record<string, "helpful" | "not_helpful">>(
    {},
  );

  // Client-mounted formatted date to prevent SSR hydration mismatch
  const [currentDateFormatted, setCurrentDateFormatted] = React.useState("");

  const { profile } = useProfile();

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
      // Intentionally left blank — the date is decorative.
    }
  }, []);

  // Fetch data
  const loadDigest = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

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
      // The API answered but there is no digest to show.
      setDigest(null);
      setLoadError("There is no briefing available right now.");
    } catch {
      // Never substitute fabricated content: report the failure instead.
      setDigest(null);
      setLoadError(
        "We could not reach the briefing service. Your briefing was not loaded, so no content is shown.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDigest();
  }, [loadDigest]);

  // Audio timer ticker
  const totalDuration = digest?.audioBrief?.durationSec ?? 0;

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
  const handleNudge = (seconds: number) =>
    setCurrentTime((t) => Math.max(0, Math.min(totalDuration, t + seconds)));
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
      const res = await client.digests.trigger.$post();
      if (!res.ok) {
        setIsRegenerating(false);
        return;
      }
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setTimeout(() => {
        setIsRegenerating(false);
      }, 1200);
    }
  };

  // Filter items
  const allItems: DigestItem[] = digest?.items || [];

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

  const displayName = profile?.name?.split(/\s+/)[0] ?? null;
  const planLabel = (profile?.plan ?? "FREE").toUpperCase();

  return (
    <div className="space-y-8">
      <DashboardHeader
        displayName={displayName}
        planLabel={planLabel}
        currentDateFormatted={currentDateFormatted}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
      />

      {loadError && !isLoading ? (
        <DigestErrorState message={loadError} onRetry={loadDigest} />
      ) : (
        <>
          <AudioDigestPlayer
            digest={digest}
            isPlaying={isPlaying}
            currentTime={currentTime}
            playbackSpeed={playbackSpeed}
            showTranscript={showTranscript}
            onTogglePlay={handleTogglePlay}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onNudge={handleNudge}
            onCycleSpeed={handleCycleSpeed}
            onSeek={handleSeek}
            onToggleTranscript={() => setShowTranscript(!showTranscript)}
          />

          <DashboardStats digest={digest} isLoading={isLoading} savedCount={savedIds.size} />

          <IntelligenceFeed
            items={allItems}
            filteredItems={filteredItems}
            isLoading={isLoading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            savedIds={savedIds}
            onToggleBookmark={toggleBookmark}
            feedbackSent={feedbackSent}
            onFeedback={handleFeedback}
            allCount={allItems.length}
            aiCount={aiCount}
            systemsCount={systemsCount}
            dbCount={dbCount}
          />
        </>
      )}
    </div>
  );
}
