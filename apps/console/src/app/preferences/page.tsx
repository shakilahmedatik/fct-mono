import { Button, Card, Input } from "@repo/ui";

const TOPICS = [
  { id: "ai", label: "Artificial Intelligence", active: true },
  { id: "startups", label: "Startups & Venture", active: true },
  { id: "engineering", label: "Software Architecture", active: true },
  { id: "devops", label: "Cloud & DevOps", active: true },
  { id: "security", label: "Cybersecurity", active: false },
  { id: "frontend", label: "Frontend & Web", active: false },
  { id: "data-science", label: "Data Engineering", active: false },
];

export default function PreferencesPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Intelligence Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your personalized briefing topics, delivery channels, and schedule.
        </p>
      </div>

      {/* Topics */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-base">Tracked Topics</h3>
          <p className="text-xs text-muted-foreground">
            Select topics that our autonomous crawler will prioritize.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                topic.active
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Schedule & Channel */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-base">Delivery Schedule & Channels</h3>
          <p className="text-xs text-muted-foreground">
            When and where you want your briefing delivered.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="delivery-time" className="text-xs font-semibold text-muted-foreground">
              Delivery Time
            </label>
            <Input id="delivery-time" defaultValue="07:00 AM" className="mt-1" />
          </div>
          <div>
            <label
              htmlFor="timezone-select"
              className="text-xs font-semibold text-muted-foreground"
            >
              Timezone
            </label>
            <Input id="timezone-select" defaultValue="UTC" className="mt-1" />
          </div>
        </div>
        <div className="pt-2">
          <label htmlFor="telegram-id" className="text-xs font-semibold text-muted-foreground">
            Telegram Chat ID / Username
          </label>
          <div className="flex gap-2 mt-1">
            <Input id="telegram-id" defaultValue="@shakilahmed" />
            <Button variant="outline">Test Connection</Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">Save Preferences</Button>
      </div>
    </div>
  );
}
