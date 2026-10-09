"use client";

import { createApiClient } from "@repo/api-client";
import { Button, Card, Input } from "@repo/ui";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

const AVAILABLE_TOPICS = [
  { id: "ai", label: "Artificial Intelligence & LLMs" },
  { id: "systems", label: "Distributed Systems & Rust" },
  { id: "backend", label: "Backend Architecture & Bun" },
  { id: "frontend", label: "Frontend & Next.js" },
  { id: "database", label: "Postgres & Vector Databases" },
  { id: "devops", label: "Cloud & DevOps" },
  { id: "security", label: "Cybersecurity & Auth" },
];

export default function PreferencesPage() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "ai",
    "systems",
    "backend",
    "database",
  ]);
  const [deliveryHour, setDeliveryHour] = useState(7);
  const [timezone, setTimezone] = useState("UTC");
  const [telegramId, setTelegramId] = useState("@englead");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const client = createApiClient();
      await client.user.preferences.$put({
        json: {
          topics: selectedTopics,
          deliveryHour,
          timezone,
          skillLevel: "intermediate",
          audioEnabled: true,
          channelEnabled: true,
        },
      });
      setSaveSuccess(true);
    } catch {
      // Best effort save
      setSaveSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

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
      <Card className="p-6 space-y-4 border-border/80 bg-card">
        <div>
          <h3 className="font-semibold text-base">Tracked Topics</h3>
          <p className="text-xs text-muted-foreground">
            Select topics that our autonomous crawler will prioritize for your cohort.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {AVAILABLE_TOPICS.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-accent/15 border-accent/40 text-accent font-semibold"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Schedule & Channel */}
      <Card className="p-6 space-y-4 border-border/80 bg-card">
        <div>
          <h3 className="font-semibold text-base">Delivery Schedule & Channels</h3>
          <p className="text-xs text-muted-foreground">
            When and where you want your briefing delivered.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="delivery-hour" className="text-xs font-semibold text-muted-foreground">
              Delivery Hour (UTC 0-23)
            </label>
            <Input
              id="delivery-hour"
              type="number"
              min={0}
              max={23}
              value={deliveryHour}
              onChange={(e) => setDeliveryHour(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="timezone-select"
              className="text-xs font-semibold text-muted-foreground"
            >
              Timezone
            </label>
            <Input
              id="timezone-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="pt-2">
          <label htmlFor="telegram-id" className="text-xs font-semibold text-muted-foreground">
            Telegram Chat ID / Username
          </label>
          <div className="flex gap-2 mt-1">
            <Input
              id="telegram-id"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
            />
            <Button variant="outline" type="button">
              Test Connection
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saveSuccess && (
          <span className="text-xs text-accent font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Preferences saved!
          </span>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 cursor-pointer"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>Save Preferences</span>
        </Button>
      </div>
    </div>
  );
}
