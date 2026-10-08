import { Badge, Button, Card } from "@repo/ui";
import { Activity, ArrowUpRight, CheckCircle2, Cpu, RefreshCw, Users } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Platform Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous crawler metrics, user growth, and queue health.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Subscribers</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-3xl font-extrabold">1,428</div>
          <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="h-3 w-3" /> +14.2% this week
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Active Pro Subscriptions</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold">342</div>
          <p className="text-xs text-muted-foreground">$4,104 MRR (Paddle)</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Digests Delivered</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold">18,920</div>
          <p className="text-xs text-muted-foreground">99.8% on-time delivery</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>BullMQ Queues</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold">Healthy</div>
          <p className="text-xs text-emerald-400">4 active worker pools</p>
        </Card>
      </div>

      {/* Services Health */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-base">Infrastructure Services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">PostgreSQL 17</div>
              <div className="text-xs text-muted-foreground">pgvector enabled</div>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Valkey 7.2</div>
              <div className="text-xs text-muted-foreground">Queue broker</div>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">RustFS S3</div>
              <div className="text-xs text-muted-foreground">Audio bucket</div>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
