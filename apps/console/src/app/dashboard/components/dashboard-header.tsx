import { Badge, Button, Input } from "@repo/ui";
import { Calendar, RefreshCw, Search, X } from "lucide-react";

export interface DashboardHeaderProps {
  /** Display name of the signed-in subscriber. */
  displayName: string | null;
  /** Account plan of the signed-in subscriber. */
  planLabel: string;
  currentDateFormatted: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

/**
 * Dashboard header: greeting, search field and the queue-a-regeneration
 * action.
 *
 * There is deliberately no "Send to Telegram" control here — the API exposes
 * no authenticated endpoint that dispatches a digest to a chat, so the
 * control was removed rather than left reporting a delivery that never
 * happened.
 */
export function DashboardHeader({
  displayName,
  planLabel,
  currentDateFormatted,
  searchQuery,
  onSearchChange,
  onRegenerate,
  isRegenerating,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border/40 pb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {displayName ? `Good morning, ${displayName}` : "Good morning"}
          </h1>
          <Badge variant="success" className="font-mono text-[11px] uppercase tracking-wider">
            {planLabel} SUBSCRIBER
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
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
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
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin text-accent" : ""}`}
            />
            <span>{isRegenerating ? "Queuing..." : "Regenerate"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
