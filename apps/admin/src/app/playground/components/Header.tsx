"use client";

import { Button, Select, SelectOption } from "@repo/ui";
import { Plus } from "lucide-react";
import { ClearSessionDialog } from "./ClearSessionDialog";

interface Props {
  sessionId: string;
  pastSessions: { sessionId: string; lastActivity: string | null }[];
  sources: { id: string; enabled: boolean }[];
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
  onClear: () => void;
  onToggleAi: () => void;
  onToggleAudio: () => void;
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
  onToggleAudio,
  onToggleSources,
}: Props) {
  const enabledCount = sources.filter((s) => s.enabled).length;
  const otherSessions = pastSessions.filter((s) => s.sessionId !== sessionId);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 text-lg">
            🧪
          </span>
          Pipeline Playground
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step-by-step pipeline execution • Fine-tune parameters • Inspect outputs
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Session Selector */}
        <div className="flex items-center gap-1.5">
          <div className="w-36 sm:w-44">
            <Select
              value={sessionId}
              onChange={(e) => onLoadSession(e.target.value)}
              aria-label="Active session"
              className="h-8 text-xs font-mono py-1"
            >
              <SelectOption value={sessionId}>
                {sessionId?.slice(0, 8) || "new session…"} (active)
              </SelectOption>
              {otherSessions.map((s) => (
                <SelectOption key={s.sessionId} value={s.sessionId}>
                  {s.sessionId.slice(0, 8)} (
                  {s.lastActivity
                    ? new Date(s.lastActivity).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "new"}
                  )
                </SelectOption>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewSession}
            aria-label="New session"
            className="h-8 px-2 text-xs cursor-pointer"
            title="New Session"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* View Toggle Buttons */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleAi}
          className="h-8 text-xs font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
        >
          🧠 AI Model
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleAudio}
          className="h-8 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
        >
          🔊 Voice TTS
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleSources}
          className="h-8 text-xs font-semibold cursor-pointer"
        >
          ⚙️ Sources ({enabledCount}/{sources.length})
        </Button>

        {/* Destructive Clear with Dialog confirmation */}
        <ClearSessionDialog sessionId={sessionId} onConfirmClear={onClear} />
      </div>
    </div>
  );
}
