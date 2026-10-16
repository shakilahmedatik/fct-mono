"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
} from "@repo/ui";
import { Layers, Search, Sparkles } from "lucide-react";
import * as React from "react";

interface VectorSearchWorkbenchProps {
  clusterThreshold: number;
  rankLimit: number;
  onUpdateClusterThreshold: (val: number) => void;
  onUpdateRankLimit: (val: number) => void;
  clusterCount: number | null;
  rankedCount: number | null;
}

interface VectorMatch {
  id: string;
  title: string;
  source: string;
  category: string;
  similarity: number;
  snippet: string;
  clusterId: string;
}

const DEFAULT_MATCHES: VectorMatch[] = [
  {
    id: "m_01",
    title: "Postgres 18 commits asynchronous I/O engine for direct block transfers",
    source: "Hacker News",
    category: "Databases",
    similarity: 0.94,
    snippet:
      "Core committers enabled io_uring backed asynchronous I/O across buffer pools, achieving 3.8x throughput on NVMe arrays.",
    clusterId: "cluster-db-kernel",
  },
  {
    id: "m_02",
    title: "Bun 1.3 stabilizes zero-copy native WebSocket transport",
    source: "GitHub Releases",
    category: "Runtimes",
    similarity: 0.88,
    snippet:
      "Direct ring buffer writes allow over 1.2M concurrent persistent connections with sub-megabyte memory overhead.",
    clusterId: "cluster-js-runtime",
  },
  {
    id: "m_03",
    title: "Gemini 2.5 Flash achieves sub-100ms TTFT on live streaming benchmark",
    source: "Google DeepMind Blog",
    category: "AI / LLM",
    similarity: 0.82,
    snippet:
      "Speculative verification draft models deliver unprecedented conversational responsiveness for multi-modal agents.",
    clusterId: "cluster-ai-inference",
  },
  {
    id: "m_04",
    title: "vLLM introduces speculative decoding draft model orchestration",
    source: "arXiv Paper",
    category: "AI / LLM",
    similarity: 0.77,
    snippet:
      "Parallel token drafting slashes latency per token on distributed H100 GPU clusters by 42%.",
    clusterId: "cluster-ai-inference",
  },
];

export function VectorSearchWorkbench({
  clusterThreshold,
  rankLimit,
  onUpdateClusterThreshold,
  onUpdateRankLimit,
  clusterCount,
  rankedCount,
}: VectorSearchWorkbenchProps) {
  const [query, setQuery] = React.useState("asynchronous I/O kernel database runtime");
  const [metric, setMetric] = React.useState("cosine");
  const [isSearching, setIsSearching] = React.useState(false);
  const [matches, setMatches] = React.useState<VectorMatch[]>(DEFAULT_MATCHES);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      // Re-score based on query
      const qLower = query.toLowerCase();
      const updated = DEFAULT_MATCHES.map((m) => {
        const bonus =
          m.title.toLowerCase().includes(qLower.slice(0, 4)) ||
          m.snippet.toLowerCase().includes(qLower.slice(0, 4))
            ? 0.05
            : -0.02;
        return {
          ...m,
          similarity: Math.min(0.99, Math.max(0.65, Number((m.similarity + bonus).toFixed(2)))),
        };
      }).sort((a, b) => b.similarity - a.similarity);
      setMatches(updated);
    }, 400);
  };

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
                placeholder="Search semantic signals..."
                leftIcon={<Search className="h-4 w-4" />}
              />
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
                  <span>Nearest Neighbor Signals ({matches.length})</span>
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
            {matches.map((item) => {
              const isHighConfidence = item.similarity >= 0.85;
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
                      {(item.similarity * 100).toFixed(0)}% match
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed">{item.snippet}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.source}</span>
                      <span>•</span>
                      <span>{item.category}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">
                      {item.clusterId}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
