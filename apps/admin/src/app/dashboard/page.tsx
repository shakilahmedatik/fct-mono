"use client";

import { createApiClient } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  ArrowUpRight,
  Cpu,
  Database,
  HardDrive,
  Headphones,
  Loader2,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface QueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: "active" | "suspended";
  activity: string;
}

interface PlatformStats {
  totalUsers: number;
  totalDigests: number;
  totalSubscribers: number;
  totalFeedback: number;
}

/**
 * Static description of the known worker queues. This is documentation about
 * the queue names, not a measurement — the counters come from the API.
 */
const QUEUE_DESCRIPTIONS: Record<string, string> = {
  digest: "Crawl signals, semantic clustering, ranking",
  audio: "Kokoro TTS voice synthesis & audio brief packaging",
  telegram: "Instant audio & text broadcast dispatch",
  email: "HTML daily briefing newsletter dispatch",
};

function describeQueue(name: string): string {
  return QUEUE_DESCRIPTIONS[name] ?? "Background worker queue";
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<PlatformStats | null>(null);
  const [queues, setQueues] = React.useState<QueueInfo[]>([]);
  const [recentUsers, setRecentUsers] = React.useState<RecentUser[]>([]);
  const [apiHealthy, setApiHealthy] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const client = createApiClient();

      const [statsRes, queuesRes, usersRes] = await Promise.all([
        client.admin.stats.$get(),
        client.admin.playground.queues.status.$get(),
        client.admin.users.$get({ query: { limit: 5 } }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) {
          setStats({
            totalUsers: data.stats.totalUsers ?? 0,
            totalDigests: data.stats.totalDigests ?? 0,
            totalSubscribers: data.stats.totalSubscribers ?? 0,
            totalFeedback: data.stats.totalFeedback ?? 0,
          });
        }
      } else {
        setLoadError(`Platform metrics are unavailable (HTTP ${statsRes.status}).`);
      }

      if (queuesRes.ok) {
        const data = await queuesRes.json();
        setQueues(Array.isArray(data.queues) ? (data.queues as QueueInfo[]) : []);
      } else {
        setQueues([]);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        const users = Array.isArray(data.users) ? data.users : [];
        setRecentUsers(
          users.map((u: AdminUserRecord) => ({
            id: u.id,
            name: u.name ?? "—",
            email: u.email ?? "—",
            role: u.role ?? "user",
            plan: u.plan ?? "FREE",
            status: u.banned ? ("suspended" as const) : ("active" as const),
            activity: u.createdAt
              ? `Joined ${new Date(u.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : "No sign-up date recorded",
          })),
        );
      } else {
        setRecentUsers([]);
      }

      // The API exposes its own health probe; nothing else is reported for
      // the infrastructure dependencies.
      try {
        const healthRes = await client.health.$get();
        setApiHealthy(healthRes.ok);
      } catch {
        setApiHealthy(false);
      }
    } catch {
      setLoadError("The admin API could not be reached. No metrics are shown.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Platform Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous crawler metrics, pipeline telemetry, and worker queue health.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="gap-2 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        </Card>
      )}

      {/* 4 Platform Metric Tiles using @repo/ui StatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <StatCard
          title="Total Users"
          value={stats ? formatNumber(stats.totalUsers) : "—"}
          icon={<Users className="h-5 w-5 text-accent" />}
          description="Accounts registered on the platform"
        />

        {/* 2. Newsletter Subscribers */}
        <StatCard
          title="Newsletter Subscribers"
          value={stats ? formatNumber(stats.totalSubscribers) : "—"}
          icon={<Radio className="h-5 w-5 text-accent" />}
          description="Active email audience"
        />

        {/* 3. Digests Generated */}
        <StatCard
          title="Digests Generated"
          value={stats ? formatNumber(stats.totalDigests) : "—"}
          icon={<Headphones className="h-5 w-5 text-accent" />}
          description="Master &amp; cohort runs"
        />

        {/* 4. Feedback Records */}
        <StatCard
          title="Feedback Records"
          value={stats ? formatNumber(stats.totalFeedback) : "—"}
          icon={<ShieldCheck className="h-5 w-5 text-accent" />}
          description="Reader ratings collected on digests"
        />
      </div>

      {/* BullMQ Queue Status Table */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">BullMQ Autonomous Queues</CardTitle>
            <CardDescription className="text-xs">
              Real-time telemetry across background worker pools
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {queues.length} Worker Pools
            </Badge>
            <Badge variant={apiHealthy === false ? "destructive" : "success"} className="text-xs">
              {apiHealthy === null
                ? "API Unchecked"
                : apiHealthy
                  ? "API Reachable"
                  : "API Unreachable"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : queues.length === 0 ? (
            <EmptyState
              icon={<Cpu className="h-6 w-6 text-muted-foreground" />}
              title="No Queue Metrics Available"
              description="The background queue broker returned no worker pool metrics."
              action={
                <Button variant="outline" size="sm" onClick={loadData}>
                  Retry Connection
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Waiting</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-right">Health Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((q) => (
                  <TableRow key={q.name}>
                    <TableCell className="font-mono text-xs font-semibold">{q.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {describeQueue(q.name)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={q.waiting > 0 ? "warning" : "secondary"}>{q.waiting}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {q.active > 0 ? (
                        <Badge variant="warning" className="animate-pulse">
                          {q.active} running
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {q.completed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {q.failed > 0 ? (
                        <Badge variant="destructive">{q.failed}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={q.active > 0 ? "success" : "secondary"}>
                        {q.active > 0 ? "Active" : "Idle"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Growth & Activity Telemetry (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Totals Card */}
        <Card className="border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Platform Totals &amp; Telemetry
              </CardTitle>
              <CardDescription className="text-xs">
                Counts reported by the admin API
              </CardDescription>
            </div>
            <Link href="/users">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-accent">
                <span>View Directory</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="text-2xl font-extrabold text-foreground">
                  {stats ? formatNumber(stats.totalUsers) : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Total Users</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats ? formatNumber(stats.totalSubscribers) : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Newsletter Subscribers</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="text-2xl font-extrabold text-muted-foreground">
                  {stats ? formatNumber(stats.totalDigests) : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Digests Generated</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Delivery rate / synthesis duration / replication lag</span>
                <span className="font-semibold text-foreground">Not reported by the API</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pro / free plan split</span>
                <span className="font-semibold text-foreground">Not reported by the API</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups & Activity Card */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Signups & Activity</CardTitle>
              <CardDescription className="text-xs">
                Most recently registered accounts
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Latest 5
            </Badge>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentUsers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6 text-muted-foreground" />}
                title="No Recent Signups"
                description="No recent user activity recorded in the platform database."
              />
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{user.name}</div>
                        <div className="text-muted-foreground truncate">{user.activity}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={user.plan === "PRO" ? "success" : "secondary"}>
                        {user.plan}
                      </Badge>
                      <Badge
                        variant={user.status === "active" ? "success" : "destructive"}
                        className="gap-1"
                      >
                        {user.status === "active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <span>{user.status === "active" ? "Active" : "Suspended"}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure Services Card */}
      <Card className="p-6 space-y-4 border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-foreground">Infrastructure Services</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Core storage, cache, and ML synthesis node status
            </p>
          </div>
          <Badge variant={apiHealthy === false ? "destructive" : "success"} className="gap-1.5">
            {apiHealthy === null ? (
              <span>Health Unchecked</span>
            ) : apiHealthy ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>API Node Reachable</span>
              </>
            ) : (
              <span>API Node Unreachable</span>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">PostgreSQL 17</div>
                <div className="text-xs text-muted-foreground">pgvector enabled</div>
              </div>
            </div>
            <Badge variant="outline">Not reported</Badge>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Valkey 7.2</div>
                <div className="text-xs text-muted-foreground">Queue broker</div>
              </div>
            </div>
            <Badge variant="outline">Not reported</Badge>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">RustFS S3</div>
                <div className="text-xs text-muted-foreground">Audio bucket</div>
              </div>
            </div>
            <Badge variant="outline">Not reported</Badge>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Headphones className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Kokoro TTS</div>
                <div className="text-xs text-muted-foreground">v0.19 engine</div>
              </div>
            </div>
            <Badge variant="outline">Not reported</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface AdminUserRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  plan: string | null;
  banned: boolean | null;
  createdAt: string | null;
}
