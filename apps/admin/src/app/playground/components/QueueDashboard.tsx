"use client";

import { Badge, Button } from "@repo/ui";
import { AlertCircle, CheckCircle2, Clock, Play, RotateCcw, X } from "lucide-react";
import * as React from "react";
import { fetchQueueJobs, retryQueueJob } from "../lib/api";
import type { QueueJob, QueueStatus } from "../lib/types";

interface Props {
  queues: QueueStatus[];
  onRefresh: () => void;
}

type JobFilterStatus = "failed" | "active" | "waiting" | "completed";

export function QueueDashboard({ queues, onRefresh }: Props) {
  const [selectedQueue, setSelectedQueue] = React.useState<string | null>(null);
  const [statusTab, setStatusTab] = React.useState<JobFilterStatus>("failed");
  const [jobs, setJobs] = React.useState<QueueJob[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);

  const activeQueue = queues.find((q) => q.name === selectedQueue);

  const loadJobs = React.useCallback(async (queueName: string, status: JobFilterStatus) => {
    setLoadingJobs(true);
    try {
      const result = await fetchQueueJobs(queueName, status, 25);
      setJobs(result);
      if (result.length > 0 && status === "failed") {
        setExpandedJobId(result[0]?.id ?? null);
      }
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedQueue) {
      loadJobs(selectedQueue, statusTab);
    }
  }, [selectedQueue, statusTab, loadJobs]);

  const handleSelectQueue = (name: string, initialTab?: JobFilterStatus) => {
    if (selectedQueue === name && !initialTab) {
      setSelectedQueue(null);
      return;
    }
    const q = queues.find((item) => item.name === name);
    const defaultTab = initialTab || (q && q.failed > 0 ? "failed" : "completed");
    setSelectedQueue(name);
    setStatusTab(defaultTab);
  };

  const handleRetry = async (jobId: string) => {
    if (!selectedQueue) return;
    setRetryingId(jobId);
    try {
      const ok = await retryQueueJob(selectedQueue, jobId);
      if (ok) {
        onRefresh();
        await loadJobs(selectedQueue, statusTab);
      }
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground">BullMQ Queue Dashboard</h3>
          <p className="text-xs text-muted-foreground">
            Monitor background workers, inspect failed runs, and view execution logs.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onRefresh();
            if (selectedQueue) loadJobs(selectedQueue, statusTab);
          }}
          className="text-xs gap-1.5 cursor-pointer h-8"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Queue Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(queues || []).map((q) => {
          const isSelected = selectedQueue === q.name;
          return (
            // biome-ignore lint/a11y/useSemanticElements: card-level click target intentionally wraps status-filter buttons
            <div
              key={q.name}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectQueue(q.name);
                }
              }}
              onClick={() => handleSelectQueue(q.name)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                  : "border-border/60 bg-card/60 hover:border-border/90"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="font-bold font-mono text-xs text-foreground truncate"
                  title={q.name}
                >
                  {q.name}
                </span>
                <Badge variant={q.failed > 0 ? "destructive" : "success"}>
                  {q.failed > 0 ? `${q.failed} failed` : "healthy"}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px] pt-1 border-t border-border/30">
                <button
                  type="button"
                  className="p-1 rounded bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "waiting");
                  }}
                >
                  <div className="text-[9px] text-muted-foreground font-sans">Wait</div>
                  <div className="text-amber-500 font-semibold">{q.waiting}</div>
                </button>
                <button
                  type="button"
                  className="p-1 rounded bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "active");
                  }}
                >
                  <div className="text-[9px] text-muted-foreground font-sans">Active</div>
                  <div className="text-blue-500 font-semibold">{q.active}</div>
                </button>
                <button
                  type="button"
                  className="p-1 rounded bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "completed");
                  }}
                >
                  <div className="text-[9px] text-muted-foreground font-sans">Done</div>
                  <div className="text-emerald-500 font-semibold">{q.completed}</div>
                </button>
                <button
                  type="button"
                  className={`p-1 rounded transition-colors cursor-pointer text-center ${
                    q.failed > 0
                      ? "bg-red-500/20 hover:bg-red-500/30"
                      : "bg-muted/30 hover:bg-muted/60"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "failed");
                  }}
                >
                  <div className="text-[9px] text-muted-foreground font-sans">Fail</div>
                  <div
                    className={
                      q.failed > 0 ? "text-destructive font-bold" : "text-muted-foreground"
                    }
                  >
                    {q.failed}
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Queue Jobs Drawer */}
      {selectedQueue && (
        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground font-mono">{selectedQueue}</span>
              <span className="text-xs text-muted-foreground">• Job Inspector</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={statusTab === "failed" ? "destructive" : "ghost"}
                size="sm"
                onClick={() => setStatusTab("failed")}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Failed ({activeQueue?.failed ?? 0})</span>
              </Button>
              <Button
                type="button"
                variant={statusTab === "active" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusTab("active")}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Active ({activeQueue?.active ?? 0})</span>
              </Button>
              <Button
                type="button"
                variant={statusTab === "waiting" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusTab("waiting")}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                <span>Waiting ({activeQueue?.waiting ?? 0})</span>
              </Button>
              <Button
                type="button"
                variant={statusTab === "completed" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusTab("completed")}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Done ({activeQueue?.completed ?? 0})</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQueue(null)}
                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Job List */}
          {loadingJobs ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Fetching jobs from queue...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No {statusTab} jobs found in {selectedQueue}.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className="rounded-lg border border-border/50 bg-card/60 p-3.5 space-y-2.5 text-xs transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">Job #{job.id}</span>
                        <span className="text-muted-foreground font-mono">[{job.name}]</span>
                        <span className="text-[11px] text-muted-foreground/70">
                          {new Date(job.timestamp).toLocaleString()}
                        </span>
                        {job.attemptsMade > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {job.attemptsMade} attempt{job.attemptsMade > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {statusTab === "failed" && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={retryingId === job.id}
                            onClick={() => handleRetry(job.id)}
                            isLoading={retryingId === job.id}
                            className="h-7 text-xs gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry Job</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer underline"
                        >
                          {isExpanded ? "Hide payload" : "View payload"}
                        </Button>
                      </div>
                    </div>

                    {/* Failed Reason Details Log Box */}
                    {job.failedReason && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-destructive font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Failure Details / Exception:</span>
                        </div>
                        <pre className="font-mono text-[11px] text-destructive/90 whitespace-pre-wrap wrap-break-word leading-relaxed overflow-x-auto">
                          {job.failedReason}
                        </pre>
                      </div>
                    )}

                    {/* Job Payload */}
                    {isExpanded && job.data && (
                      <div className="rounded-md border border-border/40 bg-muted/20 p-2.5">
                        <div className="text-[10px] text-muted-foreground font-semibold mb-1">
                          Job Data:
                        </div>
                        <pre className="font-mono text-[11px] text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(job.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
