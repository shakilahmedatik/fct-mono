"use client";

import { AlertCircle, CheckCircle2, Clock, Play, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchQueueJobs, retryQueueJob } from "../lib/api";
import type { QueueJob, QueueStatus } from "../lib/types";

interface Props {
  queues: QueueStatus[];
  onRefresh: () => void;
}

type JobFilterStatus = "failed" | "active" | "waiting" | "completed";

export function QueueDashboard({ queues, onRefresh }: Props) {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<JobFilterStatus>("failed");
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const activeQueue = queues.find((q) => q.name === selectedQueue);

  const loadJobs = useCallback(async (queueName: string, status: JobFilterStatus) => {
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

  useEffect(() => {
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
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">BullMQ Queue Dashboard</h3>
          <p className="text-xs text-muted-foreground">
            Monitor background workers, inspect failed runs, and view execution logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onRefresh();
            if (selectedQueue) loadJobs(selectedQueue, statusTab);
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5 font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh
        </button>
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
              onClick={() => handleSelectQueue(q.name)}
              onKeyDown={(e) => e.key === "Enter" && handleSelectQueue(q.name)}
              className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all text-left ${
                isSelected
                  ? "border-primary/70 bg-primary/5 ring-1 ring-primary/40 shadow-sm"
                  : "border-border/40 bg-muted/10 hover:border-border/80 hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs truncate max-w-[170px]" title={q.name}>
                  {q.name}
                </span>
                {isSelected && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                    Inspecting
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "waiting");
                  }}
                  className="rounded hover:bg-muted/40 p-1 transition-colors"
                >
                  <div className="text-base font-bold text-amber-400">{q.waiting}</div>
                  <div className="text-[10px] text-muted-foreground">Waiting</div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "active");
                  }}
                  className="rounded hover:bg-muted/40 p-1 transition-colors"
                >
                  <div className="text-base font-bold text-blue-400">{q.active}</div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "completed");
                  }}
                  className="rounded hover:bg-muted/40 p-1 transition-colors"
                >
                  <div className="text-base font-bold text-emerald-400">{q.completed}</div>
                  <div className="text-[10px] text-muted-foreground">Done</div>
                </button>
              </div>

              {q.failed > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectQueue(q.name, "failed");
                  }}
                  className="w-full text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg px-2 py-1.5 text-center font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {q.failed} failed — View Error
                </button>
              ) : (
                <div className="text-[11px] text-muted-foreground/60 text-center py-0.5">
                  Click to inspect jobs
                </div>
              )}
            </div>
          );
        })}
        {(queues?.length || 0) === 0 && (
          <div className="col-span-4 text-muted-foreground/50 text-sm text-center py-6">
            Loading queue status...
          </div>
        )}
      </div>

      {/* Selected Queue Job Inspector Drawer */}
      {selectedQueue && (
        <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {selectedQueue}
              </span>
              <span className="text-xs text-muted-foreground">Jobs Inspector</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusTab("failed")}
                className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                  statusTab === "failed"
                    ? "bg-red-500/20 text-red-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                Failed ({activeQueue?.failed ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("active")}
                className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                  statusTab === "active"
                    ? "bg-blue-500/20 text-blue-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play className="w-3 h-3" />
                Active ({activeQueue?.active ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("waiting")}
                className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                  statusTab === "waiting"
                    ? "bg-amber-500/20 text-amber-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-3 h-3" />
                Waiting ({activeQueue?.waiting ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("completed")}
                className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                  statusTab === "completed"
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Done ({activeQueue?.completed ?? 0})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQueue(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/50 transition-colors"
              title="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {job.attemptsMade} attempt{job.attemptsMade > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {statusTab === "failed" && (
                          <button
                            type="button"
                            disabled={retryingId === job.id}
                            onClick={() => handleRetry(job.id)}
                            className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw
                              className={`w-3 h-3 ${retryingId === job.id ? "animate-spin" : ""}`}
                            />
                            {retryingId === job.id ? "Retrying..." : "Retry Job"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="text-muted-foreground hover:text-foreground text-[11px] underline"
                        >
                          {isExpanded ? "Hide payload" : "View payload"}
                        </button>
                      </div>
                    </div>

                    {/* Failed Reason Details Log Box */}
                    {job.failedReason && (
                      <div className="rounded-md border border-red-500/30 bg-red-950/25 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Failure Details / Exception:
                        </div>
                        <pre className="font-mono text-[11px] text-red-200/90 whitespace-pre-wrap wrap-break-word leading-relaxed overflow-x-auto">
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
