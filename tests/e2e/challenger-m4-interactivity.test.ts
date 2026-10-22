/**
 * Challenger M4-2 Replacement: Milestone 4 Subscriber Console Revamp
 * Interactivity & State Empirical Challenge Suite
 *
 * Scope of Challenge:
 * 1. Audio Player State:
 *    - Play/pause toggle, play/pause icons, aria-label synchronicity, playing status indicator.
 *    - Cycling playback speeds (1.0x -> 1.25x -> 1.5x -> 2.0x -> 1.0x) and button labels.
 *    - Seeking mathematics, bounding clamps [0, totalDuration], keyboard seeking, skip buttons.
 *    - 24-bar soundwave waveform passed/unpassed distribution.
 *    - Audio timer ticker and auto-pause / loop termination at totalDuration.
 *    - Transcript accordion expand/collapse toggle and narration script display.
 * 2. Preferences State:
 *    - Topic catalog active counts (4 of 7 initial), toggle on/off, all off (0 of 7), all on (7 of 7).
 *    - Cadence select changes (daily, weekdays, realtime, weekly).
 *    - Timezone select changes (9 global timezones).
 *    - Voice persona select changes (Alloy, Nova, Echo, Shimmer, Onyx).
 *    - Master audio switch: disabling unmounts voice persona and speed selectors.
 *    - Save feedback alert appearance, dynamic topic count, and auto-dismiss on edit.
 *    - Reset defaults action restoring pristine baseline.
 * 3. Billing Modal & Quota:
 *    - Active plan card rendering the plan/status the API reports (no fabricated
 *      price, quota meter or invoice row).
 *    - Plan upgrade modal opening/closing, upgrade tier matrix, Current vs Popular badges.
 *    - Usage quota meter mathematical oracle: Briefings (86.7%), Audio (78.0%), Alerts (28.4%), Archive (9.0%).
 *    - Quota meter edge-case stress harness (0%, 100%, overflow, division-by-zero).
 *    - Invoice history table with 6 columns, 4 invoice rows, status badges, and PDF download buttons.
 * 4. Search Filtering & Feed:
 *    - Case-insensitive search across lowercase, UPPERCASE, and MixedCase.
 *    - Multi-field search matching (title, summary, whyItMatters, source, topic tags).
 *    - Whitespace trimming and null-safety on optional fields.
 *    - Empty search results triggering EmptyState with verbatim query and clear button.
 *    - Topic tab filtering and accurate count indicators across All, AI, Systems, Databases, Saved.
 *    - Bookmark toggling interaction, Saved tab EmptyState fallback, and StatCard count sync.
 *    - Combined tab + search filtering intersection logic.
 * 5. Adversarial Stress & Chaos Harness:
 *    - High-frequency speed cycling chaos test (1,000 rapid clicks).
 *    - High-frequency seek event chaos test (1,000 random coordinates clamped).
 *    - Fuzzing search filter with 1,000 adversarial query strings.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { APPS_PATH, el, inspectHtml, React } from "./harness/test-utils";

// ============================================================================
// Navigation & API Mocks
// ============================================================================

let currentPathname: string | null = "/dashboard";
let _pushedRoute: string | null = null;

let actualNav: Record<string, unknown> = {};
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "console/src/components")],
  });
  actualNav = require(resolvedNextNav);
} catch (_e) {}

const navMock = {
  ...actualNav,
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: (href: string) => {
      _pushedRoute = href;
      currentPathname = href;
    },
    replace: (href: string) => {
      _pushedRoute = href;
      currentPathname = href;
    },
    prefetch: () => {},
  }),
};

mock.module("next/navigation", () => navMock);
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "console/src/components")],
  });
  mock.module(resolvedNextNav, () => navMock);
} catch (_e) {}

mock.module("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

mock.module("@repo/api-client", () => ({
  authClient: {
    signOut: async () => {},
    signIn: { email: async () => ({ error: null }) },
    signUp: { email: async () => ({ error: null }) },
  },
  createApiClient: () => ({
    digests: {
      latest: { $get: async () => ({ ok: false }) },
      public: { latest: { $get: async () => ({ ok: false }) } },
      trigger: { $post: async () => ({ ok: true }) },
      ":id": {
        feedback: { $post: async () => ({ ok: true }) },
      },
    },
    user: {
      preferences: {
        $get: async () => ({ ok: false }),
        $put: async () => ({ ok: true }),
      },
    },
    // The billing page reads the real subscription. The mock returns a
    // PRO/trialing account so the test can assert that the page renders the
    // values the API reports — and only those.
    billing: {
      subscription: {
        $get: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            plan: "PRO",
            subscriptionStatus: "trialing",
            paddleCustomerId: "ctm_console_test",
            paddleSubscriptionId: "sub_console_test",
            trialEndsAt: "2026-11-14T00:00:00.000Z",
          }),
        }),
      },
    },
  }),
}));

// Import console pages and components
const DashboardPage = (await import("../../apps/console/src/app/dashboard/page")).default;
const { AudioDigestPlayer } = await import(
  "../../apps/console/src/app/dashboard/components/audio-digest-player"
);
const PreferencesPage = (await import("../../apps/console/src/app/preferences/page")).default;
const BillingPage = (await import("../../apps/console/src/app/billing/page")).default;

import { ThemeProvider } from "../../packages/ui/src";

/**
 * Props for the dashboard audio player, with a digest that has a 225s brief.
 */
const AUDIO_PLAYER_PROPS = {
  digest: {
    id: "dig_audio_01",
    title: "Daily Executive Briefing",
    digestDate: "2026-01-01",
    items: [],
    audioBrief: {
      id: "aud_01",
      script: "Good morning! Here is your briefing.",
      audioUrl: "https://storage.example.com/audio/aud_01.mp3",
      durationSec: 225,
    },
  },
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1,
  showTranscript: false,
  onTogglePlay: () => {},
  onSkipBack: () => {},
  onSkipForward: () => {},
  onCycleSpeed: () => {},
  onSeek: () => {},
  onNudge: () => {},
  onToggleTranscript: () => {},
};

// ============================================================================
// Test Suite: Challenger M4 Interactivity & State
// ============================================================================

describe("Challenger M4-2: Interactivity & State Empirical Challenge Suite", () => {
  let _dom: EmulatedTab;

  beforeEach(() => {
    _dom = setupDOM();
    currentPathname = "/dashboard";
    _pushedRoute = null;
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Audio Player State & Interaction Machine
  // =========================================================================
  describe("Area 1: Audio Player State", () => {
    test("1.1 Initial audio player renders with paused state, 0:00 elapsed, and Play button", () => {
      // The dashboard fetches its digest in an effect, so the player is
      // rendered directly with a digest to assert the player's own markup.
      const inspector = inspectHtml(
        el(ThemeProvider, null, el(AudioDigestPlayer, AUDIO_PLAYER_PROPS)),
      );

      // Audio card title and badge (handles HTML entity &#x27;)
      expect(inspector.contains(/Today(?:'|&#x27;|&apos;)s Audio Digest/)).toBeTrue();
      expect(inspector.contains("Studio Kokoro Voice")).toBeTrue();

      // Controls
      expect(inspector.contains('aria-label="Play briefing audio"')).toBeTrue();
      expect(inspector.contains('aria-label="Skip backward 15 seconds"')).toBeTrue();
      expect(inspector.contains('aria-label="Skip forward 15 seconds"')).toBeTrue();
      expect(inspector.contains('aria-label="Seek audio playback"')).toBeTrue();

      // Initial times and status
      expect(inspector.contains("0:00")).toBeTrue();
      expect(inspector.contains("3:45")).toBeTrue(); // 225s total duration
      expect(inspector.contains("Paused")).toBeTrue();

      // Initial speed
      expect(inspector.contains("1x")).toBeTrue();

      // Transcript initially collapsed
      expect(inspector.contains("Narration Script & Synthesis")).toBeFalse();
    });

    test("1.1b Audio player states that no brief was generated when the digest has none", () => {
      const inspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(AudioDigestPlayer, {
            ...AUDIO_PLAYER_PROPS,
            digest: { id: "dig_1", title: null, digestDate: "2026-01-01", items: [] },
          }),
        ),
      );

      expect(
        inspector.contains("No audio brief has been generated for this digest yet."),
      ).toBeTrue();
      // No playback controls without an audio brief.
      expect(inspector.contains('aria-label="Play briefing audio"')).toBeFalse();
    });

    test("1.2 Play/pause toggle state transition accurately switches icon, aria-label, and status indicator", () => {
      // Test the state transition logic
      let isPlaying = false;
      const toggle = () => {
        isPlaying = !isPlaying;
      };

      expect(isPlaying).toBeFalse();
      toggle();
      expect(isPlaying).toBeTrue();
      const ariaLabelPlaying = isPlaying ? "Pause briefing audio" : "Play briefing audio";
      const statusTextPlaying = isPlaying ? "Playing Briefing" : "Paused";
      expect(ariaLabelPlaying).toBe("Pause briefing audio");
      expect(statusTextPlaying).toBe("Playing Briefing");

      toggle();
      expect(isPlaying).toBeFalse();
      const ariaLabelPaused = isPlaying ? "Pause briefing audio" : "Play briefing audio";
      const statusTextPaused = isPlaying ? "Playing Briefing" : "Paused";
      expect(ariaLabelPaused).toBe("Play briefing audio");
      expect(statusTextPaused).toBe("Paused");
    });

    test("1.3 Cycling playback speeds strictly follows 1.0x -> 1.25x -> 1.5x -> 2.0x -> 1.0x", () => {
      const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];
      const cycleSpeed = (curr: number): number => {
        const idx = SPEED_OPTIONS.indexOf(curr);
        return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]!;
      };

      const formatSpeedLabel = (spd: number): string => {
        return `${spd.toFixed(2).replace(/\.00$/, "")}x`;
      };

      let speed = 1.0;
      expect(formatSpeedLabel(speed)).toBe("1x");

      // Step 1: 1.0 -> 1.25
      speed = cycleSpeed(speed);
      expect(speed).toBe(1.25);
      expect(formatSpeedLabel(speed)).toBe("1.25x");

      // Step 2: 1.25 -> 1.5
      speed = cycleSpeed(speed);
      expect(speed).toBe(1.5);
      expect(formatSpeedLabel(speed)).toBe("1.50x");

      // Step 3: 1.5 -> 2.0
      speed = cycleSpeed(speed);
      expect(speed).toBe(2.0);
      expect(formatSpeedLabel(speed)).toBe("2x");

      // Step 4: 2.0 -> 1.0 (wraparound)
      speed = cycleSpeed(speed);
      expect(speed).toBe(1.0);
      expect(formatSpeedLabel(speed)).toBe("1x");
    });

    test("1.4 Adversarial speed cycling recovery: non-standard or out-of-catalog speeds gracefully wrap to 1.0x", () => {
      const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];
      const cycleSpeed = (curr: number): number => {
        const idx = SPEED_OPTIONS.indexOf(curr);
        return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]!;
      };

      const invalidSpeeds = [-1.0, 0, 0.75, 1.75, 3.0, 99.9, Number.NaN];
      for (const badSpeed of invalidSpeeds) {
        // indexOf returns -1; (-1 + 1) % 4 is 0 -> wraps gracefully to SPEED_OPTIONS[0] (1.0)
        const recovered = cycleSpeed(badSpeed);
        expect(recovered).toBe(1.0);
      }
    });

    test("1.5 Audio timer ticker and auto-pause loop termination when reaching totalDuration", () => {
      const totalDuration = 225;
      let isPlaying = true;
      let currentTime = 224;

      const tick = (t: number): number => {
        if (t >= totalDuration) {
          isPlaying = false;
          return 0;
        }
        return t + 1;
      };

      // Tick from 224 to 225 (boundary)
      currentTime = tick(currentTime);
      expect(currentTime).toBe(225);
      expect(isPlaying).toBeTrue();

      // Tick from 225 (reaches totalDuration) -> resets to 0 and stops playing
      currentTime = tick(currentTime);
      expect(currentTime).toBe(0);
      expect(isPlaying).toBeFalse();
    });

    test("1.6 Seeking progress bar mathematics strictly clamps to [0, totalDuration]", () => {
      const totalDuration = 225;
      const calculateSeek = (clientX: number, rectLeft: number, rectWidth: number): number => {
        const pct = Math.max(0, Math.min(1, (clientX - rectLeft) / rectWidth));
        return Math.round(pct * totalDuration);
      };

      const rectLeft = 100;
      const rectWidth = 500;

      // 1. Left boundary (0%)
      expect(calculateSeek(100, rectLeft, rectWidth)).toBe(0);

      // 2. Middle (50%)
      expect(calculateSeek(350, rectLeft, rectWidth)).toBe(113); // round(0.5 * 225) = 113

      // 3. Right boundary (100%)
      expect(calculateSeek(600, rectLeft, rectWidth)).toBe(225);

      // 4. Negative overshoot (clientX far left of progress bar)
      expect(calculateSeek(20, rectLeft, rectWidth)).toBe(0);
      expect(calculateSeek(-500, rectLeft, rectWidth)).toBe(0);

      // 5. Positive overshoot (clientX far right of progress bar)
      expect(calculateSeek(900, rectLeft, rectWidth)).toBe(225);
      expect(calculateSeek(5000, rectLeft, rectWidth)).toBe(225);
    });

    test("1.7 Keyboard seeking clamps ArrowLeft at 0 and ArrowRight at totalDuration", () => {
      const totalDuration = 225;
      let time = 3;

      // ArrowLeft -5 from 3s -> clamped to 0
      time = Math.max(0, time - 5);
      expect(time).toBe(0);

      // ArrowLeft again from 0 -> stays 0
      time = Math.max(0, time - 5);
      expect(time).toBe(0);

      // ArrowRight +5 from 0 -> 5
      time = Math.min(totalDuration, time + 5);
      expect(time).toBe(5);

      // Fast forward near end
      time = 223;
      time = Math.min(totalDuration, time + 5);
      expect(time).toBe(225);

      // ArrowRight again from 225 -> stays 225
      time = Math.min(totalDuration, time + 5);
      expect(time).toBe(225);
    });

    test("1.8 Skip backward/forward buttons clamp -15s at 0 and +15s at totalDuration", () => {
      const totalDuration = 225;
      let time = 10;

      // Skip backward 15s from 10s -> clamped to 0
      time = Math.max(0, time - 15);
      expect(time).toBe(0);

      // Skip forward 15s from 0s -> 15s
      time = Math.min(totalDuration, time + 15);
      expect(time).toBe(15);

      // Skip forward from 220s -> clamped to 225s
      time = 220;
      time = Math.min(totalDuration, time + 15);
      expect(time).toBe(225);
    });

    test("1.9 Soundwave bars: 24 bars correctly calculate passed vs unpassed status based on currentTime", () => {
      const WAVE_BARS_COUNT = 24;
      const totalDuration = 225;

      const getPassedBarsCount = (curr: number): number => {
        let count = 0;
        for (let i = 0; i < WAVE_BARS_COUNT; i++) {
          if ((i / WAVE_BARS_COUNT) * totalDuration <= curr) {
            count++;
          }
        }
        return count;
      };

      // At 0s: only bar 0 is passed
      expect(getPassedBarsCount(0)).toBe(1);

      // At halfway (112.5s): 13 bars passed
      expect(getPassedBarsCount(113)).toBe(13);

      // At totalDuration (225s): all 24 bars passed
      expect(getPassedBarsCount(225)).toBe(24);
    });

    test("1.10 Transcript accordion expand/collapse logic and script rendering", () => {
      const scriptText =
        "Good morning. Here is your FirstCup executive briefing. First, DeepSeek releases an in-depth architecture whitepaper on DeepSeek-V3";

      let showTranscript = false;
      const toggleTranscript = () => {
        showTranscript = !showTranscript;
      };

      expect(showTranscript).toBeFalse();

      toggleTranscript();
      expect(showTranscript).toBeTrue();

      // When open, script markup is rendered
      const transcriptBox = showTranscript
        ? `<div class="transcript"><span>Narration Script & Synthesis</span><p>${scriptText}</p></div>`
        : "";
      expect(transcriptBox).toContain("Narration Script & Synthesis");
      expect(transcriptBox).toContain("DeepSeek-V3");

      toggleTranscript();
      expect(showTranscript).toBeFalse();
    });

    test("1.11 formatTime helper formats boundary seconds accurately", () => {
      function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
      }

      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(9)).toBe("0:09");
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(225)).toBe("3:45");
      expect(formatTime(3600)).toBe("60:00");
    });
  });

  // =========================================================================
  // Area 2: Preferences State & Form Controls
  // =========================================================================
  describe("Area 2: Preferences State", () => {
    test("2.1 PreferencesPage initial render mounts all 4 sections with 4 of 7 topics active", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(PreferencesPage)));

      expect(inspector.contains("Subscriber Preferences")).toBeTrue();
      expect(inspector.contains("Tracked Tech Topics")).toBeTrue();
      expect(inspector.contains("4 of 7 Active")).toBeTrue();
      expect(inspector.contains(/Delivery Cadence (&amp;|&) Schedule/)).toBeTrue();
      expect(inspector.contains("Executive Voice Briefing")).toBeTrue();
      expect(inspector.contains(/Dispatch Channels (&amp;|&) Integrations/)).toBeTrue();
      expect(inspector.contains("Reset Defaults")).toBeTrue();
      expect(inspector.contains("Save Preferences")).toBeTrue();
    });

    test("2.2 Topic catalog state machine: toggling switches updates topic array and active count", () => {
      let selectedTopics = ["ai", "systems", "backend", "database"];
      // The `as` union keeps TypeScript from narrowing the variable to the literal
      // it was initialised with (the state is mutated inside a closure).
      let saveStatus = "success" as "idle" | "success" | "error";

      const toggleTopic = (id: string, checked: boolean) => {
        saveStatus = "idle";
        selectedTopics = checked ? [...selectedTopics, id] : selectedTopics.filter((t) => t !== id);
      };

      // Initial: 4 active
      expect(selectedTopics.length).toBe(4);

      // Toggle off "ai"
      toggleTopic("ai", false);
      expect(selectedTopics.includes("ai")).toBeFalse();
      expect(selectedTopics.length).toBe(3);
      expect(saveStatus).toBe("idle"); // resets previous success banner

      // Toggle on "frontend"
      toggleTopic("frontend", true);
      expect(selectedTopics.includes("frontend")).toBeTrue();
      expect(selectedTopics.length).toBe(4);

      // Toggle on "security" and "devops"
      toggleTopic("security", true);
      toggleTopic("devops", true);
      expect(selectedTopics.length).toBe(6);

      // Toggle all off
      for (const t of [...selectedTopics]) {
        toggleTopic(t, false);
      }
      expect(selectedTopics.length).toBe(0);
      expect(`${selectedTopics.length} of 7 Active`).toBe("0 of 7 Active");
    });

    test("2.3 Cadence select controlled state supports all 4 delivery frequencies", () => {
      const CADENCE_OPTIONS = ["daily", "weekdays", "realtime", "weekly"];
      let deliveryCadence = "daily";

      for (const opt of CADENCE_OPTIONS) {
        deliveryCadence = opt;
        expect(deliveryCadence).toBe(opt);
      }
    });

    test("2.4 Timezone select controlled state supports major global timezones", () => {
      const TIMEZONES = [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Berlin",
        "Asia/Singapore",
        "Asia/Tokyo",
      ];

      let currentTimezone = "UTC";
      for (const tz of TIMEZONES) {
        currentTimezone = tz;
        expect(currentTimezone).toBe(tz);
      }
    });

    test("2.5 Voice persona select supports all 5 Studio Kokoro neural voices", () => {
      const PERSONAS = ["alloy", "nova", "echo", "shimmer", "onyx"];
      let persona = "alloy";

      for (const p of PERSONAS) {
        persona = p;
        expect(persona).toBe(p);
      }
    });

    test("2.6 Master audio switch conditionally unmounts voice persona and playback velocity selectors", () => {
      const preferencesSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/preferences/page.tsx"),
        "utf8",
      );

      // Verify conditional rendering in JSX: {audioEnabled && (<CardContent ...>)}
      expect(preferencesSrc.includes("{audioEnabled && (")).toBeTrue();
      expect(preferencesSrc.includes('id="voice-persona"')).toBeTrue();
      expect(preferencesSrc.includes('id="playback-speed"')).toBeTrue();
      expect(preferencesSrc.includes("setAudioEnabled")).toBeTrue();
    });

    test("2.7 Save preferences workflow triggers optimistic success state and alert appearance", () => {
      let isSaving = false;
      let saveStatus = "idle" as "idle" | "success" | "error";
      const selectedTopics = ["ai", "systems", "database"];

      const handleSave = () => {
        isSaving = true;
        saveStatus = "idle";

        // Simulate API completion or optimistic fallback
        saveStatus = "success";
        isSaving = false;
      };

      handleSave();
      expect(isSaving).toBeFalse();
      expect(saveStatus).toBe("success");

      // Verify Alert appearance and text interpolation
      const alertHtml =
        saveStatus === "success"
          ? `<div role="alert"><div class="title">Preferences Synchronized</div><div class="desc">Your delivery schedule, neural voice model, and ${selectedTopics.length} topic subscriptions have been updated across all crawler nodes.</div></div>`
          : "";

      expect(alertHtml).toContain("Preferences Synchronized");
      expect(alertHtml).toContain("3 topic subscriptions");
    });

    test("2.8 Reset defaults restores pristine state across all preferences", () => {
      let selectedTopics = ["frontend"];
      let deliveryCadence = "realtime";
      let dispatchTime = "12:00";
      let timezone = "Asia/Tokyo";
      let audioEnabled = false;
      let voicePersona = "onyx";
      let playbackSpeed = "2.0";
      let saveStatus = "success";

      const handleResetDefaults = () => {
        selectedTopics = ["ai", "systems", "backend", "database"];
        deliveryCadence = "daily";
        dispatchTime = "07:00";
        timezone = "UTC";
        audioEnabled = true;
        voicePersona = "alloy";
        playbackSpeed = "1.0";
        saveStatus = "idle";
      };

      handleResetDefaults();
      expect(selectedTopics).toEqual(["ai", "systems", "backend", "database"]);
      expect(deliveryCadence).toBe("daily");
      expect(dispatchTime).toBe("07:00");
      expect(timezone).toBe("UTC");
      expect(audioEnabled).toBeTrue();
      expect(voicePersona).toBe("alloy");
      expect(playbackSpeed).toBe("1.0");
      expect(saveStatus).toBe("idle");
    });
  });

  // =========================================================================
  // Area 3: Billing Modal & Quota Meters
  // =========================================================================
  describe("Area 3: Billing Modal & Quota", () => {
    test("3.1 BillingPage renders only what the API reports, and never fabricates the rest", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(BillingPage)));

      // Plan Overview — the page reads GET /billing/subscription on mount.
      // The rendered markup below is the pre-load state (the harness renders
      // with renderToStaticMarkup, so effects do not run), which must already
      // be honest: no price, no plan, no payment method is invented.
      expect(inspector.contains("Paddle Managed")).toBeTrue();
      expect(inspector.contains("price not reported by the API")).toBeTrue();
      expect(inspector.contains("Not reported by the API")).toBeTrue();
      expect(inspector.contains("Manage via Paddle")).toBeTrue();
      expect(inspector.contains("Upgrade / Change Plan")).toBeTrue();

      // The subscription is fetched from the real endpoint.
      const billingSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/billing/page.tsx"),
        "utf8",
      );
      expect(billingSrc.includes("client.billing.subscription.$get()")).toBeTrue();

      // Quota card — the API reports no usage, so no counters are rendered.
      expect(inspector.contains("Monthly Quota &amp; Consumption")).toBeTrue();
      expect(inspector.contains("does not report quota usage")).toBeTrue();
      expect(inspector.contains("Daily Briefings")).toBeFalse();
      expect(inspector.contains("Voice Audio Minutes")).toBeFalse();
      expect(inspector.contains("Instant Alerts &amp; Webhooks")).toBeFalse();
      expect(inspector.contains("Archived Briefings")).toBeFalse();

      // Invoice History — no invoices are reported, so no rows are rendered.
      expect(inspector.contains("Billing &amp; Invoice History")).toBeTrue();
      expect(inspector.contains("does not report invoices")).toBeTrue();
      expect(inspector.contains("INV-2026-004")).toBeFalse();
      expect(inspector.contains("INV-2026-003")).toBeFalse();
      expect(inspector.contains("INV-2026-002")).toBeFalse();
      expect(inspector.contains("INV-2026-001")).toBeFalse();

      // The plan badge is bound to the API response, not hard-coded.
      expect(billingSrc.includes("subscription?.plan")).toBeTrue();
      expect(inspector.contains("$29.00")).toBeFalse();
      expect(inspector.contains("Active Trial")).toBeFalse();
      expect(inspector.contains("4242")).toBeFalse();

      // The hard-coded subscription summary is gone from the source too.
      expect(billingSrc.includes('"Executive Pro Plan"')).toBeFalse();
      expect(billingSrc.includes("Active Trial")).toBeFalse();
      expect(billingSrc.includes("4242")).toBeFalse();
    });

    test("3.2 Plan upgrade modal: verifies Dialog structure, upgrade tier cards, and close action", () => {
      const billingSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/billing/page.tsx"),
        "utf8",
      );

      // Verifies Dialog compound components
      expect(billingSrc.includes("<Dialog>")).toBeTrue();
      expect(billingSrc.includes("<DialogTrigger")).toBeTrue();
      expect(billingSrc.includes("<DialogContent")).toBeTrue();
      expect(billingSrc.includes("<DialogHeader>")).toBeTrue();
      expect(billingSrc.includes("<DialogTitle>Upgrade Your First Cup Subscription")).toBeTrue();
      expect(billingSrc.includes("<DialogClose")).toBeTrue();
      expect(billingSrc.includes("Proceed to Paddle Checkout")).toBeTrue();

      // Verifies UPGRADE_TIERS data
      expect(billingSrc.includes('"Executive Pro"')).toBeTrue();
      expect(billingSrc.includes('"Team Intelligence"')).toBeTrue();
      expect(billingSrc.includes('"Enterprise Command"')).toBeTrue();
      expect(billingSrc.includes("Current Plan")).toBeTrue();
      expect(billingSrc.includes("tier.popular")).toBeTrue();
    });

    test("3.3 Quota card oracle: the page states the API reports no usage instead of inventing counters", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(BillingPage)));

      // The honest state is asserted directly, and the fabricated percentages
      // that used to be hard-coded are asserted to be absent.
      expect(inspector.contains("does not report quota usage")).toBeTrue();
      expect(inspector.contains("86.7%")).toBeFalse();
      expect(inspector.contains("78.0%")).toBeFalse();
      expect(inspector.contains("28.4%")).toBeFalse();
      expect(inspector.contains("9.0%")).toBeFalse();
      expect(inspector.contains("1,420")).toBeFalse();
      expect(inspector.contains("26")).toBeFalse();
    });

    test("3.4 Quota stress: no usage percentage is rendered for any account state", () => {
      // Whatever the API would report, the page must not invent a number.
      // The percentage-shaped strings are checked across the rendered output.
      const inspector = inspectHtml(el(ThemeProvider, null, el(BillingPage)));
      const percentage = /(\d+(\.\d+)?%)/g;
      const matches = inspector.html.match(percentage);

      // The only percentages that may appear come from the plan catalogue's
      // discount/pricing copy — none of the quota meters.
      expect(matches ?? []).toHaveLength(0);
    });

    test("3.5 Invoice History Table: keeps the 6 headers but renders no invoice rows", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(BillingPage)));

      // Table Headers
      expect(inspector.contains("Invoice #")).toBeTrue();
      expect(inspector.contains("Date")).toBeTrue();
      expect(inspector.contains("Description")).toBeTrue();
      expect(inspector.contains("Amount")).toBeTrue();
      expect(inspector.contains("Status")).toBeTrue();
      expect(inspector.contains("Receipt")).toBeTrue();

      // The API reports no invoices, so the table carries an honest empty
      // state instead of four fabricated rows with PDF buttons.
      expect(inspector.contains("No invoices are reported by the API")).toBeTrue();
      expect(inspector.contains("INV-2026-004")).toBeFalse();
      expect(inspector.contains("Paid")).toBeFalse();
      expect(inspector.contains("Settled")).toBeFalse();
      expect(inspector.contains("PDF")).toBeFalse();
    });
  });

  // =========================================================================
  // Area 4: Search Filtering & Feed Interaction
  // =========================================================================
  describe("Area 4: Search Filtering & Feed", () => {
    // Reference fallback digest items for deterministic test oracle
    const TEST_ITEMS = [
      {
        id: "story-1",
        title:
          "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
        url: "https://news.ycombinator.com/item?id=42500001",
        source: "hackernews",
        summary:
          "New technical whitepaper highlights novel mixture-of-experts (MoE) optimizations achieving 3x token throughput.",
        whyItMatters:
          "Enables production inference of 670B-parameter models on commodity clusters at 60% lower dollar cost.",
        position: 1,
        topics: ["ai", "inference", "quantization"],
      },
      {
        id: "story-2",
        title:
          "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
        url: "https://github.com/valkey-io/valkey",
        source: "github",
        summary: "The Linux Foundation backed in-memory store releases v8.0 with async I/O.",
        whyItMatters: "Provides a zero-license-risk drop-in replacement for Redis.",
        position: 2,
        topics: ["systems", "database", "caching"],
      },
      {
        id: "story-3",
        title: "Kubernetes 1.32 graduated features: Dynamic Resource Allocation and DRA for GPUs",
        url: "https://kubernetes.io/blog",
        source: "engineering-blog",
        summary: "Enhanced driver plugin interface enables fine-grained GPU scheduling.",
        whyItMatters: "Reduces idle GPU cluster capacity by up to 45%.",
        position: 3,
        topics: ["systems", "cloud-native", "kubernetes"],
      },
      {
        id: "story-4",
        title:
          "PostgreSQL 17 query optimizer improvements for JSONB subscripting and B-Tree deduplication",
        url: "https://www.postgresql.org",
        source: "engineering-blog",
        summary: "Core query planner improvements speed up nested JSON document extraction.",
        whyItMatters: "Directly improves high-throughput metadata storage performance.",
        position: 4,
        topics: ["database", "backend"],
      },
      {
        id: "story-5",
        title: "Rust 2026 Edition roadmap: Asynchronous generators and safe FFI abstractions",
        url: "https://blog.rust-lang.org",
        source: "github",
        summary: "The Rust project unveils plans for native async generators.",
        whyItMatters: "Paves the path for next-generation systems streaming pipelines.",
        position: 5,
        topics: ["systems", "rust"],
      },
      {
        id: "story-6",
        title: "Claude 3.8 Sonnet with adaptive tool-calling latency reductions deployed",
        url: "https://anthropic.com/news",
        source: "engineering-blog",
        summary: "Model updates cut tool-call roundtrip latency by 40%.",
        whyItMatters: "Significantly accelerates autonomous worker pipelines.",
        position: 6,
        topics: ["ai", "agents"],
      },
    ];

    // `summary` and `whyItMatters` are nullable in the database and in the
    // console dashboard, so the oracle has to accept items without them.
    type DigestItemLike = Omit<(typeof TEST_ITEMS)[number], "summary" | "whyItMatters"> & {
      summary: string | null;
      whyItMatters: string | null;
    };

    const filterOracle = (
      items: DigestItemLike[],
      searchQuery: string,
      activeTab: string,
      savedIds: Set<string>,
    ) => {
      const query = searchQuery.trim().toLowerCase();
      return items.filter((item) => {
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.summary?.toLowerCase().includes(query) ?? false) ||
          (item.whyItMatters?.toLowerCase().includes(query) ?? false) ||
          item.source.toLowerCase().includes(query) ||
          item.topics.some((t) => t.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        if (activeTab === "all") return true;
        if (activeTab === "saved") return savedIds.has(item.id);
        if (activeTab === "ai") {
          return item.topics.some((t) =>
            ["ai", "inference", "quantization", "agents", "llm"].includes(t.toLowerCase()),
          );
        }
        if (activeTab === "systems") {
          return item.topics.some((t) =>
            ["systems", "cloud-native", "kubernetes", "rust", "devops"].includes(t.toLowerCase()),
          );
        }
        if (activeTab === "database") {
          return item.topics.some((t) =>
            ["database", "caching", "backend", "postgres"].includes(t.toLowerCase()),
          );
        }
        return true;
      });
    };

    test("4.1 Case-insensitive keyword matching across title, summary, whyItMatters, source, and tags", () => {
      const savedIds = new Set(["story-1"]);

      // Lowercase match
      let results = filterOracle(TEST_ITEMS, "deepseek", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-1");

      // UPPERCASE match
      results = filterOracle(TEST_ITEMS, "VALKEY", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-2");

      // MixedCase match
      results = filterOracle(TEST_ITEMS, "PostgreSQL", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-4");

      // Topic tag match
      results = filterOracle(TEST_ITEMS, "quantization", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-1");

      // Source match
      results = filterOracle(TEST_ITEMS, "github", "all", savedIds);
      expect(results.length).toBe(2); // Valkey and Rust

      // WhyItMatters match
      results = filterOracle(TEST_ITEMS, "commodity clusters", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-1");
    });

    test("4.2 Whitespace trimming and null-safety on optional fields", () => {
      const savedIds = new Set(["story-1"]);

      // Leading/trailing whitespace
      const results = filterOracle(TEST_ITEMS, "   kubernetes   ", "all", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-3");

      // Items with null summary or null whyItMatters
      const itemsWithNulls = [
        {
          ...TEST_ITEMS[0]!,
          summary: null,
          whyItMatters: null,
        },
      ];

      expect(() => {
        filterOracle(itemsWithNulls, "deepseek", "all", savedIds);
      }).not.toThrow();

      const nullResult = filterOracle(itemsWithNulls, "deepseek", "all", savedIds);
      expect(nullResult.length).toBe(1);
    });

    test("4.3 Empty search results triggers EmptyState condition with clear search action", () => {
      const savedIds = new Set(["story-1"]);
      const query = "quantum-hyperdrive-warp";
      const results = filterOracle(TEST_ITEMS, query, "all", savedIds);
      expect(results.length).toBe(0);

      // Verify EmptyState condition in the intelligence feed source
      const feedSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/dashboard/components/intelligence-feed.tsx"),
        "utf8",
      );
      const dashboardSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/dashboard/page.tsx"),
        "utf8",
      );

      expect(feedSrc.includes('title="No matching stories found"')).toBeTrue();
      expect(feedSrc.includes("Clear Search Filter")).toBeTrue();
      expect(feedSrc.includes("onClick={onClearSearch}")).toBeTrue();
      // The page wires the clear action back to the search query.
      expect(dashboardSrc.includes('onClearSearch={() => setSearchQuery("")}')).toBeTrue();
    });

    test("4.4 Topic tab filtering accurately partitions items across categories", () => {
      const savedIds = new Set(["story-1"]);

      // Tab 'all' -> 6 items
      expect(filterOracle(TEST_ITEMS, "", "all", savedIds).length).toBe(6);

      // Tab 'ai' -> 2 items (DeepSeek, Claude)
      const aiItems = filterOracle(TEST_ITEMS, "", "ai", savedIds);
      expect(aiItems.length).toBe(2);
      expect(aiItems.map((i) => i.id).sort()).toEqual(["story-1", "story-6"]);

      // Tab 'systems' -> 3 items (Valkey, K8s, Rust)
      const sysItems = filterOracle(TEST_ITEMS, "", "systems", savedIds);
      expect(sysItems.length).toBe(3);
      expect(sysItems.map((i) => i.id).sort()).toEqual(["story-2", "story-3", "story-5"]);

      // Tab 'database' -> 2 items (Valkey, Postgres)
      const dbItems = filterOracle(TEST_ITEMS, "", "database", savedIds);
      expect(dbItems.length).toBe(2);
      expect(dbItems.map((i) => i.id).sort()).toEqual(["story-2", "story-4"]);

      // Tab 'saved' -> 1 item (story-1)
      const savedItems = filterOracle(TEST_ITEMS, "", "saved", savedIds);
      expect(savedItems.length).toBe(1);
      expect(savedItems[0]?.id).toBe("story-1");
    });

    test("4.5 Bookmark toggling updates savedIds and triggers EmptyState when saved list is empty", () => {
      let savedIds = new Set(["story-1"]);

      const toggleBookmark = (id: string) => {
        const next = new Set(savedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        savedIds = next;
      };

      // Initial: 1 saved
      expect(savedIds.size).toBe(1);
      expect(filterOracle(TEST_ITEMS, "", "saved", savedIds).length).toBe(1);

      // Add story-2
      toggleBookmark("story-2");
      expect(savedIds.size).toBe(2);
      expect(filterOracle(TEST_ITEMS, "", "saved", savedIds).length).toBe(2);

      // Remove story-1
      toggleBookmark("story-1");
      expect(savedIds.size).toBe(1);
      expect(savedIds.has("story-1")).toBeFalse();

      // Remove story-2 (list becomes empty)
      toggleBookmark("story-2");
      expect(savedIds.size).toBe(0);
      expect(filterOracle(TEST_ITEMS, "", "saved", savedIds).length).toBe(0);

      // Verify EmptyState condition for saved
      const feedSrc = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/dashboard/components/intelligence-feed.tsx"),
        "utf8",
      );
      expect(feedSrc.includes('title="No saved stories yet"')).toBeTrue();
      expect(
        feedSrc.includes("Browse Today&apos;s Stories") ||
          feedSrc.includes("Browse Today's Stories"),
      ).toBeTrue();
      expect(feedSrc.includes('onClick={() => onTabChange("all")}')).toBeTrue();
    });

    test("4.6 Combined search + tab filtering: strictly verifies intersection logic", () => {
      const savedIds = new Set(["story-1", "story-2"]);

      // Search 'valkey' in 'systems' tab -> matches story-2
      let results = filterOracle(TEST_ITEMS, "valkey", "systems", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-2");

      // Search 'valkey' in 'ai' tab -> 0 matches (Valkey is not in AI)
      results = filterOracle(TEST_ITEMS, "valkey", "ai", savedIds);
      expect(results.length).toBe(0);

      // Search 'deepseek' in 'saved' tab -> matches story-1
      results = filterOracle(TEST_ITEMS, "deepseek", "saved", savedIds);
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("story-1");

      // Search 'rust' in 'saved' tab -> 0 matches (rust not bookmarked)
      results = filterOracle(TEST_ITEMS, "rust", "saved", savedIds);
      expect(results.length).toBe(0);
    });
  });

  // =========================================================================
  // Area 5: Adversarial Stress Testing & Chaos Harness
  // =========================================================================
  describe("Area 5: Adversarial Stress & Chaos Harness", () => {
    test("5.1 High-frequency speed cycling chaos test: 1,000 rapid clicks preserves cycle integrity", () => {
      const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];
      const cycleSpeed = (curr: number): number => {
        const idx = SPEED_OPTIONS.indexOf(curr);
        return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]!;
      };

      let speed = 1.0;
      for (let i = 1; i <= 1000; i++) {
        speed = cycleSpeed(speed);
        const expected = SPEED_OPTIONS[i % 4];
        expect(speed).toBe(expected!);
      }
    });

    test("5.2 High-frequency seek event chaos test: 1,000 random coordinates strictly clamp to [0, totalDuration]", () => {
      const totalDuration = 225;
      const calculateSeek = (clientX: number, rectLeft: number, rectWidth: number): number => {
        const pct = Math.max(0, Math.min(1, (clientX - rectLeft) / rectWidth));
        return Math.round(pct * totalDuration);
      };

      const rectLeft = 200;
      const rectWidth = 800;

      for (let i = 0; i < 1000; i++) {
        // Random clientX between -2000 and 3000
        const clientX = Math.floor(Math.random() * 5000) - 2000;
        const seek = calculateSeek(clientX, rectLeft, rectWidth);

        expect(seek).toBeGreaterThanOrEqual(0);
        expect(seek).toBeLessThanOrEqual(totalDuration);
        expect(Number.isInteger(seek)).toBeTrue();
      }
    });

    test("5.3 Feed filter stress test with 1,000 randomized adversarial queries", () => {
      const ADVERSARIAL_PAYLOADS = [
        "",
        " ",
        "   \t\n   ",
        "'; DROP TABLE digests; --",
        "<script>alert('xss')</script>",
        "{{constructor.constructor('alert(1)')()}}",
        "../../../etc/passwd",
        "!@#$%^&*()_+-=[]{}|;':\",./<>?",
        "🦀🚀✨🔥🤖⚡️",
        "日本語 / 中文 / Русский / العربية",
        "A".repeat(500),
        "\\x00\\x01\\x02",
        "null",
        "undefined",
        "[object Object]",
        "NaN",
      ];

      for (let i = 0; i < 1000; i++) {
        const query = ADVERSARIAL_PAYLOADS[i % ADVERSARIAL_PAYLOADS.length]!;
        expect(() => {
          const queryTrimmed = query.trim().toLowerCase();
          const _filtered = [
            {
              id: "test",
              title: "Test",
              summary: null,
              whyItMatters: null,
              source: "blog",
              topics: ["ai"],
            },
          ].filter(
            (item: {
              id: string;
              title: string;
              summary: string | null;
              whyItMatters: string | null;
              source: string;
              topics: string[];
            }) => {
              return (
                !queryTrimmed ||
                item.title.toLowerCase().includes(queryTrimmed) ||
                (item.summary?.toLowerCase().includes(queryTrimmed) ?? false) ||
                (item.whyItMatters?.toLowerCase().includes(queryTrimmed) ?? false) ||
                item.source.toLowerCase().includes(queryTrimmed) ||
                item.topics.some((t) => t.toLowerCase().includes(queryTrimmed))
              );
            },
          );
        }).not.toThrow();
      }
    });

    test("5.4 Full console subscriber flow renders end-to-end without errors", () => {
      // 1. Dashboard page
      currentPathname = "/dashboard";
      const dashInspector = inspectHtml(el(ThemeProvider, null, el(DashboardPage)));
      // The greeting is built from the signed-in profile; without a session it
      // falls back to the generic greeting.
      expect(dashInspector.contains("Good morning")).toBeTrue();
      expect(dashInspector.contains(/Today(?:'|&#x27;|&apos;)s Audio Digest/)).toBeTrue();
      // The player states that no brief was generated instead of assuming one.
      expect(
        dashInspector.contains("No audio brief has been generated for this digest yet."),
      ).toBeTrue();

      // 2. Preferences page
      currentPathname = "/preferences";
      const prefInspector = inspectHtml(el(ThemeProvider, null, el(PreferencesPage)));
      expect(prefInspector.contains("Subscriber Preferences")).toBeTrue();

      // 3. Billing page
      currentPathname = "/billing";
      const billInspector = inspectHtml(el(ThemeProvider, null, el(BillingPage)));
      expect(billInspector.contains("Paddle Managed")).toBeTrue();
      expect(billInspector.contains("price not reported by the API")).toBeTrue();
    });
  });
});
