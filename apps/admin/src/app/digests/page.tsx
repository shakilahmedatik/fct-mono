"use client";

import { createApiClient } from "@repo/api-client";
import { Badge, Card } from "@repo/ui";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminDigestRow {
  id: string;
  title: string | null;
  status: string;
  digestDate: string;
  isMaster: boolean;
  user?: {
    name: string;
    email: string;
  } | null;
  audioBrief?: {
    durationSec: number | null;
    status: string;
  } | null;
}

export default function AdminDigestsPage() {
  const [digests, setDigests] = useState<AdminDigestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDigests() {
      try {
        const client = createApiClient();
        const res = await client.admin.digests.$get();
        if (res.ok) {
          const data = await res.json();
          setDigests(data.digests as AdminDigestRow[]);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }

    loadDigests();
  }, []);

  const displayDigests = digests.length
    ? digests
    : [
        {
          id: "1",
          title: "Master Tech Briefing — Oct 9",
          status: "generated",
          digestDate: new Date().toISOString(),
          isMaster: true,
          user: null,
          audioBrief: { durationSec: 91, status: "ready" },
        },
      ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Pipeline Delivery Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autonomous ingest, clustering, ranking, and audio generation run history.
        </p>
      </div>

      <Card className="p-6 space-y-4 border-border/80 bg-card">
        <h3 className="font-semibold text-base">Recent Executions</h3>

        {isLoading && digests.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span>Loading pipeline audit log...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {displayDigests.map((digest) => {
              const recipientName = digest.isMaster
                ? "Global Master Brief"
                : digest.user?.name || "Subscriber";
              const timeStr = new Date(digest.digestDate).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={digest.id}
                  className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {digest.title || "Daily Tech Briefing"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recipient: {recipientName} • Time: {timeStr}
                      {digest.audioBrief?.durationSec
                        ? ` • Audio: ${Math.round(digest.audioBrief.durationSec)}s`
                        : ""}
                    </div>
                  </div>
                  <Badge
                    variant={
                      digest.status === "delivered" || digest.status === "generated"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {digest.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
