import { Badge, Button, Card } from "@repo/ui";
import {
  ChevronDown,
  ChevronUp,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type * as React from "react";
import type { DigestDetail } from "./types";

const WAVE_BARS = [
  25, 45, 75, 30, 60, 90, 40, 70, 85, 50, 30, 65, 80, 45, 95, 60, 35, 70, 50, 85, 40, 65, 30, 50,
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface AudioDigestPlayerProps {
  digest: DigestDetail | null;
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  showTranscript: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onCycleSpeed: () => void;
  onSeek: (event: React.MouseEvent<HTMLElement>) => void;
  onNudge: (seconds: number) => void;
  onToggleTranscript: () => void;
}

/**
 * Daily audio digest player.
 *
 * The duration comes from the loaded digest. When the API has no audio brief
 * the card renders an explicit "not generated" state instead of assuming a
 * 3m 45s runtime.
 */
export function AudioDigestPlayer({
  digest,
  isPlaying,
  currentTime,
  playbackSpeed,
  showTranscript,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onCycleSpeed,
  onSeek,
  onNudge,
  onToggleTranscript,
}: AudioDigestPlayerProps) {
  const hasAudio = Boolean(digest?.audioBrief);
  const totalDuration = digest?.audioBrief?.durationSec ?? 0;

  return (
    <Card className="p-6 sm:p-7 border-accent/30 bg-card/90 shadow-md backdrop-blur-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Today&apos;s Audio Digest
              </h2>
              <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px]">
                <Sparkles className="h-2.5 w-2.5" />
                <span>Studio Kokoro Voice</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-story synthesis compiled at 07:00 AM UTC • High-Definition 24kHz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Speed Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCycleSpeed}
            className="h-8 px-2.5 text-xs font-mono font-semibold cursor-pointer"
            title="Click to toggle playback speed"
          >
            {playbackSpeed.toFixed(2).replace(/\.00$/, "")}x
          </Button>
          {/* Transcript Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTranscript}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span>Transcript</span>
            {showTranscript ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!hasAudio ? (
        <p className="text-sm text-muted-foreground">
          No audio brief has been generated for this digest yet.
        </p>
      ) : (
        <>
          {/* Player Controls & Waveform */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkipBack}
                aria-label="Skip backward 15 seconds"
                className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                variant="primary"
                size="icon"
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
                className="h-12 w-12 rounded-full shadow-lg shadow-accent/25 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5 fill-current" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onSkipForward}
                aria-label="Skip forward 15 seconds"
                className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Soundwave Bars & Time Indicator */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-1 h-9 px-1">
                {WAVE_BARS.map((height, i) => {
                  const isPassed = (i / WAVE_BARS.length) * totalDuration <= currentTime;
                  return (
                    <div
                      key={`bar-${i}`}
                      className={`flex-1 rounded-full transition-all duration-200 ${
                        isPassed ? "bg-accent" : "bg-muted-foreground/25"
                      }`}
                      style={{
                        height: `${
                          isPlaying ? Math.max(20, (height * ((i % 3) + 1.2)) % 100) : height
                        }%`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Clickable Progress Bar */}
              <button
                type="button"
                aria-label="Seek audio playback"
                onClick={onSeek}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") onNudge(-5);
                  if (e.key === "ArrowRight") onNudge(5);
                }}
                className="h-2 w-full bg-muted/60 rounded-full cursor-pointer relative overflow-hidden group border-0 p-0 block"
              >
                <div
                  className="h-full bg-accent rounded-full transition-all duration-150"
                  style={{
                    width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                  }}
                />
              </button>

              <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span className="text-[11px] font-sans font-semibold text-accent uppercase tracking-wider">
                  {isPlaying ? "Playing Briefing" : "Paused"}
                </span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>

          {/* Collapsible Transcript Box */}
          {showTranscript && (
            <div className="mt-4 pt-4 border-t border-border/40 space-y-2 rounded-xl bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Narration Script &amp; Synthesis</span>
                <span>Kokoro v0.19</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-serif italic">
                &ldquo;
                {digest?.audioBrief?.script || "No transcript script attached to this briefing."}
                &rdquo;
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
