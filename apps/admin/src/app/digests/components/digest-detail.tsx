import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Switch,
  Textarea,
} from "@repo/ui";
import { Ban, Check, CheckCircle2, Clock, Headphones, Play, RefreshCw, Send } from "lucide-react";
import type { AdminDigestRow } from "../types";

export interface DigestDetailProps {
  digest: AdminDigestRow;
  scriptText: string;
  wordCount: number;
  estimatedDurationSec: number;
  onScriptChange: (value: string) => void;
  onResetScript: () => void;
}

/**
 * Curation studio for the selected digest.
 *
 * The admin API exposes read access to digests plus the ban endpoint on
 * users — it has no route to publish a digest, rewrite its narration script,
 * re-synthesise its audio or cancel a queued job. Those controls are
 * therefore rendered disabled with an explicit explanation instead of
 * simulating a success.
 */
export function DigestDetail({
  digest,
  scriptText,
  wordCount,
  estimatedDurationSec,
  onScriptChange,
  onResetScript,
}: DigestDetailProps) {
  const hasScript = Boolean(digest.audioBrief?.script);

  return (
    <div className="lg:col-span-7 space-y-6">
      {/* 1. Publication Status Switch Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {digest.title || "Daily Briefing"}
              </CardTitle>
              <CardDescription className="text-xs">
                Target Audience:{" "}
                <span className="font-medium text-foreground">
                  {digest.isMaster ? "Global Master Audience" : digest.user?.name || "Subscriber"}
                </span>
              </CardDescription>
            </div>

            {/* Publication Status dynamic badge */}
            <Badge
              variant={digest.status === "delivered" ? "success" : "warning"}
              className="gap-1.5"
            >
              {digest.status === "delivered" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Published</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Draft / In Review</span>
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <Switch
              id="publication-status-switch"
              checked={digest.status === "delivered"}
              disabled
              label="Publication Status"
              description="The admin API exposes no endpoint that changes a digest's publication status, so this control is read-only."
            />
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <span>Distribution channel recorded for this brief:</span>
            <Badge variant="outline">{digest.audioBrief?.deliveryChannel || "Not reported"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 2. Audio Script Editor Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Headphones className="h-4 w-4 text-accent" />
                <span>Audio Script Editor</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Synthesized narration script for the Kokoro v0.19 neural voice engine.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary">{wordCount} words</Badge>
              <Badge variant="outline">~{estimatedDurationSec}s duration</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="narration-script"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block"
            >
              Narration Script
            </label>
            <Textarea
              id="narration-script"
              name="narration-script"
              rows={6}
              value={scriptText}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder="No narration script is attached to this digest."
              className="font-mono text-xs leading-relaxed"
              disabled
              aria-describedby="narration-script-note"
            />
            <p id="narration-script-note" className="text-[11px] text-muted-foreground">
              {hasScript
                ? "The admin API exposes no endpoint that rewrites a stored narration script, so this script is read-only."
                : "This digest has no narration script attached."}
            </p>
          </div>

          {/* Audio Preview Player if ready */}
          {digest.audioBrief?.status === "ready" && (
            <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {digest.audioBrief.provider || "Unknown"} Spoken Narration
                  </div>
                  <div className="text-muted-foreground">
                    Rendered duration: {Math.round(digest.audioBrief.durationSec ?? 0)}s
                    {digest.audioBrief.audioUrl ? " • audio available" : " • no audio file"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="success">Synthesized</Badge>
                {digest.audioBrief.audioUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 cursor-pointer text-xs"
                    onClick={() => {
                      window.open(digest.audioBrief?.audioUrl ?? "#", "_blank", "noreferrer");
                    }}
                  >
                    <Play className="h-3 w-3" />
                    <span>Play Audio</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled
            onClick={onResetScript}
            className="text-xs text-muted-foreground cursor-not-allowed"
          >
            Reset Changes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled
            onClick={onResetScript}
            className="gap-1.5 text-xs font-semibold cursor-not-allowed"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Narration Script</span>
          </Button>
        </CardFooter>
      </Card>

      {/* 3. Action Controls Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pipeline Execution Actions</CardTitle>
          <CardDescription className="text-xs">
            These operations are not exposed by the admin API and are disabled rather than
            simulated.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Regenerate Audio (Button outline) */}
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-1.5 text-xs font-semibold cursor-not-allowed"
            >
              <RefreshCw className="h-3.5 w-3.5 text-accent" />
              <span>Regenerate Audio</span>
            </Button>

            {/* Publish Briefing (Button primary) */}
            <Button
              variant="primary"
              size="sm"
              disabled
              className="gap-1.5 text-xs font-semibold cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish Briefing</span>
            </Button>

            {/* Cancel Job (Button destructive) */}
            <Button
              variant="destructive"
              size="sm"
              disabled
              className="gap-1.5 text-xs font-semibold cursor-not-allowed"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel Job</span>
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            The API exposes no route to publish a digest, re-synthesise its audio or cancel a queued
            job for an existing digest row. Use the AI Playground to run those steps against a
            pipeline session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
