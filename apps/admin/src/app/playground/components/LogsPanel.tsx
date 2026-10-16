"use client";

import { Button } from "@repo/ui";
import { ArrowDown, ClipboardCopy, Download } from "lucide-react";
import * as React from "react";
import type { LogEntry } from "../lib/types";

interface Props {
  logs: LogEntry[];
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onJumpToLatest: () => void;
  isScrolledUp: boolean;
}

const LEVEL_CLASS: Record<LogEntry["level"], string> = {
  info: "text-foreground/70",
  warn: "text-amber-500 bg-amber-500/10",
  error: "text-destructive bg-destructive/10",
  success: "text-emerald-500 bg-emerald-500/10",
};

export function LogsPanel({ logs, logsEndRef, onScroll, onJumpToLatest, isScrolledUp }: Props) {
  const [copied, setCopied] = React.useState(false);

  function copyLogs() {
    const text = logs
      .map(
        (l) =>
          `${new Date(l.timestamp).toLocaleTimeString()} [${l.level.toUpperCase()}] ${l.message}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadLogs() {
    const text = logs
      .map((l) => `${l.timestamp} [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playground-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 min-h-[400px] max-h-[600px] flex flex-col shadow-xs">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
          {isScrolledUp && <span className="ml-2 text-amber-500">— paused (scrolled up)</span>}
        </span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyLogs}
            className="text-xs h-7 px-2 cursor-pointer gap-1"
            title="Copy logs to clipboard"
          >
            <ClipboardCopy className="h-3 w-3" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadLogs}
            className="text-xs h-7 px-2 cursor-pointer gap-1"
          >
            <Download className="h-3 w-3" />
            <span>Download</span>
          </Button>
        </div>
      </div>
      <div onScroll={onScroll} className="flex-1 overflow-auto font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-muted-foreground/50 py-12 text-center">
            No logs yet. Execute a step to begin.
          </div>
        )}
        {logs.map((log, i) => (
          <div
            key={`${log.timestamp}-${i}`}
            className={`px-2 py-0.5 rounded ${LEVEL_CLASS[log.level]}`}
          >
            <span className="text-muted-foreground/50 mr-2">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
      {isScrolledUp && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onJumpToLatest}
          className="mt-2 self-end text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <ArrowDown className="h-3 w-3" />
          <span>Jump to latest</span>
        </Button>
      )}
    </div>
  );
}
