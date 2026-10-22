"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectOption,
} from "@repo/ui";
import { AlertCircle, Layers, Search, Sparkles } from "lucide-react";
import * as React from "react";
import { exportSession } from "../lib/api";

interface VectorSearchWorkbenchProps {
  clusterThreshold: number;
  rankLimit: number;
  onUpdateClusterThreshold: (val: number) => void;
  onUpdateRankLimit: (val: number) => void;
  clusterCount: number | null;
  rankedCount: number | null;
  /** The active playground session — the API stores the ranked signals under it. */
  sessionId: string;
}

interface RankedSignal {
  id: string;
  title: string;
  source: string;
  topics: string[];
  clusterId: string;
  score: number;
  whyItMatters: string;
}

/**
 * Read the ranked signals the pipeline actually produced for this session.
 *
 * The API has no query-time vector-search route — clustering and ranking run
 * as pipeline steps and their output is cached per session. This panel reads
 * that real output and filters it locally; it never invents matches.
 */
export function VectorSearchWorkbench({
  clusterThreshold,
  rankLimit,
  onUpdateClusterThreshold,
  onUpdateRankLimit,
  clusterCount,
  rankedCount,
  sessionId,
}: VectorSearchWorkbenchProps) {
  const [query, setQuery] = React.useState("");
  const [metric, setMetric] = React.useState("cosine");
  const [isSearching, setIsSearching] = React.useState(false);
  const [signals, setSignals] = React.useState<RankedSignal[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      if (!sessionId) {
        setSignals([]);
        setError(
          "There is no active pipeline session. Start a session and run the rank step before querying the semantic index.",
        );
        return;
      }

      const exported = await exportSession(sessionId);
      const ranked = exported?.tier3_ranked as unknown;

      if (!Array.isArray(ranked) || ranked.length === 0) {
        setSignals([]);
        setError(
          "The API has no ranked signals cached for this session yet. Run the rank step (Tier 3) and try again.",
        );
        return;
      }

      setSignals(
        ranked.map((entry: RankedEntry) => ({
          id: entry.story?.id ?? `${entry.story?.clusterId ?? "story"}-${entry.position ?? 0}`,
          title: entry.story?.canonicalTitle ?? "Untitled signal",
          source: entry.story?.dominantSource ?? "Unknown source",
          topics: entry.story?.topics ?? [],
          clusterId: entry.story?.clusterId ?? "—",
          score: typeof entry.rankScore === "number" ? entry.rankScore : 0,
          whyItMatters: entry.whyItMatters ?? "",
        })),
      );
    } catch {
      setSignals([]);
      setError("The API could not be reached, so no semantic index results are shown.");
    } finally {
      setIsSearching(false);
    }
  };

  // The API has no query parameter for the semantic index, so the query text
  // filters the real ranked signals locally.
  const visibleSignals = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return signals;
    return signals.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.topics.some((t) => t.toLowerCase().includes(q)) ||
        s.whyItMatters.toLowerCase().includes(q),
    );
  }, [signals, query]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Vector Search Parameters (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span>Vector Similarity Parameters</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Tune semantic embedding distance, cluster thresholds, and top-K limits.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search Query */}
            <div className="space-y-1.5">
              <Label htmlFor="vector-query">Semantic Query</Label>
              <Input
                id="vector-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter the ranked signals..."
                leftIcon={<Search className="h-4 w-4" />}
                aria-describedby="vector-query-note"
              />
              <p id="vector-query-note" className="text-[11px] text-muted-foreground">
                The API exposes no query-time vector search route. The query filters the ranked
                signals the pipeline produced for this session.
              </p>
            </div>

            {/* Distance Metric */}
            <div className="space-y-1.5">
              <Label htmlFor="metric-select">Distance Metric</Label>
              <Select id="metric-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <SelectOption value="cosine">
                  Cosine Similarity (Normalized Embeddings)
                </SelectOption>
                <SelectOption value="dot">Dot Product (Inner Product)</SelectOption>
                <SelectOption value="euclidean">Euclidean Distance (L2 Norm)</SelectOption>
              </Select>
            </div>

            {/* Cluster Distance Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cluster-thresh-slider">Cluster Threshold</Label>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                  {clusterThreshold.toFixed(2)}
                </span>
              </div>
              <input
                id="cluster-thresh-slider"
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={clusterThreshold}
                onChange={(e) => onUpdateClusterThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.30 (Broad Clusters)</span>
                <span>0.65 (Balanced)</span>
                <span>0.95 (Strict / Identical)</span>
              </div>
            </div>

            {/* Top-K Limit */}
            <div className="space-y-1.5">
              <Label htmlFor="top-k-input">Top-K Ranked Stories Limit</Label>
              <Input
                id="top-k-input"
                type="number"
                min={1}
                max={20}
                value={rankLimit}
                onChange={(e) => onUpdateRankLimit(parseInt(e.target.value, 10) || 10)}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSearch}
              isLoading={isSearching}
              className="w-full gap-1.5 cursor-pointer font-semibold"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Query Semantic Index</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Matched Stories Results Grid (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="flex flex-col h-full border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span>Nearest Neighbor Signals ({visibleSignals.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Embedding distance vectors ranked by pgvector cosine similarity.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {clusterCount !== null && <Badge variant="outline">{clusterCount} clusters</Badge>}
                {rankedCount !== null && <Badge variant="secondary">{rankedCount} stories</Badge>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Semantic Index Unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!error && visibleSignals.length === 0 ? (
              <EmptyState
                title={hasSearched ? "No matching signals" : "No semantic index loaded"}
                description={
                  hasSearched
                    ? "None of the ranked signals for this session match the current query."
                    : "Run the rank step for the active session, then query the semantic index to see the real ranked signals."
                }
                icon={<Search className="h-7 w-7 text-muted-foreground opacity-60" />}
              />
            ) : (
              visibleSignals.map((item) => {
                const isHighConfidence = item.score >= 0.85;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-foreground text-sm leading-snug">
                        {item.title}
                      </div>
                      <Badge
                        variant={isHighConfidence ? "success" : "warning"}
                        className="shrink-0 font-mono text-[11px]"
                      >
                        {(item.score * 100).toFixed(0)}% match
                      </Badge>
                    </div>

                    {item.whyItMatters && (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {item.whyItMatters}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.source}</span>
                        {item.topics.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{item.topics.join(", ")}</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">
                        {item.clusterId}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface RankedEntry {
  position?: number;
  rankScore?: number;
  whyItMatters?: string;
  story?: {
    id?: string;
    canonicalTitle?: string;
    dominantSource?: string;
    topics?: string[];
    clusterId?: string;
  };
}
