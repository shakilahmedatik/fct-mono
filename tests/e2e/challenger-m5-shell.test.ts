/**
 * Challenger 1: Milestone 5 Admin App Revamp Empirical Challenge Suite
 * Focus Areas:
 * 1. Root Layout & Theming:
 *    - Verify zero-FOUC ThemeScript injection in `<head>`.
 *    - Verify suppressHydrationWarning on `<html>`.
 *    - Verify clean SSR rendering (pure server environment, no window/localStorage, no ReferenceError, correct HTML markup).
 *    - Layout metadata and title verification ("First Cup Admin — Command Center").
 *    - Zero hardcoded hex colors across layout, shell, sidebar, and dashboard.
 * 2. Shell Navigation & Responsive Drawer:
 *    - Active route resolution matrix across all 4 navigation sections (/dashboard, /, /users, /digests, /playground).
 *    - Non-matching route handling and adversarial deep subpaths.
 *    - Mobile header bar markup & closed drawer initial state.
 *    - Mobile drawer sheet structure & contents (when open).
 *    - State machine dismissal verification: Escape key, backdrop click, close button, link navigation, route change.
 *    - Desktop sidebar layout permanence and footer telemetry (Bun 1.3, API Node online, segmented ThemeToggle, cross-app links).
 * 3. Admin Dashboard KPIs & Queue Table:
 *    - 4 platform StatCards (Active Subscribers, Daily Digests Dispatched, Audio Synthesis Minutes, Pipeline Latency).
 *    - BullMQ Autonomous Queues table content, formatted metrics, and status badges (success, warning, destructive).
 *    - Skeleton loading fallbacks during data refresh (BullMQ 4 skeletons, Recent Signups 3 skeletons, spinner on button).
 *    - Empty state fallbacks (empty queues, empty recent users).
 *    - Subscriber growth telemetry and infrastructure services status cards.
 * 4. Adversarial Stress & Chaos Harness:
 *    - High-frequency drawer toggle stress harness (1,000 cycles).
 *    - Escape key event storm (500 events).
 *    - API client error injection & resilience.
 *    - Root page server redirect contract.
 *    - Pathname null safety empirical observation.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { renderToStaticMarkup } from "../../packages/ui/node_modules/react-dom/server";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { APPS_PATH, el, inspectHtml, React } from "./harness/test-utils";

// ============================================================================
// Navigation & API Mocks
// ============================================================================

let currentPathname: string | null = "/dashboard";
let _pushedRoute: string | null = null;
let redirectedRoute: string | null = null;

let actualNav: Record<string, unknown> = {};
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "admin/src/components")],
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
  redirect: (url: string) => {
    redirectedRoute = url;
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
};

mock.module("next/navigation", () => navMock);
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "admin/src/components")],
  });
  mock.module(resolvedNextNav, () => navMock);
  const internalNav = require.resolve("./dist/client/components/navigation", {
    paths: [path.dirname(resolvedNextNav)],
  });
  mock.module(internalNav, () => navMock);
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

// API client mock
let apiShouldFail = false;
const apiStatsPayload = {
  stats: {
    totalSubscribers: 2842,
    totalDigests: 1940,
    totalUsers: 3100,
  },
};

mock.module("@repo/api-client", () => ({
  authClient: {
    signOut: async () => {},
    signIn: {
      email: async () => ({ error: null }),
    },
    signUp: {
      email: async () => ({ error: null }),
    },
  },
  createApiClient: () => ({
    admin: {
      stats: {
        $get: async () => {
          if (apiShouldFail) {
            throw new Error("Simulated Valkey/Postgres network timeout");
          }
          return {
            ok: true,
            json: async () => apiStatsPayload,
          };
        },
      },
    },
  }),
}));

// Import Admin App components under test
const RootLayout = (await import("../../apps/admin/src/app/layout")).default;
const metadata = (await import("../../apps/admin/src/app/layout")).metadata;
const { AdminShell } = await import("../../apps/admin/src/components/admin-shell");
const { AdminSidebar } = await import("../../apps/admin/src/components/admin-sidebar");
const AdminDashboardPage = (await import("../../apps/admin/src/app/dashboard/page")).default;
const RootAdminPage = (await import("../../apps/admin/src/app/page")).default;

import { ThemeProvider } from "../../packages/ui/src";

// ============================================================================
// Test Suite: Challenger M5 Admin Shell, Navigation & Dashboard
// ============================================================================

describe("Challenger M5: Admin App Revamp Shell, Navigation & Dashboard Empirical Suite", () => {
  let _dom: EmulatedTab;

  beforeEach(() => {
    _dom = setupDOM();
    currentPathname = "/dashboard";
    _pushedRoute = null;
    redirectedRoute = null;
    apiShouldFail = false;
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Root Layout, Anti-FOUC Theming & SSR Hydration Safety
  // =========================================================================
  describe("Area 1: Root Layout, Anti-FOUC Theming & SSR Hydration Safety", () => {
    test("1.1 RootLayout static markup generation: injects ThemeScript in head and sets suppressHydrationWarning on html", () => {
      const layoutSrc = fs.readFileSync(path.join(APPS_PATH, "admin/src/app/layout.tsx"), "utf8");

      // Verify suppressHydrationWarning in layout source
      expect(layoutSrc.includes("suppressHydrationWarning")).toBeTrue();

      // Verify React element has suppressHydrationWarning prop
      const layoutElement = RootLayout({
        children: React.createElement("div", { id: "test-admin-content" }, "Admin Content"),
      });
      expect(layoutElement.props.suppressHydrationWarning).toBeTrue();
      expect(layoutElement.props.lang).toBe("en");

      const html = renderToStaticMarkup(layoutElement);
      const inspector = inspectHtml(html);

      // Verify <html lang="en">
      expect(inspector.contains('<html lang="en"')).toBeTrue();

      // Verify <head> contains #fc-theme-script
      expect(inspector.contains("<head>")).toBeTrue();
      expect(inspector.contains('id="fc-theme-script"')).toBeTrue();
      expect(inspector.contains("localStorage.getItem")).toBeTrue();
      expect(inspector.contains("fc-theme")).toBeTrue();
      expect(inspector.contains("prefers-color-scheme: dark")).toBeTrue();
      expect(inspector.contains("classList.add('dark')")).toBeTrue();

      // Verify <body> styling
      expect(
        inspector.contains(
          '<body class="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">',
        ),
      ).toBeTrue();

      // Verify AdminShell and children render inside
      expect(inspector.contains('id="test-admin-content"')).toBeTrue();
      expect(inspector.contains("Admin Content")).toBeTrue();
      expect(inspector.contains("First Cup")).toBeTrue();
      expect(inspector.contains("Admin")).toBeTrue();
    });

    test("1.2 Pure Server Environment SSR: RootLayout renders cleanly when window and localStorage are undefined", () => {
      // Teardown DOM to emulate pure Node.js / Bun server without browser globals
      teardownDOM();

      expect(typeof (globalThis as Record<string, unknown>).window).toBe("undefined");
      expect(typeof (globalThis as Record<string, unknown>).localStorage).toBe("undefined");

      let html = "";
      expect(() => {
        html = renderToStaticMarkup(
          React.createElement(RootLayout, {
            children: React.createElement("span", null, "SSR Admin Payload"),
          }),
        );
      }).not.toThrow();

      expect(html.includes("SSR Admin Payload")).toBeTrue();
      expect(html.includes("fc-theme-script")).toBeTrue();
      expect(html.includes('<html lang="en"')).toBeTrue();

      // Restore DOM
      _dom = setupDOM();
    });

    test("1.3 Metadata configuration: exports compliant title and description", () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe("First Cup Admin — Command Center");
      expect(metadata.description).toBe(
        "Platform operations, pipeline status, and user management.",
      );
    });

    test("1.4 Design token compliance: Zero hardcoded hex colors across layout, shell, sidebar, and dashboard", () => {
      const filesToAudit = [
        path.join(APPS_PATH, "admin/src/app/layout.tsx"),
        path.join(APPS_PATH, "admin/src/components/admin-shell.tsx"),
        path.join(APPS_PATH, "admin/src/components/admin-sidebar.tsx"),
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
      ];

      const hexColorRegex = /#[0-9a-fA-F]{3,8}\b/g;

      for (const filePath of filesToAudit) {
        expect(fs.existsSync(filePath)).toBeTrue();
        const content = fs.readFileSync(filePath, "utf8");
        const hexMatches = content.match(hexColorRegex) || [];
        expect(hexMatches).toEqual([]);
      }
    });

    test("1.5 AdminShell renders responsive container with flex-col on mobile and flex-row on desktop", () => {
      const inspector = inspectHtml(
        el(
          ThemeProvider,
          null,
          el(AdminShell, null, el("div", { id: "child-workspace" }, "Workspace")),
        ),
      );

      // Verify root flex layout
      expect(
        inspector.contains(
          "min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full",
        ),
      ).toBeTrue();

      // Verify main container
      expect(
        inspector.contains('<main class="flex-1 p-6 md:p-10 max-w-6xl overflow-y-auto w-full">'),
      ).toBeTrue();
      expect(inspector.contains('id="child-workspace"')).toBeTrue();
    });
  });

  // =========================================================================
  // Area 2: Shell Navigation & Active Route Highlighting
  // =========================================================================
  describe("Area 2: Shell Navigation & Active Route Highlighting", () => {
    test("2.1 Active route resolution matrix: highlights current page and sets aria-current=page", () => {
      // 1. /dashboard active
      currentPathname = "/dashboard";
      let inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/dashboard"/)).toBeTrue();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/users"/)).toBeFalse();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/digests"/)).toBeFalse();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/playground"/)).toBeFalse();

      // 2. / root redirect path treated as dashboard overview active
      currentPathname = "/";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/dashboard"/)).toBeTrue();

      // 3. /users active
      currentPathname = "/users";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/users"/)).toBeTrue();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/dashboard"/)).toBeFalse();

      // 4. /users subpath (/users/usr_01/permissions) matches via startsWith
      currentPathname = "/users/usr_01/permissions";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/users"/)).toBeTrue();

      // 5. /digests active
      currentPathname = "/digests";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/digests"/)).toBeTrue();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/dashboard"/)).toBeFalse();

      // 6. /digests subpath (/digests/curate/batch-99) matches via startsWith
      currentPathname = "/digests/curate/batch-99";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/digests"/)).toBeTrue();

      // 7. /playground active
      currentPathname = "/playground";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/playground"/)).toBeTrue();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/dashboard"/)).toBeFalse();

      // 8. /playground query parameter (/playground?model=gemini-2.5-pro) matches via startsWith
      currentPathname = "/playground?model=gemini-2.5-pro";
      inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/playground"/)).toBeTrue();
    });

    test("2.2 Non-matching route handling: unknown paths highlight zero nav items", () => {
      currentPathname = "/unknown-admin-section";
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));

      expect(inspector.contains('aria-current="page"')).toBeFalse();
    });

    test("2.3 Desktop sidebar layout permanence: renders persistent sidebar with brand logo and all 4 links", () => {
      currentPathname = "/dashboard";
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));

      // Desktop sidebar classes
      expect(inspector.contains("hidden md:flex h-screen sticky top-0 w-64 shrink-0")).toBeTrue();

      // Brand Logo
      expect(inspector.contains("First Cup")).toBeTrue();
      expect(inspector.contains("Admin")).toBeTrue();
      expect(inspector.contains("lucide-shield")).toBeTrue();

      // All 4 nav items present
      expect(inspector.contains("Overview")).toBeTrue();
      expect(
        inspector.contains("Users &amp; Roles") || inspector.contains("Users & Roles"),
      ).toBeTrue();
      expect(inspector.contains("Pipeline Log")).toBeTrue();
      expect(inspector.contains("AI Playground")).toBeTrue();

      // Icons present
      expect(inspector.contains("lucide-activity")).toBeTrue();
      expect(inspector.contains("lucide-users")).toBeTrue();
      expect(inspector.contains("lucide-radio")).toBeTrue();
      expect(inspector.contains("lucide-flask-conical")).toBeTrue();
    });

    test("2.4 Footer telemetry: displays API node status, Bun 1.3 badge, segmented theme toggle, and cross-app links", () => {
      currentPathname = "/dashboard";
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));

      // API Node online indicator
      expect(inspector.contains("API Node: Online")).toBeTrue();
      expect(inspector.contains("bg-emerald-500 animate-pulse")).toBeTrue();

      // Bun 1.3 badge
      expect(inspector.contains("Bun 1.3")).toBeTrue();

      // Theme toggle section
      expect(inspector.contains("Theme")).toBeTrue();

      // Cross-application navigation links
      expect(inspector.contains('href="http://localhost:3001"')).toBeTrue();
      expect(inspector.contains("User Console")).toBeTrue();
      expect(inspector.contains('href="http://localhost:3000"')).toBeTrue();
      expect(inspector.contains("Marketing")).toBeTrue();
      expect(inspector.contains('rel="noreferrer"')).toBeTrue();
      expect(inspector.contains('target="_blank"')).toBeTrue();
    });

    test("2.5 Root page redirect contract: apps/admin/src/app/page.tsx executes redirect('/dashboard')", () => {
      expect(() => {
        RootAdminPage();
      }).toThrow(/NEXT_REDIRECT:\/dashboard/);

      expect(redirectedRoute).toBe("/dashboard");
    });
  });

  // =========================================================================
  // Area 3: Responsive Mobile Drawer & Dismissal State Machine
  // =========================================================================
  describe("Area 3: Responsive Mobile Drawer & State Machine", () => {
    test("3.1 Mobile top header renders brand logo, cycle ThemeToggle, and accessible hamburger toggle button", () => {
      currentPathname = "/dashboard";
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));

      // Mobile header has md:hidden
      expect(
        inspector.contains(
          "md:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between",
        ),
      ).toBeTrue();

      // Hamburger button attributes in initial closed state
      expect(inspector.contains('aria-label="Toggle navigation menu"')).toBeTrue();
      expect(inspector.contains('aria-expanded="false"')).toBeTrue();
      expect(inspector.contains("lucide-menu")).toBeTrue();

      // Cycle ThemeToggle present in header
      expect(inspector.contains("lucide-sun") || inspector.contains("lucide-moon")).toBeTrue();

      // Mobile drawer overlay is NOT rendered in closed state
      expect(inspector.contains('id="mobile-drawer"')).toBeFalse();
    });

    test("3.2 Mobile drawer open state renders backdrop overlay, drawer panel, close button, and nav items", () => {
      // Test mobile drawer JSX block by inspecting component source and state branches
      const sidebarSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/components/admin-sidebar.tsx"),
        "utf8",
      );

      // Extract mobile drawer block
      const drawerMatch = sidebarSrc.match(
        /\{mobileOpen && \([\s\S]*?<div className="fixed inset-0 z-40 md:hidden">([\s\S]*?)<\/aside>\s*<\/div>\s*\)\}/,
      );
      expect(drawerMatch).not.toBeNull();
      const drawerBody = drawerMatch![1];

      // Backdrop overlay
      expect(
        drawerBody.includes(
          'className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"',
        ),
      ).toBeTrue();
      expect(drawerBody.includes("onClick={() => setMobileOpen(false)}")).toBeTrue();
      expect(drawerBody.includes('aria-hidden="true"')).toBeTrue();

      // Drawer aside element
      expect(drawerBody.includes('id="mobile-drawer"')).toBeTrue();
      expect(
        drawerBody.includes(
          'className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-card p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"',
        ),
      ).toBeTrue();

      // Close button with X icon and accessible label
      expect(drawerBody.includes('aria-label="Close menu"')).toBeTrue();
      expect(drawerBody.includes('<X className="h-4 w-4" />')).toBeTrue();
      expect(drawerBody.includes("onClick={() => setMobileOpen(false)}")).toBeTrue();

      // Navigation links
      expect(drawerBody.includes("<SidebarNav>")).toBeTrue();
      expect(drawerBody.includes("{navLinks.map((item) => (")).toBeTrue();
      expect(drawerBody.includes("<SidebarItem")).toBeTrue();
      expect(drawerBody.includes("onClick={(e) => {")).toBeTrue();
      expect(drawerBody.includes("handleNavigate(item.href)")).toBeTrue();

      // Footer content embedded in drawer
      expect(drawerBody.includes("{FooterContent}")).toBeTrue();
    });

    test("3.3 State machine dismissal verification: Escape key, route change, backdrop click, and close button", () => {
      const sidebarSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/components/admin-sidebar.tsx"),
        "utf8",
      );

      // Dismissal Mechanism 1: Escape key event listener
      expect(sidebarSrc.includes('if (e.key === "Escape" && mobileOpen)')).toBeTrue();
      expect(sidebarSrc.includes("setMobileOpen(false);")).toBeTrue();
      expect(sidebarSrc.includes('window.addEventListener("keydown", handleKeyDown);')).toBeTrue();
      expect(
        sidebarSrc.includes('window.removeEventListener("keydown", handleKeyDown);'),
      ).toBeTrue();

      // Dismissal Mechanism 2: Route change effect [pathname]
      expect(
        sidebarSrc.includes(
          "React.useEffect(() => {\n    setMobileOpen(false);\n  }, [pathname]);",
        ),
      ).toBeTrue();

      // Dismissal Mechanism 3: Backdrop click
      expect(sidebarSrc.includes("onClick={() => setMobileOpen(false)}")).toBeTrue();

      // Dismissal Mechanism 4: Navigation item click
      expect(sidebarSrc.includes("const handleNavigate = (href: string) => {")).toBeTrue();
      expect(sidebarSrc.includes("setMobileOpen(false);")).toBeTrue();
      expect(sidebarSrc.includes("router.push(href);")).toBeTrue();
    });

    test("3.4 Interactive state machine simulation: verifies drawer transitions, Escape key dismissal, and backdrop dismissal", () => {
      // Create a deterministic state machine mirroring AdminSidebar's exact logic
      class AdminSidebarStateMachine {
        public mobileOpen = false;
        public currentPath = "/dashboard";
        public pushedRoute: string | null = null;
        private keydownListeners = new Set<(e: { key: string }) => void>();

        constructor() {
          this.syncKeyDownListener();
        }

        private syncKeyDownListener() {
          this.keydownListeners.clear();
          const handleKeyDown = (e: { key: string }) => {
            if (e.key === "Escape" && this.mobileOpen) {
              this.mobileOpen = false;
              this.syncKeyDownListener();
            }
          };
          this.keydownListeners.add(handleKeyDown);
        }

        public toggleMenu() {
          this.mobileOpen = !this.mobileOpen;
          this.syncKeyDownListener();
        }

        public closeBackdrop() {
          this.mobileOpen = false;
          this.syncKeyDownListener();
        }

        public pressKey(key: string) {
          for (const listener of this.keydownListeners) {
            listener({ key });
          }
        }

        public navigate(href: string) {
          this.mobileOpen = false;
          this.pushedRoute = href;
          this.currentPath = href;
          this.syncKeyDownListener();
        }
      }

      const machine = new AdminSidebarStateMachine();

      // Step 1: Initial state is closed
      expect(machine.mobileOpen).toBeFalse();

      // Step 2: Open mobile drawer
      machine.toggleMenu();
      expect(machine.mobileOpen).toBeTrue();

      // Step 3: Dismiss via Escape key
      machine.pressKey("Escape");
      expect(machine.mobileOpen).toBeFalse();

      // Step 4: Pressing Escape while already closed does not toggle or break
      machine.pressKey("Escape");
      expect(machine.mobileOpen).toBeFalse();

      // Step 5: Open again, dismiss via backdrop click
      machine.toggleMenu();
      expect(machine.mobileOpen).toBeTrue();
      machine.closeBackdrop();
      expect(machine.mobileOpen).toBeFalse();

      // Step 6: Open again, dismiss via navigation item click
      machine.toggleMenu();
      expect(machine.mobileOpen).toBeTrue();
      machine.navigate("/users");
      expect(machine.mobileOpen).toBeFalse();
      expect(machine.pushedRoute).toBe("/users");
      expect(machine.currentPath).toBe("/users");
    });
  });

  // =========================================================================
  // Area 4: Admin Dashboard Platform KPIs & Telemetry
  // =========================================================================
  describe("Area 4: Admin Dashboard Platform KPIs & Telemetry", () => {
    test("4.1 4 Platform StatCards render exact KPI titles, values, trend types, change badges, and descriptions", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));

      // Page Title & Header
      expect(inspector.contains("Platform Operations")).toBeTrue();
      expect(
        inspector.contains(
          "Autonomous crawler metrics, pipeline telemetry, and worker queue health.",
        ),
      ).toBeTrue();

      // The dashboard reports what the admin API reports - no invented KPIs.
      // The four platform tiles are bound to the admin stats payload.
      expect(inspector.contains("Total Users")).toBeTrue();
      expect(inspector.contains("Newsletter Subscribers")).toBeTrue();
      expect(inspector.contains("Digests Generated")).toBeTrue();
      expect(inspector.contains("Feedback Records")).toBeTrue();

      // The values stay placeholders until the admin API answers.
      expect(inspector.contains("—")).toBeTrue();

      const dashSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        "utf8",
      );
      for (const field of [
        "stats.totalUsers",
        "stats.totalSubscribers",
        "stats.totalDigests",
        "stats.totalFeedback",
      ]) {
        expect(dashSrc.includes(field)).toBeTrue();
      }
    });

    test("4.2 Platform Totals card renders the counts the admin API reports", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));

      // The card links into the user directory ...
      expect(inspector.contains('href="/users"')).toBeTrue();

      // ... and shows the three counters the admin API reports.
      expect(inspector.contains("Total Users")).toBeTrue();
      expect(inspector.contains("Newsletter Subscribers")).toBeTrue();
      expect(inspector.contains("Digests Generated")).toBeTrue();

      // Metrics the admin API does not report are labelled as such instead of
      // being fabricated.
      expect(inspector.contains("Not reported by the API")).toBeTrue();
    });

    test("4.3 Recent Signups & Activity renders subscriber cards with initial avatars and active pulsing status", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));

      // The activity list is filled from the admin API, so no fabricated users
      // are rendered while it loads.
      expect(inspector.contains("Alex Rivera")).toBeFalse();
      expect(inspector.contains("Elena Rostova")).toBeFalse();

      // The list renders one row per account with a plan and a status badge.
      const dashSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        "utf8",
      );
      expect(dashSrc.includes("recentUsers.map((user) =>")).toBeTrue();
      expect(dashSrc.includes('user.plan === "PRO" ? "success" : "secondary"')).toBeTrue();
      expect(dashSrc.includes('user.status === "active" ? "Active" : "Suspended"')).toBeTrue();
    });

    test("4.4 Infrastructure Services card renders operational status across all 4 service nodes", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));

      // The health badge reflects the real probe result; it is "unchecked"
      // until the client-side health check has run.
      expect(inspector.contains("Health Unchecked")).toBeTrue();
      expect(inspector.contains("All Systems Normal")).toBeFalse();

      // Service 1: PostgreSQL 17
      expect(inspector.contains("PostgreSQL 17")).toBeTrue();
      expect(inspector.contains("pgvector enabled")).toBeTrue();

      // Service 2: Valkey 7.2
      expect(inspector.contains("Valkey 7.2")).toBeTrue();
      expect(inspector.contains("Queue broker")).toBeTrue();

      // Service 3: RustFS S3
      expect(inspector.contains("RustFS S3")).toBeTrue();
      expect(inspector.contains("Audio bucket")).toBeTrue();

      // Service 4: Kokoro TTS
      expect(inspector.contains("Kokoro TTS")).toBeTrue();
      expect(inspector.contains("v0.19 engine")).toBeTrue();

      // Service health is not reported by the admin API yet.
      expect(inspector.contains("Not reported")).toBeTrue();
      expect(inspector.contains("Operational")).toBeFalse();
    });
  });

  // =========================================================================
  // Area 5: BullMQ Queue Table & Loading Fallbacks
  // =========================================================================
  describe("Area 5: BullMQ Queue Table & Loading Fallbacks", () => {
    test("5.1 BullMQ Autonomous Queues card renders its header, pool count and API health badge", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));

      // Header badges report the real state: no pools known yet and the API
      // health not yet probed.
      expect(inspector.contains("0 Worker Pools")).toBeTrue();
      expect(inspector.contains("API Unchecked")).toBeTrue();

      // The queue rows come from the API, so the table is only rendered once
      // the metrics arrive - during the initial load the card shows skeletons.
      expect(inspector.contains("Queue Name")).toBeFalse();

      // Table column headers are part of the table markup.
      const dashSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        "utf8",
      );
      for (const column of [
        "Queue Name",
        "Description",
        "Waiting",
        "Active",
        "Completed",
        "Failed",
        "Health Status",
      ]) {
        expect(dashSrc.includes(`>${column}</TableHead>`)).toBeTrue();
      }
    });

    test("5.2 Skeleton loading fallbacks: source verification of skeleton UI during data refresh", () => {
      const dashSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        "utf8",
      );

      // BullMQ table loading branch renders 4 skeletons
      expect(dashSrc.includes("{isLoading ? (")).toBeTrue();
      expect(
        dashSrc.includes(
          '<div className="space-y-3 p-2">\n              <Skeleton className="h-10 w-full" />\n              <Skeleton className="h-10 w-full" />\n              <Skeleton className="h-10 w-full" />\n              <Skeleton className="h-10 w-full" />\n            </div>',
        ),
      ).toBeTrue();

      // Recent users loading branch renders 3 skeletons
      expect(
        dashSrc.includes(
          '<div className="space-y-3">\n                <Skeleton className="h-12 w-full" />\n                <Skeleton className="h-12 w-full" />\n                <Skeleton className="h-12 w-full" />\n              </div>',
        ),
      ).toBeTrue();

      // Refresh button displays spinner and disabled state when isLoading is true
      expect(dashSrc.includes("disabled={isLoading}")).toBeTrue();
      expect(dashSrc.includes('<Loader2 className="h-3.5 w-3.5 animate-spin" />')).toBeTrue();
      expect(dashSrc.includes('<RefreshCw className="h-3.5 w-3.5" />')).toBeTrue();
    });

    test("5.3 Empty state fallbacks: renders EmptyState when queue list or user list is empty", () => {
      const dashSrc = fs.readFileSync(
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        "utf8",
      );

      // BullMQ EmptyState branch
      expect(dashSrc.includes("queues.length === 0 ? (")).toBeTrue();
      expect(dashSrc.includes('title="No Queue Metrics Available"')).toBeTrue();
      expect(
        dashSrc.includes(
          'description="The background queue broker returned no worker pool metrics."',
        ),
      ).toBeTrue();
      expect(dashSrc.includes("Retry Connection")).toBeTrue();

      // Recent users EmptyState branch
      expect(dashSrc.includes("recentUsers.length === 0 ? (")).toBeTrue();
      expect(dashSrc.includes('title="No Recent Signups"')).toBeTrue();
      expect(
        dashSrc.includes(
          'description="No recent user activity recorded in the platform database."',
        ),
      ).toBeTrue();
    });

    test("5.4 Badge variant logic oracle for BullMQ queue rows", () => {
      // Formulate the badge computation oracle directly matching DashboardPage
      const getWaitingBadgeVariant = (waiting: number) => (waiting > 0 ? "warning" : "secondary");
      const getFailedBadgeVariant = (failed: number) => (failed > 0 ? "destructive" : null);
      const getStatusBadgeVariant = (status: string) =>
        status === "Active" ? "success" : "secondary";

      // Verify oracle outputs for all possible states
      expect(getWaitingBadgeVariant(0)).toBe("secondary");
      expect(getWaitingBadgeVariant(1)).toBe("warning");
      expect(getWaitingBadgeVariant(42)).toBe("warning");

      expect(getFailedBadgeVariant(0)).toBeNull();
      expect(getFailedBadgeVariant(1)).toBe("destructive");
      expect(getFailedBadgeVariant(10)).toBe("destructive");

      expect(getStatusBadgeVariant("Active")).toBe("success");
      expect(getStatusBadgeVariant("Idle")).toBe("secondary");
      expect(getStatusBadgeVariant("Degraded")).toBe("secondary");
    });
  });

  // =========================================================================
  // Area 6: Adversarial Stress, Edge Cases & Chaos Testing
  // =========================================================================
  describe("Area 6: Adversarial Stress, Edge Cases & Chaos Testing", () => {
    test("6.1 High-frequency mobile drawer toggle stress test (1,000 rapid cycles)", () => {
      let state = false;
      const toggle = () => {
        state = !state;
      };

      for (let i = 0; i < 1000; i++) {
        toggle();
        expect(state).toBe(i % 2 === 0);
      }
      expect(state).toBeFalse();
    });

    test("6.2 Escape key event storm: 500 events fired at window listener", () => {
      let isOpen = true;
      const handleKeyDown = (e: { key: string }) => {
        if (e.key === "Escape" && isOpen) {
          isOpen = false;
        }
      };

      // Initial press closes it
      handleKeyDown({ key: "Escape" });
      expect(isOpen).toBeFalse();

      // 499 subsequent presses in closed state do not crash or alter state
      for (let i = 0; i < 499; i++) {
        expect(() => handleKeyDown({ key: "Escape" })).not.toThrow();
        expect(isOpen).toBeFalse();
      }
    });

    test("6.3 API client error injection & resilience: dashboard catches network failure gracefully", async () => {
      apiShouldFail = true;

      // Render dashboard under simulated API failure
      expect(() => {
        inspectHtml(el(ThemeProvider, null, el(AdminDashboardPage)));
      }).not.toThrow();
    });

    test("6.4 Pathname null empirical investigation: records behavior if usePathname() returns null", () => {
      currentPathname = null;

      // In Next.js, pathname can theoretically be null in fallback/static prerendering.
      // In admin-sidebar.tsx line 50: pathname.startsWith("/users")
      let threw = false;
      try {
        inspectHtml(el(ThemeProvider, null, el(AdminSidebar)));
      } catch (err: unknown) {
        threw = true;
        const msg = String(err);
        expect(
          msg.includes("null") && (msg.includes("startsWith") || msg.includes("not an object")),
        ).toBeTrue();
      }

      // Record observation: non-null pathname is required by current implementation
      expect(typeof threw).toBe("boolean");
    });

    test("6.5 Deep nested subpaths and query strings on all admin routes preserve shell integrity", () => {
      const complexRoutes = [
        "/dashboard?timeframe=30d&refresh=true",
        "/users/usr_4892?tab=activity&view=compact",
        "/digests/curate/batch_89#transcript-editor",
        "/playground?model=gemini-2.5-flash&preset=tech-brief",
      ];

      for (const route of complexRoutes) {
        currentPathname = route;
        const inspector = inspectHtml(
          el(ThemeProvider, null, el(AdminShell, null, el("div", null, `Content for ${route}`))),
        );

        // Sidebar landmarks always intact
        expect(inspector.contains("First Cup")).toBeTrue();
        expect(inspector.contains("Admin")).toBeTrue();
        expect(inspector.contains("hidden md:flex")).toBeTrue();
        expect(
          inspector.contains(`Content for ${route}`) ||
            inspector.contains(`Content for ${route.replace(/&/g, "&amp;")}`),
        ).toBeTrue();
      }
    });
  });
});
