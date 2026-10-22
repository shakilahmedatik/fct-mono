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
import { AlertCircle, Bell, Headphones, Layers, RotateCcw, Save, Send } from "lucide-react";
import * as React from "react";

export interface TopicOption {
  id: string;
  label: string;
  category: string;
  description: string;
}

/**
 * The delivery cadence values accepted by `userPreferenceSchema`. The form
 * used to offer "weekdays" and "realtime", which the API rejects.
 */
type DeliveryCadence = "daily" | "weekly" | "monthly";

type SkillLevel = "beginner" | "intermediate" | "advanced";

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

const CADENCE_OPTIONS: { value: DeliveryCadence; label: string }[] = [
  { value: "daily", label: "Daily (Every Morning)" },
  { value: "weekly", label: "Weekly Executive Roundup" },
  { value: "monthly", label: "Monthly Deep-Dive Briefing" },
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
  const [deliveryCadence, setDeliveryCadence] = React.useState<DeliveryCadence>("daily");
  const [dispatchTime, setDispatchTime] = React.useState("07:00");
  const [timezone, setTimezone] = React.useState("UTC");

  // Voice Persona Settings
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const [voicePersona, setVoicePersona] = React.useState("alloy");
  const [playbackSpeed, setPlaybackSpeed] = React.useState("1.0");

  // Notifications
  const [emailDigest, setEmailDigest] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [telegramId, setTelegramId] = React.useState("");

  // Skill level is owned by the account, not by this form: it is loaded from
  // the API and written back unchanged. It used to be hard-coded to
  // "intermediate", which silently overwrote the user's real value.
  const [skillLevel, setSkillLevel] = React.useState<SkillLevel>("intermediate");

  // Save State
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = React.useState("");

  // Load State
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  // Load the persisted preferences (and the Telegram chat id) on mount.
  React.useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const client = createApiClient();
        const res = await client.user.preferences.$get();
        if (!cancelled && !res.ok) {
          setLoadError(`We could not load your preferences (HTTP ${res.status}).`);
          setIsLoading(false);
          return;
        }
        const data = res.ok ? await res.json() : null;
        const preferences = data?.preferences;
        if (cancelled) return;

        if (preferences) {
          if (Array.isArray(preferences.topics) && preferences.topics.length > 0) {
            setSelectedTopics(preferences.topics as string[]);
          }
          if (typeof preferences.skillLevel === "string") {
            setSkillLevel(preferences.skillLevel as SkillLevel);
          }
          if (typeof preferences.timezone === "string") {
            setTimezone(preferences.timezone);
          }
          if (typeof preferences.deliveryHour === "number") {
            setDispatchTime(`${String(preferences.deliveryHour).padStart(2, "0")}:00`);
          }
          if (typeof preferences.audioEnabled === "boolean") {
            setAudioEnabled(preferences.audioEnabled);
          }
          if (typeof preferences.channelEnabled === "boolean") {
            // `channelEnabled` is the persisted switch; the chat id itself is
            // a profile field and is loaded separately below.
          }
          if (typeof preferences.deliveryCadence === "string") {
            setDeliveryCadence(preferences.deliveryCadence as DeliveryCadence);
          }
          if (typeof preferences.voicePersona === "string") {
            setVoicePersona(preferences.voicePersona);
          }
          if (typeof preferences.playbackSpeed === "number") {
            setPlaybackSpeed(String(preferences.playbackSpeed));
          }
          if (typeof preferences.emailDigest === "boolean") {
            setEmailDigest(preferences.emailDigest);
          }
          if (typeof preferences.emailAlerts === "boolean") {
            setEmailAlerts(preferences.emailAlerts);
          }
        }

        // The Telegram chat id lives on the user profile, not on the
        // preference row.
        const profileRes = await client.user.me.$get();
        if (!cancelled && profileRes.ok) {
          const profileData = await profileRes.json();
          const chatId = profileData?.user?.telegramChatId;
          if (typeof chatId === "string") {
            setTelegramId(chatId);
          }
        }

        if (!cancelled) {
          setLoadError("");
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError("We could not load your preferences. Please reload the page.");
          setIsLoading(false);
        }
      }
    }

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTopic = (id: string, checked: boolean) => {
    setSaveStatus("idle");
    setSelectedTopics((prev) => (checked ? [...prev, id] : prev.filter((t) => t !== id)));
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
    setSaveStatus("idle");
    setSaveMessage("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      const client = createApiClient();
      const parsedHour = Number.parseInt(dispatchTime.split(":")[0] || "7", 10);
      const payload = {
        topics: selectedTopics,
        deliveryHour: Number.isNaN(parsedHour) ? 7 : parsedHour,
        timezone,
        skillLevel,
        audioEnabled,
        channelEnabled: Boolean(telegramId.trim()),
        deliveryCadence,
        voicePersona,
        playbackSpeed: Number.parseFloat(playbackSpeed) || 1,
        emailDigest,
        emailAlerts,
      };

      const res = await client.user.preferences.$put({
        json: payload,
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as unknown as {
          error?: string;
        } | null;
        setSaveStatus("error");
        setSaveMessage(
          errorData?.error ??
            `Your preferences were not saved (HTTP ${res.status}). Please try again.`,
        );
        return;
      }

      // The Telegram chat id is a profile field, persisted separately.
      if (telegramId.trim()) {
        const profileRes = await client.user.profile.$patch({
          json: { telegramChatId: telegramId.trim() },
        });
        if (!profileRes.ok) {
          setSaveStatus("error");
          setSaveMessage(
            `Your preferences were saved, but the Telegram chat id could not be updated (HTTP ${profileRes.status}).`,
          );
          return;
        }
      }

      setSaveStatus("success");
      setSaveMessage(
        `Your delivery schedule, neural voice model, and ${selectedTopics.length} topic subscriptions have been updated.`,
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Your preferences were not saved — the server could not be reached. Please try again.",
      );
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

      {/* Load failure banner */}
      {loadError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Preferences Unavailable</AlertTitle>
          <AlertDescription className="text-xs mt-0.5">{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Save Success Alert Banner */}
      {saveStatus === "success" && (
        <Alert variant="success" className="animate-in fade-in-50 duration-200">
          <AlertTitle className="font-semibold text-sm">Preferences Synchronized</AlertTitle>
          <AlertDescription className="text-xs mt-0.5">{saveMessage}</AlertDescription>
        </Alert>
      )}

      {/* Save Failure Alert Banner */}
      {saveStatus === "error" && (
        <Alert variant="destructive" role="alert" className="animate-in fade-in-50 duration-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold text-sm">Preferences Not Saved</AlertTitle>
          <AlertDescription className="text-xs mt-0.5">{saveMessage}</AlertDescription>
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
                onChange={(e) => setDeliveryCadence(e.target.value as DeliveryCadence)}
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
            <Input
              id="telegram-id"
              name="telegram-chat-id"
              placeholder="@englead"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="font-mono text-xs"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Connect our bot (@FirstCupBriefingBot) to receive morning audio and text summaries
              directly.
            </p>
            <p className="text-[11px] text-muted-foreground">
              There is no API endpoint that can deliver a test message to a chat, so no &ldquo;test
              connection&rdquo; control is offered. Saving stores the chat id on your profile.
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
            disabled={isLoading || Boolean(loadError)}
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
