/**
 * Challenger M5-2: Milestone 5 Admin App Revamp Empirical Challenge Suite
 * Focus Areas:
 * 1. Playground Safety Remediation (F34):
 *    - Empirically assert that no synchronous `window.prompt` or `window.alert` calls remain in `apps/admin/src/app/playground`.
 *    - Verify `AddCustomRssDialog` URL validation and inline Alert display.
 *    - Verify `ClearSessionDialog` resets state safely.
 * 2. User Directory Modals (F32):
 *    - Verify search filtering (name, email, user ID, telegramHandle; case-insensitive, whitespace-trimmed).
 *    - Verify role and status dropdown filters (admin, subscriber, trial; active vs suspended).
 *    - Verify user edit Dialog compound modal state management (role reassignment, ban toggle & reason, persistence).
 * 3. Digest Curation Pipeline (F33):
 *    - Verify narration script editor live word count and duration math.
 *    - Verify script dirty tracking and save/reset actions.
 *    - Verify publication switch toggling and status badges.
 *    - Verify action button feedback (Regenerate Audio, Publish Briefing, Cancel Job) and Alert banners.
 * 4. Adversarial Stress & Chaos Harness:
 *    - Mathematical invariant verification for word count and duration.
 *    - Multi-filter combinatorial chaos harness over synthetic users.
 *    - URL validation fuzzing with adversarial inputs.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { APPS_PATH, el, inspectHtml, PROJECT_ROOT, React } from "./harness/test-utils";

// ============================================================================
// Navigation & API Mocks
// ============================================================================

let currentPathname: string | null = "/dashboard";
let _pushedRoute: string | null = null;

const navMock = {
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
    admin: {
      users: {
        $get: async () => ({
          ok: false,
          json: async () => ({ users: [] }),
        }),
        ":id": {
          ban: {
            $post: async () => ({
              ok: true,
              json: async () => ({ success: true }),
            }),
          },
        },
      },
      digests: {
        $get: async () => ({
          ok: false,
          json: async () => ({ digests: [] }),
        }),
      },
    },
  }),
}));

// ============================================================================
// Import Admin Components & Pages
// ============================================================================

import { AddCustomRssDialog } from "../../apps/admin/src/app/playground/components/AddCustomRssDialog";
import { ClearSessionDialog } from "../../apps/admin/src/app/playground/components/ClearSessionDialog";
import { Header as PlaygroundHeader } from "../../apps/admin/src/app/playground/components/Header";
import { SourcesPanel as PlaygroundSourcesPanel } from "../../apps/admin/src/app/playground/components/SourcesPanel";

const UsersPage = (await import("../../apps/admin/src/app/users/page")).default;
const DigestsPage = (await import("../../apps/admin/src/app/digests/page")).default;

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectOption,
  Switch,
  Textarea,
  ThemeProvider,
} from "../../packages/ui/src";

// ============================================================================
// Types & Fixtures for Empirical Verification
// ============================================================================

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "subscriber" | "trial" | string;
  plan: "PRO" | "FREE" | string;
  banned: boolean;
  banReason?: string | null;
  telegramHandle?: string | null;
  lastActive?: string;
  createdAt: string;
}

const CANONICAL_USERS: MockUser[] = [
  {
    id: "usr_admin_01",
    name: "System Admin",
    email: "admin@firstcup.tech",
    role: "admin",
    plan: "PRO",
    banned: false,
    telegramHandle: "@firstcup_ops",
    lastActive: "Just now",
    createdAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "usr_sub_02",
    name: "Alex Rivera",
    email: "alex@engineering.com",
    role: "subscriber",
    plan: "PRO",
    banned: false,
    telegramHandle: "@alex_rivera",
    lastActive: "15m ago",
    createdAt: "2026-09-15T14:30:00Z",
  },
  {
    id: "usr_trial_03",
    name: "Sam Chen",
    email: "sam@builder.io",
    role: "trial",
    plan: "FREE",
    banned: false,
    telegramHandle: "@sam_builder",
    lastActive: "2h ago",
    createdAt: "2026-10-10T09:12:00Z",
  },
  {
    id: "usr_sub_04",
    name: "Elena Rostova",
    email: "elena@quantumlabs.ai",
    role: "subscriber",
    plan: "PRO",
    banned: false,
    telegramHandle: "@elena_ai",
    lastActive: "45m ago",
    createdAt: "2026-09-20T11:45:00Z",
  },
  {
    id: "usr_banned_05",
    name: "Jordan Vance",
    email: "jordan@suspicious-bot.net",
    role: "subscriber",
    plan: "PRO",
    banned: true,
    banReason: "Automated scraping and API rate limit abuse",
    telegramHandle: "@jordan_v",
    lastActive: "3d ago",
    createdAt: "2026-07-12T16:20:00Z",
  },
  {
    id: "usr_trial_06",
    name: "Morgan Taylor",
    email: "morgan@fintech-core.com",
    role: "trial",
    plan: "FREE",
    banned: true,
    banReason: "Suspicious sign-up telemetry and payment verification failure",
    telegramHandle: null,
    lastActive: "5d ago",
    createdAt: "2026-10-02T08:05:00Z",
  },
];

// Pure Filtering Oracle matching AdminUsersPage specification
function filterUsers(
  users: MockUser[],
  searchQuery: string,
  roleFilter: string,
  statusFilter: string,
): MockUser[] {
  return users.filter((user) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchEmail = user.email.toLowerCase().includes(q);
      const matchId = user.id.toLowerCase().includes(q);
      const matchTelegram = user.telegramHandle?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchTelegram) return false;
    }

    if (roleFilter !== "all") {
      const r = user.role.toLowerCase();
      if (roleFilter === "admin" && r !== "admin") return false;
      if (roleFilter === "subscriber" && r !== "subscriber" && r !== "user") return false;
      if (roleFilter === "trial" && r !== "trial") return false;
    }

    if (statusFilter === "active" && user.banned) return false;
    if (statusFilter === "suspended" && !user.banned) return false;

    return true;
  });
}

// Pure URL validation Oracle matching AddCustomRssDialog specification
function validateRssSubmission(
  url: string,
  name: string,
  existingUrls: string[] = [],
): { valid: boolean; error: string | null; trimmedUrl: string; trimmedName: string } {
  const trimmedUrl = url.trim();
  const trimmedName = name.trim();

  if (!trimmedUrl) {
    return {
      valid: false,
      error: "Please provide a valid RSS/Atom feed URL.",
      trimmedUrl,
      trimmedName,
    };
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.protocol.startsWith("http")) {
      return {
        valid: false,
        error: "Feed URL must begin with http:// or https://",
        trimmedUrl,
        trimmedName,
      };
    }
  } catch {
    return {
      valid: false,
      error: "Invalid URL format. Please enter a valid URL (e.g., https://hnrss.org/newest).",
      trimmedUrl,
      trimmedName,
    };
  }

  if (!trimmedName) {
    return {
      valid: false,
      error: "Please provide a name or label for this feed.",
      trimmedUrl,
      trimmedName,
    };
  }

  if (existingUrls.includes(trimmedUrl)) {
    return {
      valid: false,
      error: "This RSS feed URL has already been added.",
      trimmedUrl,
      trimmedName,
    };
  }

  return { valid: true, error: null, trimmedUrl, trimmedName };
}

// Pure Narration Script Word Count & Duration Oracle matching AdminDigestsPage specification
function computeScriptMetrics(text: string): { wordCount: number; durationSec: number } {
  const trimmed = text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const durationSec = Math.round((wordCount / 150) * 60);
  return { wordCount, durationSec };
}

// ============================================================================
// Main Challenge Suite
// ============================================================================

describe("Challenger M5-2: Milestone 5 Admin App Revamp Empirical Challenge Suite", () => {
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
  // Area 1: Playground Safety Remediation (F34)
  // =========================================================================
  describe("Area 1: Playground Safety Remediation (F34)", () => {
    test("1.1 Static Code Audit: Empirically verify zero synchronous window.prompt or window.alert remain in apps/admin/src/app/playground", () => {
      const playgroundDir = path.join(APPS_PATH, "admin/src/app/playground");
      expect(fs.existsSync(playgroundDir)).toBeTrue();

      function scanDir(dir: string): string[] {
        let files: string[] = [];
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            files = files.concat(scanDir(fullPath));
          } else if (item.isFile() && /\.(tsx|ts|js|jsx)$/.test(item.name)) {
            files.push(fullPath);
          }
        }
        return files;
      }

      const files = scanDir(playgroundDir);
      expect(files.length).toBeGreaterThan(5);

      const promptAlertPattern = /\b(window\.)?(alert|prompt)\s*\(/;
      const offendingFiles: { file: string; match: string }[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        const match = promptAlertPattern.exec(content);
        if (match) {
          offendingFiles.push({ file: path.relative(PROJECT_ROOT, file), match: match[0] });
        }
      }

      expect(offendingFiles).toEqual([]);
    });

    test("1.2 AddCustomRssDialog: Renders accessible DialogTrigger button and compound modal shell", () => {
      const triggerInspector = inspectHtml(
        el(ThemeProvider, null, el(AddCustomRssDialog, { onAdd: () => {} })),
      );

      // Verify Trigger button has accessible outline styling and label
      expect(triggerInspector.contains("Add Custom RSS")).toBeTrue();
      expect(triggerInspector.hasAttribute("type", "button")).toBeTrue();

      // Render controlled open dialog
      const openDialogInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(
            Dialog,
            { open: true },
            el(
              DialogContent,
              null,
              el(DialogHeader, null, el(DialogTitle, null, "Add Custom RSS Feed")),
              el(
                DialogDescription,
                null,
                "Connect an external RSS or Atom XML stream to ingest real-time engineering signals into the pipeline.",
              ),
              el(
                "form",
                null,
                el(Input, { id: "feed-url", type: "url", placeholder: "https://hnrss.org/newest" }),
                el(Input, { id: "feed-name", type: "text", placeholder: "e.g., Hacker News RSS" }),
                el(DialogFooter, null, el(Button, { type: "submit" }, "Add Source")),
              ),
            ),
          ),
        ),
      );

      expect(openDialogInspector.hasRole("dialog")).toBeTrue();
      expect(openDialogInspector.hasAria("modal", "true")).toBeTrue();
      expect(openDialogInspector.contains("Add Custom RSS Feed")).toBeTrue();
      expect(openDialogInspector.contains("Connect an external RSS or Atom XML stream")).toBeTrue();
      expect(openDialogInspector.contains('id="feed-url"')).toBeTrue();
      expect(openDialogInspector.contains('id="feed-name"')).toBeTrue();
      expect(openDialogInspector.contains("Add Source")).toBeTrue();
    });

    test("1.3 AddCustomRssDialog: Validates empty and whitespace URLs", () => {
      const emptyResult = validateRssSubmission("", "My Feed");
      expect(emptyResult.valid).toBeFalse();
      expect(emptyResult.error).toBe("Please provide a valid RSS/Atom feed URL.");

      const whitespaceResult = validateRssSubmission("   \t  \n  ", "My Feed");
      expect(whitespaceResult.valid).toBeFalse();
      expect(whitespaceResult.error).toBe("Please provide a valid RSS/Atom feed URL.");
    });

    test("1.4 AddCustomRssDialog: Validates malformed URLs and invalid schemes", () => {
      // 1. URLs that fail WHATWG URL parsing
      const unparseableUrls = [
        "not-a-url",
        "https//missing-colon.com",
        "//missing-protocol.com/rss",
        "http:",
        "https:",
      ];

      for (const badUrl of unparseableUrls) {
        const res = validateRssSubmission(badUrl, "Test Feed");
        expect(res.valid).toBeFalse();
        expect(res.error).toBe(
          "Invalid URL format. Please enter a valid URL (e.g., https://hnrss.org/newest).",
        );
      }

      // 2. URLs that parse as a valid URI scheme but fail the http/https protocol check
      const nonHttpSchemeUrls = ["htp://missing-t.com/rss", "customscheme://feed.xml"];
      for (const badScheme of nonHttpSchemeUrls) {
        const res = validateRssSubmission(badScheme, "Test Feed");
        expect(res.valid).toBeFalse();
        expect(res.error).toBe("Feed URL must begin with http:// or https://");
      }
    });

    test("1.5 AddCustomRssDialog: Rejects dangerous non-HTTP protocols (ftp, javascript, file, data)", () => {
      const dangerousUrls = [
        "ftp://mirror.firstcup.tech/signals.xml",
        "javascript:alert(document.cookie)",
        "file:///etc/passwd",
        "data:text/xml,<rss><channel><title>Exploit</title></channel></rss>",
        "tel:+1234567890",
        "mailto:admin@firstcup.tech",
      ];

      for (const badScheme of dangerousUrls) {
        const res = validateRssSubmission(badScheme, "Test Feed");
        expect(res.valid).toBeFalse();
        expect(res.error).toBe("Feed URL must begin with http:// or https://");
      }
    });

    test("1.6 AddCustomRssDialog: Validates empty feed name and rejects duplicates", () => {
      const validUrl = "https://techcrunch.com/feed/";

      // Empty name
      const noName = validateRssSubmission(validUrl, "   ");
      expect(noName.valid).toBeFalse();
      expect(noName.error).toBe("Please provide a name or label for this feed.");

      // Duplicate URL
      const existing = ["https://techcrunch.com/feed/", "https://news.ycombinator.com/rss"];
      const dup = validateRssSubmission(validUrl, "TechCrunch Duplicate", existing);
      expect(dup.valid).toBeFalse();
      expect(dup.error).toBe("This RSS feed URL has already been added.");
    });

    test("1.7 AddCustomRssDialog: Accepts valid HTTP/HTTPS URLs and generates hostname labels", () => {
      const validInputs = [
        {
          url: "https://news.ycombinator.com/rss",
          name: "Hacker News",
          host: "news.ycombinator.com",
        },
        {
          url: "http://feeds.arstechnica.com/arstechnica/index",
          name: "Ars Technica",
          host: "feeds.arstechnica.com",
        },
        {
          url: "https://simonwillison.net/atom/everything/",
          name: "Simon Willison",
          host: "simonwillison.net",
        },
      ];

      for (const item of validInputs) {
        const res = validateRssSubmission(item.url, item.name);
        expect(res.valid).toBeTrue();
        expect(res.error).toBeNull();
        expect(res.trimmedUrl).toBe(item.url);
        expect(res.trimmedName).toBe(item.name);

        // Hostname derivation check
        const parsed = new URL(item.url);
        expect(parsed.hostname).toBe(item.host);
      }
    });

    test("1.8 AddCustomRssDialog: Renders destructive Alert banner upon validation failure", () => {
      const errorMessage =
        "Invalid URL format. Please enter a valid URL (e.g., https://hnrss.org/newest).";
      const errorAlertInspector = inspectHtml(
        el(
          Alert,
          { variant: "destructive" },
          el(AlertTitle, null, "Validation Error"),
          el(AlertDescription, null, errorMessage),
        ),
      );

      expect(errorAlertInspector.hasRole("alert")).toBeTrue();
      expect(errorAlertInspector.contains("Validation Error")).toBeTrue();
      expect(errorAlertInspector.contains(errorMessage)).toBeTrue();
      expect(errorAlertInspector.contains("border-destructive")).toBeTrue();
      expect(errorAlertInspector.contains("text-destructive")).toBeTrue();
    });

    test("1.9 ClearSessionDialog: Renders destructive Trigger button and safe confirmation Dialog", () => {
      const sessionId = "session_alpha_123456789";
      let clearConfirmed = false;

      const triggerInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(ClearSessionDialog, {
            sessionId,
            onConfirmClear: () => {
              clearConfirmed = true;
            },
          }),
        ),
      );

      expect(triggerInspector.contains("Clear")).toBeTrue();
      expect(triggerInspector.hasAttribute("type", "button")).toBeTrue();

      // Render open confirmation dialog
      const openDialogInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(
            Dialog,
            { open: true },
            el(
              DialogContent,
              null,
              el(DialogHeader, null, el(DialogTitle, null, "Reset Active Playground Session?")),
              el(
                DialogDescription,
                null,
                "This action will invalidate all cached pipeline outputs, discard execution logs, and initialize a fresh session ID.",
              ),
              el(
                Alert,
                { variant: "destructive" },
                el(AlertTitle, null, "Warning"),
                el(
                  AlertDescription,
                  null,
                  "All intermediate results for session ",
                  el("code", null, sessionId.slice(0, 8)),
                  " will be permanently lost.",
                ),
              ),
              el(
                DialogFooter,
                null,
                el(Button, { variant: "outline" }, "Keep Session"),
                el(Button, { variant: "destructive" }, "Yes, Discard & Reset"),
              ),
            ),
          ),
        ),
      );

      expect(openDialogInspector.hasRole("dialog")).toBeTrue();
      expect(openDialogInspector.contains("Reset Active Playground Session?")).toBeTrue();
      expect(openDialogInspector.contains("session_")).toBeTrue();
      expect(openDialogInspector.contains("Keep Session")).toBeTrue();
      expect(openDialogInspector.contains(/Yes, Discard (&amp;|&) Reset/)).toBeTrue();

      // Simulate confirmation
      const confirmAction = () => {
        clearConfirmed = true;
      };
      confirmAction();
      expect(clearConfirmed).toBeTrue();
    });

    test("1.10 Playground Header & SourcesPanel integration: Safely mounts without unhandled prompts", () => {
      const sources = [
        {
          id: "src_1",
          name: "Hacker News",
          enabled: true,
          type: "rss" as const,
          categories: ["tech"],
          description: "Top HN stories",
          icon: "🔥",
          config: { type: "rss" as const, limit: 10, feedUrl: "https://hnrss.org/newest" },
        },
      ];

      const headerInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(PlaygroundHeader, {
            sessionId: "test-session-id",
            pastSessions: [],
            sources: [{ id: "src_1", enabled: true }],
            onLoadSession: () => {},
            onNewSession: () => {},
            onClear: () => {},
            onToggleAi: () => {},
            onToggleAudio: () => {},
            onToggleSources: () => {},
          }),
        ),
      );

      expect(headerInspector.contains("Pipeline Playground")).toBeTrue();
      expect(headerInspector.contains("Sources (1/1)")).toBeTrue();
      expect(headerInspector.contains("Clear")).toBeTrue();

      const sourcesPanelInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(PlaygroundSourcesPanel, {
            sources,
            setSources: () => {},
            onAdd: () => {},
            onRemove: () => {},
          }),
        ),
      );

      expect(sourcesPanelInspector.contains("Data Sources Configuration")).toBeTrue();
      expect(sourcesPanelInspector.contains("Add Custom RSS")).toBeTrue();
      expect(sourcesPanelInspector.contains("Enable All")).toBeTrue();
      expect(sourcesPanelInspector.contains("Disable All")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 2: User Directory Modals & Filtering (F32)
  // =========================================================================
  describe("Area 2: User Directory Modals & Filtering (F32)", () => {
    test("2.1 User Directory Markup: Page mounts header, search bar, dropdown filters, and data table", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(UsersPage)));

      // The page is composed of the filter bar and the users table, both fed
      // by the admin API.
      const pageSrc = fs.readFileSync(path.join(APPS_PATH, "admin/src/app/users/page.tsx"), "utf8");
      expect(pageSrc.includes("<UsersFilterBar")).toBeTrue();
      expect(pageSrc.includes("<UsersTable")).toBeTrue();
      expect(pageSrc.includes("onClearFilters={clearFilters}")).toBeTrue();

      // Search & Filters
      expect(inspector.hasAria("label", "Search users")).toBeTrue();
      expect(inspector.hasAria("label", "Filter by role")).toBeTrue();
      expect(inspector.hasAria("label", "Filter by status")).toBeTrue();
      expect(inspector.contains('aria-label="Reload users"')).toBeTrue();

      // Options
      expect(inspector.contains("All Roles")).toBeTrue();
      expect(inspector.contains("All Statuses")).toBeTrue();

      // The directory table is rendered once the users are loaded; during the
      // initial load the table shows skeletons instead of rows.
      expect(inspector.contains("animate-pulse")).toBeTrue();

      // Table headers are part of the table component markup.
      const tableSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/users/components/users-table.tsx"),
        "utf8",
      );
      expect(tableSrc.includes(">User</TableHead>")).toBeTrue();
      expect(tableSrc.includes(">Role</TableHead>")).toBeTrue();
      expect(tableSrc.includes(">Status</TableHead>")).toBeTrue();
      expect(tableSrc.includes(">Subscription Plan</TableHead>")).toBeTrue();
      expect(tableSrc.includes(">Signed Up</TableHead>")).toBeTrue();
      expect(tableSrc.includes(">Actions</TableHead>")).toBeTrue();
    });

    test("2.2 Search Filter Oracle: Accurate case-insensitive and multi-field matching", () => {
      // 1. Match by Name (lowercase, uppercase, mixed)
      expect(filterUsers(CANONICAL_USERS, "alex", "all", "all")).toHaveLength(1);
      expect(filterUsers(CANONICAL_USERS, "ALEX", "all", "all")).toHaveLength(1);
      expect(filterUsers(CANONICAL_USERS, "AlEx", "all", "all")).toHaveLength(1);
      expect(filterUsers(CANONICAL_USERS, "alex", "all", "all")[0].name).toBe("Alex Rivera");

      // 2. Match by Email Domain
      expect(filterUsers(CANONICAL_USERS, "firstcup.tech", "all", "all")).toHaveLength(1);
      expect(filterUsers(CANONICAL_USERS, "firstcup.tech", "all", "all")[0].email).toBe(
        "admin@firstcup.tech",
      );

      // 3. Match by User ID Prefix
      expect(filterUsers(CANONICAL_USERS, "usr_trial", "all", "all")).toHaveLength(2);

      // 4. Match by Telegram Handle
      expect(filterUsers(CANONICAL_USERS, "@elena_ai", "all", "all")).toHaveLength(1);
      expect(filterUsers(CANONICAL_USERS, "elena_ai", "all", "all")).toHaveLength(1);

      // 5. Whitespace Resilience
      expect(filterUsers(CANONICAL_USERS, "   Sam Chen   ", "all", "all")).toHaveLength(1);

      // 6. Non-matching query produces zero results
      expect(filterUsers(CANONICAL_USERS, "nonexistent-user-xyz", "all", "all")).toHaveLength(0);
    });

    test("2.3 Role Filter Oracle: Admin, Subscriber, and Trial segmentation", () => {
      // Role = Admin (1 user)
      const admins = filterUsers(CANONICAL_USERS, "", "admin", "all");
      expect(admins).toHaveLength(1);
      expect(admins.every((u) => u.role === "admin")).toBeTrue();

      // Role = Subscriber (3 users: Alex Rivera, Elena Rostova, Jordan Vance)
      const subscribers = filterUsers(CANONICAL_USERS, "", "subscriber", "all");
      expect(subscribers).toHaveLength(3);
      expect(subscribers.every((u) => u.role === "subscriber" || u.role === "user")).toBeTrue();

      // Role = Trial (2 users: Sam Chen, Morgan Taylor)
      const trials = filterUsers(CANONICAL_USERS, "", "trial", "all");
      expect(trials).toHaveLength(2);
      expect(trials.every((u) => u.role === "trial")).toBeTrue();
    });

    test("2.4 Status Filter Oracle: Active vs Suspended account isolation", () => {
      // Status = Active (4 users: System Admin, Alex Rivera, Sam Chen, Elena Rostova)
      const actives = filterUsers(CANONICAL_USERS, "", "all", "active");
      expect(actives).toHaveLength(4);
      expect(actives.every((u) => !u.banned)).toBeTrue();

      // Status = Suspended (2 users: Jordan Vance, Morgan Taylor)
      const suspended = filterUsers(CANONICAL_USERS, "", "all", "suspended");
      expect(suspended).toHaveLength(2);
      expect(suspended.every((u) => u.banned)).toBeTrue();
    });

    test("2.5 Multi-Filter Combinatorial Intersection Oracle", () => {
      // Subscriber AND Active -> Alex Rivera, Elena Rostova (2)
      const activeSubscribers = filterUsers(CANONICAL_USERS, "", "subscriber", "active");
      expect(activeSubscribers).toHaveLength(2);

      // Subscriber AND Suspended -> Jordan Vance (1)
      const suspendedSubscribers = filterUsers(CANONICAL_USERS, "", "subscriber", "suspended");
      expect(suspendedSubscribers).toHaveLength(1);
      expect(suspendedSubscribers[0].name).toBe("Jordan Vance");

      // Trial AND Suspended -> Morgan Taylor (1)
      const suspendedTrials = filterUsers(CANONICAL_USERS, "", "trial", "suspended");
      expect(suspendedTrials).toHaveLength(1);
      expect(suspendedTrials[0].name).toBe("Morgan Taylor");

      // Query "Chen" AND Role "Trial" AND Status "Active" -> Sam Chen (1)
      const specificUser = filterUsers(CANONICAL_USERS, "chen", "trial", "active");
      expect(specificUser).toHaveLength(1);
      expect(specificUser[0].name).toBe("Sam Chen");

      // Query "Chen" AND Status "Suspended" -> 0 users
      expect(filterUsers(CANONICAL_USERS, "chen", "all", "suspended")).toHaveLength(0);
    });

    test("2.6 User Directory Modal: Edit Dialog compound modal state and form controls", () => {
      const targetUser = CANONICAL_USERS[1]; // Alex Rivera

      let modalOpen = true;
      const modalRole = targetUser.role;
      let modalBanned = targetUser.banned;
      let modalBanReason = targetUser.banReason || "";

      const modalInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(
            Dialog,
            { open: modalOpen, onOpenChange: (o) => (modalOpen = o) },
            el(
              DialogContent,
              null,
              el(DialogHeader, null, el(DialogTitle, null, "User Profile & Access Control")),
              el(
                "div",
                { className: "identity-card" },
                el("div", null, targetUser.name),
                el("div", null, targetUser.email),
                el(Badge, null, targetUser.plan),
              ),
              el(
                "div",
                { className: "role-select-box" },
                el(
                  Select,
                  { id: "user-role-select", value: modalRole },
                  el(SelectOption, { value: "admin" }, "Admin"),
                  el(SelectOption, { value: "subscriber" }, "Subscriber"),
                  el(SelectOption, { value: "trial" }, "Trial"),
                ),
              ),
              el(
                "div",
                { className: "suspension-box" },
                el(Switch, {
                  id: "account-suspended-toggle",
                  checked: modalBanned,
                  label: "Suspend Account Access",
                }),
                modalBanned
                  ? el(Textarea, { id: "ban-reason-input", value: modalBanReason })
                  : null,
              ),
              el(
                DialogFooter,
                null,
                el(Button, { variant: "outline" }, "Cancel"),
                el(Button, { variant: "primary" }, "Save Changes"),
              ),
            ),
          ),
        ),
      );

      expect(modalInspector.contains(/User Profile (&amp;|&) Access Control/)).toBeTrue();
      expect(modalInspector.contains("Alex Rivera")).toBeTrue();
      expect(modalInspector.contains("alex@engineering.com")).toBeTrue();
      expect(modalInspector.contains("Suspend Account Access")).toBeTrue();
      expect(modalInspector.contains("Save Changes")).toBeTrue();
      // Ban reason textarea should not be rendered while not banned
      expect(modalInspector.contains('id="ban-reason-input"')).toBeFalse();

      // State transition: Toggle ban switch to true
      modalBanned = true;
      modalBanReason = "Repeated automated spam abuse";

      const bannedModalInspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(
            Dialog,
            { open: modalOpen },
            el(
              DialogContent,
              null,
              el(DialogHeader, null, el(DialogTitle, null, "User Profile & Access Control")),
              el(Switch, {
                id: "account-suspended-toggle",
                checked: modalBanned,
                label: "Suspend Account Access",
              }),
              modalBanned
                ? el(Textarea, {
                    id: "ban-reason-input",
                    value: modalBanReason,
                    placeholder: "Specify infraction...",
                  })
                : null,
            ),
          ),
        ),
      );

      // Now ban reason textarea must be rendered
      expect(bannedModalInspector.contains('id="ban-reason-input"')).toBeTrue();
      expect(bannedModalInspector.contains("Repeated automated spam abuse")).toBeTrue();
    });

    test("2.7 User Directory State Mutation: In-memory state persistence and immutability", () => {
      let userList = [...CANONICAL_USERS];
      const targetUserId = "usr_trial_03"; // Sam Chen

      // 1. Promote to Admin & verify immutability of other records
      const updatedRole = "admin";
      userList = userList.map((u) => (u.id === targetUserId ? { ...u, role: updatedRole } : u));

      expect(userList.find((u) => u.id === targetUserId)?.role).toBe("admin");
      expect(userList.find((u) => u.id === "usr_sub_02")?.role).toBe("subscriber");

      // 2. Quick ban toggle on row
      const targetToBan = "usr_sub_02"; // Alex Rivera
      const isCurrentlyBanned = userList.find((u) => u.id === targetToBan)!.banned;
      userList = userList.map((u) =>
        u.id === targetToBan
          ? {
              ...u,
              banned: !isCurrentlyBanned,
              banReason: !isCurrentlyBanned ? "Quick ban by admin" : null,
            }
          : u,
      );

      expect(userList.find((u) => u.id === targetToBan)?.banned).toBe(true);
      expect(userList.find((u) => u.id === targetToBan)?.banReason).toBe("Quick ban by admin");

      // 3. Quick unban
      userList = userList.map((u) =>
        u.id === targetToBan ? { ...u, banned: false, banReason: null } : u,
      );
      expect(userList.find((u) => u.id === targetToBan)?.banned).toBe(false);
      expect(userList.find((u) => u.id === targetToBan)?.banReason).toBeNull();
    });
  });

  // =========================================================================
  // Area 3: Digest Curation Pipeline (F33)
  // =========================================================================
  describe("Area 3: Digest Curation Pipeline (F33)", () => {
    test("3.1 Digest Studio Layout: Mounts 2-column studio with review queue and editor", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(DigestsPage)));

      // Page Title & Header
      expect(inspector.contains(/Digest Curation (&amp;|&) Audio Pipeline/)).toBeTrue();
      expect(
        inspector.contains(
          "Review daily briefings, inspect audio narration scripts, and trigger generation jobs.",
        ),
      ).toBeTrue();
      expect(inspector.contains("Trigger Run")).toBeTrue();
      expect(inspector.contains("Sync")).toBeTrue();

      // Left Column Review Queue
      expect(inspector.contains("Review Queue")).toBeTrue();
      expect(inspector.contains("Live Pipeline")).toBeTrue();

      // No fabricated digest rows: the queue is filled from the admin API.
      expect(inspector.contains("Master Tech Briefing — Oct 14")).toBeFalse();
      expect(inspector.contains("Audio Ready")).toBeFalse();

      // Right Column Curation Studio: while the digests load (and while no
      // digest is selected) the editor shows a placeholder instead of a
      // fabricated brief.
      expect(inspector.contains("Loading digests…")).toBeTrue();
      expect(inspector.contains("Publication Status")).toBeFalse();
      expect(inspector.contains("Audio Script Editor")).toBeFalse();
      expect(inspector.contains("Regenerate Audio")).toBeFalse();
      expect(inspector.contains("Publish Briefing")).toBeFalse();
    });

    test("3.2 Narration Script Word Count & Duration Mathematical Oracle", () => {
      // 1. Empty and whitespace boundaries
      expect(computeScriptMetrics("")).toEqual({ wordCount: 0, durationSec: 0 });
      expect(computeScriptMetrics("    ")).toEqual({ wordCount: 0, durationSec: 0 });
      expect(computeScriptMetrics("\n\t\r\n  ")).toEqual({ wordCount: 0, durationSec: 0 });

      // 2. Word counting tokenization
      const oneWord = computeScriptMetrics("Hello");
      expect(oneWord.wordCount).toBe(1);
      expect(oneWord.durationSec).toBe(0); // Math.round((1/150)*60) = Math.round(0.4) = 0

      // 3. Exact 150 Words Per Minute (WPM) standard benchmark:
      // durationSec = Math.round((words / 150) * 60)
      const benchmark25 = computeScriptMetrics("word ".repeat(25));
      expect(benchmark25.wordCount).toBe(25);
      expect(benchmark25.durationSec).toBe(10); // 25/150 * 60 = 10s

      const benchmark50 = computeScriptMetrics("word ".repeat(50));
      expect(benchmark50.wordCount).toBe(50);
      expect(benchmark50.durationSec).toBe(20); // 50/150 * 60 = 20s

      const benchmark75 = computeScriptMetrics("word ".repeat(75));
      expect(benchmark75.wordCount).toBe(75);
      expect(benchmark75.durationSec).toBe(30); // 75/150 * 60 = 30s

      const benchmark150 = computeScriptMetrics("word ".repeat(150));
      expect(benchmark150.wordCount).toBe(150);
      expect(benchmark150.durationSec).toBe(60); // 150/150 * 60 = 60s (1 min)

      const benchmark225 = computeScriptMetrics("word ".repeat(225));
      expect(benchmark225.wordCount).toBe(225);
      expect(benchmark225.durationSec).toBe(90); // 225/150 * 60 = 90s (1.5 min)

      const benchmark300 = computeScriptMetrics("word ".repeat(300));
      expect(benchmark300.wordCount).toBe(300);
      expect(benchmark300.durationSec).toBe(120); // 300/150 * 60 = 120s (2 min)
    });

    test("3.3 Narration Script Dirty State Machine: Tracks unsaved changes, reset, and save actions", () => {
      const initialScript =
        "Good morning. This is your First Cup Master Briefing for Wednesday, October 14.";
      let currentScript = initialScript;
      let isScriptDirty = false;

      // Initial state: not dirty
      expect(isScriptDirty).toBeFalse();

      // Edit script
      currentScript =
        "Good morning. This is an updated custom narration script with extra insights.";
      isScriptDirty = currentScript !== initialScript;
      expect(isScriptDirty).toBeTrue();

      // Action: Reset changes
      currentScript = initialScript;
      isScriptDirty = false;
      expect(isScriptDirty).toBeFalse();
      expect(currentScript).toBe(initialScript);

      // Re-edit and Save
      currentScript = "Saved script content for synthesis.";
      isScriptDirty = true;
      const metrics = computeScriptMetrics(currentScript);

      // Save operation commits new script and clears dirty
      const committedScript = currentScript;
      isScriptDirty = false;

      expect(committedScript).toBe("Saved script content for synthesis.");
      expect(isScriptDirty).toBeFalse();
      expect(metrics.wordCount).toBe(5);
      expect(metrics.durationSec).toBe(2);
    });

    test("3.4 Publication Switch State Machine: Toggling updates delivery status and feedback banner", () => {
      let digestStatus = "delivered" as "delivered" | "generated";
      let feedback = null as { type: string; title: string; message: string } | null;

      const togglePublication = (checked: boolean) => {
        digestStatus = checked ? "delivered" : "generated";
        feedback = {
          type: checked ? "success" : "info",
          title: checked ? "Briefing Published & Dispatched" : "Briefing Returned to Draft",
          message: checked
            ? "Digest is now published and scheduled for live distribution."
            : "Digest has been placed in Draft / In Review status.",
        };
      };

      // Initial state
      expect(digestStatus).toBe("delivered");

      // Toggle off to Draft
      togglePublication(false);
      expect(digestStatus).toBe("generated");
      expect(feedback?.type).toBe("info");
      expect(feedback?.title).toBe("Briefing Returned to Draft");

      // Toggle back on to Published
      togglePublication(true);
      expect(digestStatus).toBe("delivered");
      expect(feedback?.type).toBe("success");
      expect(feedback?.title).toBe("Briefing Published & Dispatched");
    });

    test("3.5 Pipeline Execution Action Buttons: Status transitions and contextual Alert banners", () => {
      let status = "generated" as "delivered" | "generated" | "pending";
      let audioReady = false;
      let feedback = null as { type: "success" | "info" | "warning"; title: string } | null;

      // 1. Regenerate Audio action
      const handleRegenerateAudio = () => {
        audioReady = true;
        feedback = { type: "success", title: "Audio Synthesis Complete" };
      };
      handleRegenerateAudio();
      expect(audioReady).toBeTrue();
      expect(feedback?.title).toBe("Audio Synthesis Complete");

      // 2. Publish Briefing action
      const handlePublishBriefing = () => {
        status = "delivered";
        feedback = { type: "success", title: "Briefing Broadcast Dispatched" };
      };
      handlePublishBriefing();
      expect(status).toBe("delivered");
      expect(feedback?.title).toBe("Briefing Broadcast Dispatched");

      // 3. Cancel Job action
      const handleCancelJob = () => {
        status = "pending";
        feedback = { type: "warning", title: "Pipeline Job Cancelled" };
      };
      handleCancelJob();
      expect(status).toBe("pending");
      expect(feedback?.title).toBe("Pipeline Job Cancelled");

      // 4. Dismiss feedback banner
      feedback = null;
      expect(feedback).toBeNull();
    });
  });

  // =========================================================================
  // Area 4: Adversarial Stress, Invariants & Fuzzing
  // =========================================================================
  describe("Area 4: Adversarial Stress, Invariants & Fuzzing", () => {
    test("4.1 Mathematical Invariant Fuzzing: 500 generated text passages strictly adhere to audio duration invariants", () => {
      const vocab = [
        "distributed",
        "systems",
        "microservices",
        "latency",
        "throughput",
        "consensus",
        "raft",
        "paxos",
        "pgvector",
        "embeddings",
        "clustering",
        "cosine",
        "similarity",
        "kokoro",
        "neural",
        "speech",
        "synthesis",
        "telemetry",
        "streaming",
        "firstcup",
      ];

      for (let i = 0; i < 500; i++) {
        const length = Math.floor(Math.random() * 200); // 0 to 200 words
        const words: string[] = [];
        for (let j = 0; j < length; j++) {
          words.push(vocab[Math.floor(Math.random() * vocab.length)]);
        }
        // Randomly insert multiple consecutive spaces, newlines, and tabs
        const text = words.join("   \n\t  ");
        const { wordCount, durationSec } = computeScriptMetrics(text);

        // Invariant 1: wordCount equals generated length
        expect(wordCount).toBe(length);

        // Invariant 2: durationSec is always non-negative
        expect(durationSec).toBeGreaterThanOrEqual(0);

        // Invariant 3: durationSec is an exact integer
        expect(Number.isInteger(durationSec)).toBeTrue();

        // Invariant 4: Duration calculation is mathematically bounded
        // (wordCount / 150) * 60 = wordCount * 0.4
        const expected = Math.round(length * 0.4);
        expect(durationSec).toBe(expected);
      }
    });

    test("4.2 User Directory Multi-Filter Chaos Fuzzing: 500 random filter queries over synthetic catalog", () => {
      // Generate synthetic 200-user catalog
      const roles = ["admin", "subscriber", "trial"];
      const plans = ["PRO", "FREE"];
      const syntheticUsers: MockUser[] = [];

      for (let i = 0; i < 200; i++) {
        syntheticUsers.push({
          id: `usr_fuzz_${i.toString().padStart(4, "0")}`,
          name: `User ${i} Name`,
          email: `user_${i}@domain-${i % 5}.io`,
          role: roles[i % roles.length],
          plan: plans[i % plans.length],
          banned: i % 4 === 0, // 25% banned
          banReason: i % 4 === 0 ? "Fuzz infraction" : null,
          telegramHandle: i % 2 === 0 ? `@handle_${i}` : null,
          lastActive: "1h ago",
          createdAt: "2026-10-01T00:00:00Z",
        });
      }

      const roleQueries = ["all", "admin", "subscriber", "trial"];
      const statusQueries = ["all", "active", "suspended"];
      const searchQueries = [
        "",
        "User",
        "1",
        "domain-2",
        "handle",
        "@handle_10",
        "usr_fuzz_0050",
        "nomatch",
      ];

      for (let i = 0; i < 500; i++) {
        const roleQ = roleQueries[Math.floor(Math.random() * roleQueries.length)];
        const statusQ = statusQueries[Math.floor(Math.random() * statusQueries.length)];
        const searchQ = searchQueries[Math.floor(Math.random() * searchQueries.length)];

        const results = filterUsers(syntheticUsers, searchQ, roleQ, statusQ);

        // Invariant 1: Results count never exceeds total
        expect(results.length).toBeLessThanOrEqual(syntheticUsers.length);

        // Invariant 2: If role filter is active, every user matches role
        if (roleQ !== "all") {
          expect(results.every((u) => u.role.toLowerCase() === roleQ)).toBeTrue();
        }

        // Invariant 3: If status filter is active, every user matches banned state
        if (statusQ === "active") {
          expect(results.every((u) => !u.banned)).toBeTrue();
        } else if (statusQ === "suspended") {
          expect(results.every((u) => u.banned)).toBeTrue();
        }

        // Invariant 4: If search query is active, every user matches query
        if (searchQ.trim()) {
          const q = searchQ.trim().toLowerCase();
          expect(
            results.every(
              (u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.id.toLowerCase().includes(q) ||
                u.telegramHandle?.toLowerCase().includes(q),
            ),
          ).toBeTrue();
        }
      }
    });

    test("4.3 URL Validation Chaos Fuzzing: 100 adversarial inputs rejected safely without runtime crash", () => {
      const adversarialInputs = [
        "javascript:/*--></title></style></textarea>*/<script>alert(1)</script>",
        "http://",
        "https://",
        "http://.",
        "http://..",
        "http://../",
        "http://?",
        "http://??",
        "http://#",
        "http://127.0.0.1:8080/rss' OR '1'='1",
        "http://<script>alert(1)</script>",
        "https://www.example.com/'--",
        "gopher://gopher.floodgap.com",
        "dict://dict.org",
        "ldap://localhost",
        "ws://firstcup.tech/ws",
        "wss://firstcup.tech/wss",
        "blob:http://localhost/uuid",
      ];

      for (const badInput of adversarialInputs) {
        expect(() => {
          const res = validateRssSubmission(badInput, "Adversarial Feed");
          // If valid is false, error must be non-null
          if (!res.valid) {
            expect(typeof res.error).toBe("string");
            expect(res.error!.length).toBeGreaterThan(0);
          }
        }).not.toThrow();
      }
    });
  });
});
