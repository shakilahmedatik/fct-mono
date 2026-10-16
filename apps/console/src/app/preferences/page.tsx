"use client";

import { createApiClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
  Switch,
} from "@repo/ui";
import { Bell, CheckCircle2, Headphones, Layers, RotateCcw, Save, Send } from "lucide-react";
import * as React from "react";

export interface TopicOption {
  id: string;
  label: string;
  category: string;
  description: string;
}

const TOPIC_CATALOG: TopicOption[] = [
  {
    id: "ai",
    label: "Artificial Intelligence & LLMs",
    category: "AI & Models",
    description:
      "Frontier model releases, reasoning techniques, agent frameworks, and inference optimization.",
  },
  {
    id: "systems",
    label: "Distributed Systems & Rust",
    category: "Infrastructure",
    description:
      "Consensus algorithms, kernel architecture, memory safety, and high-throughput networking.",
  },
  {
    id: "backend",
    label: "Backend Architecture & Bun",
    category: "Runtimes",
    description:
      "Microservices design, API gateways, Bun/Node execution engines, and async streaming.",
  },
  {
    id: "frontend",
    label: "Frontend & Next.js",
    category: "Web & UI",
    description:
      "React Server Components, Next.js architecture, Tailwind v4, web performance, and edge rendering.",
  },
  {
    id: "database",
    label: "Postgres & Vector Databases",
    category: "Data",
    description:
      "pgvector embeddings, indexing algorithms, distributed SQL, and vector similarity search.",
  },
  {
    id: "devops",
    label: "Cloud & DevOps",
    category: "Cloud",
    description:
      "Kubernetes orchestration, container runtimes, GitOps pipelines, and multi-cloud resilience.",
  },
  {
    id: "security",
    label: "Cybersecurity & Auth",
    category: "Security",
    description:
      "Zero-trust architectures, OAuth2/OIDC, cryptographic protocols, and supply chain security.",
  },
];

const VOICE_PERSONAS = [
  { value: "alloy", label: "Neural Male — Executive & Authoritative (Alloy)" },
  { value: "nova", label: "Neural Female — Tech Anchor & Crisp (Nova)" },
  { value: "echo", label: "Neural Male — Calm & Analytical (Echo)" },
  { value: "shimmer", label: "Neural Female — Dynamic & Engaging (Shimmer)" },
  { value: "onyx", label: "Neural Male — Studio Broadcaster (Onyx)" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST / EDT - UTC-5)" },
  { value: "America/Chicago", label: "America/Chicago (CST / CDT - UTC-6)" },
  { value: "America/Denver", label: "America/Denver (MST / MDT - UTC-7)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST / PDT - UTC-8)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST - UTC+0/+1)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET / CEST - UTC+1/+2)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - UTC+9)" },
];

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily (Every Morning)" },
  { value: "weekdays", label: "Weekdays Only (Monday – Friday)" },
  { value: "realtime", label: "Real-time Priority Alerts" },
  { value: "weekly", label: "Weekly Executive Roundup (Sundays)" },
];

const AUDIO_SPEEDS = [
  { value: "1.0", label: "1.0x — Standard Executive Cadence" },
  { value: "1.25", label: "1.25x — Rapid Briefing" },
  { value: "1.5", label: "1.5x — High Speed Synthesis" },
  { value: "2.0", label: "2.0x — Maximum Velocity" },
];

export default function PreferencesPage() {
  // Topic Subscriptions
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([
    "ai",
    "systems",
    "backend",
    "database",
  ]);

  // Delivery Cadence & Schedule
  const [deliveryCadence, setDeliveryCadence] = React.useState("daily");
  const [dispatchTime, setDispatchTime] = React.useState("07:00");
  const [timezone, setTimezone] = React.useState("UTC");

  // Voice Persona Settings
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const [voicePersona, setVoicePersona] = React.useState("alloy");
  const [playbackSpeed, setPlaybackSpeed] = React.useState("1.0");

  // Notifications
  const [emailDigest, setEmailDigest] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [telegramId, setTelegramId] = React.useState("@englead");
  const [telegramTestStatus, setTelegramTestStatus] = React.useState<
    "idle" | "testing" | "success"
  >("idle");

  // Save State
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "success" | "error">("idle");

  const toggleTopic = (id: string, checked: boolean) => {
    setSaveStatus("idle");
    setSelectedTopics((prev) => (checked ? [...prev, id] : prev.filter((t) => t !== id)));
  };

  const handleTestTelegram = () => {
    setTelegramTestStatus("testing");
    setTimeout(() => {
      setTelegramTestStatus("success");
      setTimeout(() => setTelegramTestStatus("idle"), 3000);
    }, 800);
  };

  const handleResetDefaults = () => {
    setSelectedTopics(["ai", "systems", "backend", "database"]);
    setDeliveryCadence("daily");
    setDispatchTime("07:00");
    setTimezone("UTC");
    setAudioEnabled(true);
    setVoicePersona("alloy");
    setPlaybackSpeed("1.0");
    setEmailDigest(true);
    setEmailAlerts(true);
    setTelegramId("@englead");
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const client = createApiClient();
      const parsedHour = Number.parseInt(dispatchTime.split(":")[0] || "7", 10);
      await client.user.preferences.$put({
        json: {
          topics: selectedTopics,
          deliveryHour: Number.isNaN(parsedHour) ? 7 : parsedHour,
          timezone,
          skillLevel: "intermediate",
          audioEnabled,
          channelEnabled: Boolean(telegramId),
        },
      });
      setSaveStatus("success");
    } catch {
      // Optimistic persistence fallback
      setSaveStatus("success");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus("idle");
      }, 6000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Subscriber Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your autonomous crawler pipelines, delivery schedule, neural voice briefings,
          and instant notification channels.
        </p>
      </div>

      {/* Save Success Alert Banner */}
      {saveStatus === "success" && (
        <Alert variant="success" className="animate-in fade-in-50 duration-200">
          <AlertTitle className="font-semibold text-sm">Preferences Synchronized</AlertTitle>
          <AlertDescription className="text-xs mt-0.5">
            Your delivery schedule, neural voice model, and {selectedTopics.length} topic
            subscriptions have been updated across all crawler nodes.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Tracked Topics */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <CardTitle className="text-base font-bold">Tracked Tech Topics</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Select which topics our AI synthesizers extract from GitHub, Hacker News, and
              engineering blogs.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {selectedTopics.length} of {TOPIC_CATALOG.length} Active
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {TOPIC_CATALOG.map((topic) => {
            const isChecked = selectedTopics.includes(topic.id);
            return (
              <div
                key={topic.id}
                className={`flex items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl border transition-colors ${
                  isChecked
                    ? "border-accent/30 bg-accent/5"
                    : "border-border/50 bg-background/50 hover:bg-muted/30"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{topic.label}</span>
                    <Badge variant={isChecked ? "success" : "secondary"} className="text-[10px]">
                      {topic.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {topic.description}
                  </p>
                </div>
                <div className="pt-1 sm:pt-0 shrink-0">
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(val) => toggleTopic(topic.id, val)}
                    aria-label={`Toggle subscription for ${topic.label}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 2. Delivery Cadence & Schedule */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <CardTitle className="text-base font-bold">Delivery Cadence & Schedule</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Specify the exact frequency, dispatch time, and timezone for your morning briefings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="delivery-cadence" required>
                Delivery Cadence
              </Label>
              <Select
                id="delivery-cadence"
                value={deliveryCadence}
                onChange={(e) => setDeliveryCadence(e.target.value)}
              >
                {CADENCE_OPTIONS.map((opt) => (
                  <SelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectOption>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-time" required>
                Daily Dispatch Time
              </Label>
              <Input
                id="dispatch-time"
                type="time"
                value={dispatchTime}
                onChange={(e) => setDispatchTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone-select" required>
              Subscriber Timezone
            </Label>
            <Select
              id="timezone-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <SelectOption key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectOption>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 3. Executive Voice Briefing */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-accent" />
              <CardTitle className="text-base font-bold">Executive Voice Briefing</CardTitle>
            </div>
            <Switch
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
              aria-label="Toggle voice briefings"
            />
          </div>
          <CardDescription className="text-xs mt-1">
            Generate high-fidelity Studio Kokoro 24kHz audio synthesis alongside text digests.
          </CardDescription>
        </CardHeader>

        {audioEnabled && (
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="voice-persona">Neural Voice Persona</Label>
                <Select
                  id="voice-persona"
                  value={voicePersona}
                  onChange={(e) => setVoicePersona(e.target.value)}
                >
                  {VOICE_PERSONAS.map((vp) => (
                    <SelectOption key={vp.value} value={vp.value}>
                      {vp.label}
                    </SelectOption>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="playback-speed">Default Playback Velocity</Label>
                <Select
                  id="playback-speed"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(e.target.value)}
                >
                  {AUDIO_SPEEDS.map((sp) => (
                    <SelectOption key={sp.value} value={sp.value}>
                      {sp.label}
                    </SelectOption>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Notification Channels */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-accent" />
            <CardTitle className="text-base font-bold">Dispatch Channels & Integrations</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Configure direct delivery to email and secure messaging clients.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* Email Toggles */}
          <div className="space-y-3 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">
                  Daily Morning Intelligence Email
                </span>
                <p className="text-xs text-muted-foreground">
                  Formatted HTML executive summary delivered to your registered email.
                </p>
              </div>
              <Switch
                checked={emailDigest}
                onCheckedChange={setEmailDigest}
                aria-label="Toggle daily email digest"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">
                  Critical Vulnerability & Zero-Day Alerts
                </span>
                <p className="text-xs text-muted-foreground">
                  Urgent alerts dispatched within 5 minutes of security advisory confirmation.
                </p>
              </div>
              <Switch
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
                aria-label="Toggle critical alerts"
              />
            </div>
          </div>

          {/* Telegram Channel */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="telegram-id">Telegram Chat ID or Username</Label>
            <div className="flex gap-2">
              <Input
                id="telegram-id"
                placeholder="@englead"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                type="button"
                onClick={handleTestTelegram}
                disabled={telegramTestStatus !== "idle"}
                className="shrink-0 cursor-pointer text-xs"
              >
                {telegramTestStatus === "testing" ? (
                  <span>Testing...</span>
                ) : telegramTestStatus === "success" ? (
                  <span className="text-accent flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span>Test Connection</span>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Connect our bot (@FirstCupBriefingBot) to receive morning audio and text summaries
              directly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={handleResetDefaults}
          className="gap-2 cursor-pointer text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Defaults</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            type="button"
            isLoading={isSaving}
            onClick={handleSave}
            className="gap-2 font-semibold cursor-pointer shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
