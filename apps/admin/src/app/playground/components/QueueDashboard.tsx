"use client";

import type { QueueStatus } from "../lib/types";

interface Props {
  queues: QueueStatus[];
  onRefresh: () => void;
}

export function QueueDashboard({ queues, onRefresh }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">BullMQ Queue Dashboard</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs px-2 py-1 rounded bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(queues || []).map((q) => (
          <div
            key={q.name}
            className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-2"
          >
            <div className="font-semibold text-xs truncate">{q.name}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-amber-400">{q.waiting}</div>
                <div className="text-[10px] text-muted-foreground">Waiting</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">{q.active}</div>
                <div className="text-[10px] text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">{q.completed}</div>
                <div className="text-[10px] text-muted-foreground">Done</div>
              </div>
            </div>
            {q.failed > 0 && (
              <div className="text-xs text-red-400 bg-red-500/5 rounded px-2 py-1 text-center">
                {q.failed} failed
              </div>
            )}
          </div>
        ))}
        {(queues?.length || 0) === 0 && (
          <div className="col-span-4 text-muted-foreground/50 text-sm text-center py-4">
            Loading queue status...
          </div>
        )}
      </div>
    </div>
  );
}
