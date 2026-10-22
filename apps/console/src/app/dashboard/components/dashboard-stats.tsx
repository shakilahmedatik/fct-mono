import { Skeleton, StatCard } from "@repo/ui";
import { Bookmark, Clock, Headphones, Layers } from "lucide-react";
import { formatTime } from "./audio-digest-player";
import type { DigestDetail } from "./types";

export interface DashboardStatsProps {
  digest: DigestDetail | null;
  isLoading: boolean;
  savedCount: number;
}

/**
 * Key metrics for the briefing.
 *
 * Every value is derived from the loaded digest or from local UI state. The
 * previous implementation showed a hard-coded streak, listening time and
 * topic count, none of which came from the API.
 */
export function DashboardStats({ digest, isLoading, savedCount }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const items = digest?.items ?? [];
  const topics = Array.from(new Set(items.flatMap((item) => item.topics))).sort();
  const durationSec = digest?.audioBrief?.durationSec ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Stories in Today's Briefing"
        value={`${items.length}`}
        change={items.length > 0 ? "Synthesized" : "None yet"}
        trend="neutral"
        icon={<Headphones className="h-5 w-5 text-amber-500" />}
        subtitle="Items ranked for this digest"
      />
      <StatCard
        title="Saved Briefings"
        value={`${savedCount} Saved`}
        change={savedCount > 0 ? `${savedCount} active` : "None"}
        trend="neutral"
        icon={<Bookmark className="h-5 w-5 text-emerald-500" />}
        subtitle="Curated executive reference list"
      />
      <StatCard
        title="Audio Briefing Length"
        value={durationSec ? formatTime(durationSec) : "Not generated"}
        change={durationSec ? "From this digest" : "Pending"}
        trend="neutral"
        icon={<Clock className="h-5 w-5 text-blue-500" />}
        subtitle="Duration reported by the synthesis pipeline"
      />
      <StatCard
        title="Topics Covered"
        value={`${topics.length} Active`}
        change={topics.length > 0 ? "In this digest" : "None yet"}
        trend="neutral"
        icon={<Layers className="h-5 w-5 text-purple-500" />}
        subtitle={topics.length > 0 ? topics.join(", ") : "No topics in this digest"}
      />
    </div>
  );
}
