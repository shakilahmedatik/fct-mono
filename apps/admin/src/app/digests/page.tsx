"use client";

import { createApiClient } from "@repo/api-client";
import { Alert, AlertDescription, AlertTitle, Button, Card } from "@repo/ui";
import { RefreshCw, Sparkles, X } from "lucide-react";
import * as React from "react";
import { DigestDetail } from "./components/digest-detail";
import { DigestQueue } from "./components/digest-queue";
import { type AdminDigestRow, PAGE_SIZE } from "./types";

interface ActionFeedback {
  type: "success" | "info" | "warning" | "destructive";
  title: string;
  message: string;
}

export default function AdminDigestsPage() {
  const [digests, setDigests] = React.useState<AdminDigestRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState<number | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isTriggering, setIsTriggering] = React.useState(false);

  // Active selected digest
  const activeDigest = digests.find((d) => d.id === selectedId) ?? digests[0];

  // Script text is read-only: the API cannot persist a rewritten script.
  const [scriptText, setScriptText] = React.useState(activeDigest?.audioBrief?.script || "");

  // Contextual feedback banner
  const [feedback, setFeedback] = React.useState<ActionFeedback | null>(null);

  // Sync scriptText when activeDigest changes
  React.useEffect(() => {
    if (activeDigest) {
      setScriptText(activeDigest.audioBrief?.script || "");
    }
  }, [activeDigest]);

  // Load from API
  const loadDigests = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createApiClient();
      const res = await client.admin.digests.$get({ query: { limit: PAGE_SIZE, offset } });
      if (!res.ok) {
        setDigests([]);
        setTotal(null);
        setLoadError(`The digest log could not be loaded (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      const rows: AdminDigestRow[] = (Array.isArray(data.digests) ? data.digests : []).map(
        (d: AdminDigestRecord) => ({
          id: d.id,
          title: d.title ?? null,
          status: d.status ?? "pending",
          digestDate: d.digestDate ?? "",
          isMaster: Boolean(d.isMaster),
          cohortKey: d.cohortKey ?? null,
          user: d.user ?? null,
          audioBrief: d.audioBrief ?? null,
        }),
      );
      setDigests(rows);
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      setDigests([]);
      setTotal(null);
      setLoadError("The digest log could not be loaded. No digests are shown.");
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  React.useEffect(() => {
    loadDigests();
  }, [loadDigests]);

  // Word count & duration calculations
  const wordCount = React.useMemo(() => {
    return scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  }, [scriptText]);

  const estimatedDurationSec = Math.round((wordCount / 150) * 60);

  // Trigger a pipeline run. `POST /digests/trigger` is the real endpoint.
  const handleTriggerRun = async () => {
    setIsTriggering(true);
    setFeedback(null);
    try {
      const client = createApiClient();
      const res = await client.digests.trigger.$post();
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as unknown as {
          error?: string;
        } | null;
        setFeedback({
          type: "destructive",
          title: "Pipeline Run Not Triggered",
          message:
            errorData?.error ??
            `The API rejected the trigger request (HTTP ${res.status}). No run was started.`,
        });
        return;
      }
      setFeedback({
        type: "success",
        title: "Pipeline Triggered",
        message: "The digest generation run was accepted by the API.",
      });
    } catch {
      setFeedback({
        type: "destructive",
        title: "Pipeline Run Not Triggered",
        message: "The API could not be reached. No run was started.",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const effectiveTotal = total ?? digests.length;
  const canPageBack = offset > 0;
  const canPageForward = effectiveTotal > offset + PAGE_SIZE;

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Digest Curation &amp; Audio Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review daily briefings, inspect audio narration scripts, and trigger generation jobs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerRun}
            disabled={isTriggering}
            isLoading={isTriggering}
            className="gap-2 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Trigger Run</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDigests}
            disabled={isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        </Card>
      )}

      {/* 2. Contextual Feedback Alert Banner */}
      {feedback && (
        <Alert variant={feedback.type} role="status">
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{feedback.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedback(null)}
              className="h-6 w-6 p-0 cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 3. Master-Detail Curation Studio (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DigestQueue
          digests={digests}
          selectedId={activeDigest?.id ?? null}
          onSelect={setSelectedId}
          isLoading={isLoading}
        />

        {activeDigest ? (
          <DigestDetail
            digest={activeDigest}
            scriptText={scriptText}
            wordCount={wordCount}
            estimatedDurationSec={estimatedDurationSec}
            onScriptChange={(value) => setScriptText(value)}
            onResetScript={() => setScriptText(activeDigest.audioBrief?.script || "")}
          />
        ) : (
          <div className="lg:col-span-7">
            <Card className="p-12 text-center border-border/80 bg-card">
              <p className="text-muted-foreground text-sm">
                {isLoading ? "Loading digests…" : "Select a digest from the queue to curate."}
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total !== null && total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} digests
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPageBack || isLoading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="h-8 text-xs cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canPageForward || isLoading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="h-8 text-xs cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminDigestRecord {
  id: string;
  title: string | null;
  status: string | null;
  digestDate: string | null;
  isMaster: boolean | null;
  cohortKey: string | null;
  user: { name: string; email: string } | null;
  audioBrief: {
    id: string;
    status: string;
    script: string | null;
    audioUrl: string | null;
    durationSec: number | null;
    provider: string | null;
    deliveryChannel: string | null;
  } | null;
}
