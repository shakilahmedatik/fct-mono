"use client";

import { ChevronDown } from "lucide-react";

interface Props {
  sessionId: string;
  pastSessions: { sessionId: string; lastActivity: string | null }[];
  sources: { id: string; enabled: boolean }[];
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
  onClear: () => void;
  onToggleAi: () => void;
  onToggleSources: () => void;
}

export function Header({
  sessionId,
  pastSessions,
  sources,
  onLoadSession,
  onNewSession,
  onClear,
  onToggleAi,
  onToggleSources,
}: Props) {
  const enabledCount = sources.filter((s) => s.enabled).length;
  const otherSessions = pastSessions.filter((s) => s.sessionId !== sessionId);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 text-lg">
            🧪
          </span>
          Pipeline Playground
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step-by-step pipeline execution • Fine-tune parameters • Inspect outputs
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={sessionId}
            onChange={(e) => onLoadSession(e.target.value)}
            className="appearance-none text-xs text-muted-foreground font-mono bg-muted/40 rounded-md pl-2 pr-7 py-1 border border-border/40 outline-none focus:border-accent/60"
            aria-label="Active session"
          >
            <option value={sessionId} disabled>
              {sessionId?.slice(0, 8) || "new session…"}
            </option>
            {otherSessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.sessionId.slice(0, 8)} (
                {s.lastActivity
                  ? new Date(s.lastActivity).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "new"}
                )
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <button
            type="button"
            onClick={onNewSession}
            aria-label="New session"
            className="ml-1 px-2 py-1 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
            title="New Session"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleAi}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors border border-blue-500/20"
        >
          🧠 AI Model
        </button>
        <button
          type="button"
          onClick={onToggleSources}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors border border-border/50"
        >
          ⚙️ Sources ({enabledCount}/{sources.length})
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
