import { Badge, Card } from "@repo/ui";

const RECENT_DIGESTS = [
  {
    id: "1",
    title: "Daily Audio Digest — Oct 8",
    user: "Shakil Ahmed",
    status: "delivered",
    time: "07:00 AM",
  },
  {
    id: "2",
    title: "Daily Audio Digest — Oct 8",
    user: "Sarah Jenkins",
    status: "delivered",
    time: "07:00 AM",
  },
  {
    id: "3",
    title: "Global Master Brief — Oct 8",
    user: "System",
    status: "generated",
    time: "06:45 AM",
  },
];

export default function AdminDigestsPage() {
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

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-base">Recent Executions</h3>
        <div className="space-y-3">
          {RECENT_DIGESTS.map((digest) => (
            <div
              key={digest.id}
              className="p-4 rounded-xl border border-border/30 bg-muted/20 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-sm">{digest.title}</div>
                <div className="text-xs text-muted-foreground">
                  Recipient: {digest.user} • Time: {digest.time}
                </div>
              </div>
              <Badge variant="success">{digest.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
