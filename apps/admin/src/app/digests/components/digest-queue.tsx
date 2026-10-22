import { Badge, Card, EmptyState, Skeleton } from "@repo/ui";
import { FileText, Headphones, Radio } from "lucide-react";
import type { AdminDigestRow } from "../types";

export interface DigestQueueProps {
  digests: AdminDigestRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

/**
 * The review queue: one card per digest returned by the admin API.
 *
 * Nothing is invented here — the card shows the fields the API returns.
 */
export function DigestQueue({ digests, selectedId, onSelect, isLoading }: DigestQueueProps) {
  return (
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
                onClick={() => onSelect(digest.id)}
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
                      {formattedDate} • {formattedTime}
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

                  {/* Audio synthesis status badge: success for Ready, warning otherwise */}
                  <Badge variant={isAudioReady ? "success" : "warning"} className="gap-1">
                    <Headphones className="h-3 w-3" />
                    <span>
                      {isAudioReady
                        ? `Audio Ready (${Math.round(digest.audioBrief?.durationSec ?? 0)}s)`
                        : `Audio ${digest.audioBrief?.status ?? "not generated"}`}
                    </span>
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
