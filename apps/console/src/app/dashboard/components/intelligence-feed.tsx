import { Badge, Button, Card, EmptyState, Skeleton, Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { Bookmark, ExternalLink, FolderOpen, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import type { DigestItem } from "./types";

export interface IntelligenceFeedProps {
  items: DigestItem[];
  filteredItems: DigestItem[];
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onClearSearch: () => void;
  savedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
  feedbackSent: Record<string, "helpful" | "not_helpful">;
  onFeedback: (itemId: string, type: "helpful" | "not_helpful") => void;
  allCount: number;
  aiCount: number;
  systemsCount: number;
  dbCount: number;
}

/**
 * The ranked story feed with its topic tabs and per-item actions.
 */
export function IntelligenceFeed({
  filteredItems,
  isLoading,
  activeTab,
  onTabChange,
  searchQuery,
  onClearSearch,
  savedIds,
  onToggleBookmark,
  feedbackSent,
  onFeedback,
  allCount,
  aiCount,
  systemsCount,
  dbCount,
}: IntelligenceFeedProps) {
  return (
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
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-2.5">
              All ({allCount})
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
                onClick={() => onTabChange("all")}
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
                onClick={onClearSearch}
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
                onClick={() => onTabChange("all")}
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
                      onClick={() => onToggleBookmark(item.id)}
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
                      onClick={() => onFeedback(item.id, "helpful")}
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
                      onClick={() => onFeedback(item.id, "not_helpful")}
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
  );
}
