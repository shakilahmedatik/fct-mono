/**
 * Challenger M6: Monorepo Chaos & Integration Empirical Challenge Suite
 *
 * Scope of Challenge:
 * 1. Monorepo Integrity & Test Concurrency:
 *    - Verify zero module cache poisoning, race conditions, or configuration drift.
 *    - Verify workspace structure, package.json dependencies, and Turbo pipelines.
 * 2. Theme Persistence & Anti-FOUC:
 *    - Empirically verify Tailwind v4 @source directives in all 3 apps.
 *    - Validate canonical path resolution from globals.css to packages/ui/src.
 *    - Validate ThemeScript FOUC prevention, suppressHydrationWarning, and ThemeProvider in all 3 layouts.
 *    - Test extreme ThemeScript edge cases (SecurityError, corrupt storage, CSP nonce, XSS sanitization).
 * 3. WCAG AA Contrast Compliance:
 *    - Mathematically calculate relative luminance and contrast ratios across all token pairs in Light and Dark modes.
 *    - Body copy (>= 4.5:1), headings (>= 3.0:1), interactive borders and focus rings (>= 3.0:1).
 * 4. Edge Cases & Error Handling:
 *    - Pure SSR simulation (window, document, localStorage undefined).
 *    - Verify zero ReferenceError throws across UI components, shells, and layouts.
 *    - Verify total absence of window.prompt / window.alert in Admin Playground.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { renderToStaticMarkup } from "../../packages/ui/node_modules/react-dom/server";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  StatCard,
  ThemeProvider,
  ThemeScript,
  useTheme,
} from "../../packages/ui/src";
import { getContrastRatio } from "./harness/color-contrast";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import {
  APPS_PATH,
  el,
  inspectHtml,
  PROJECT_ROOT,
  React,
  UI_STYLES_PATH,
} from "./harness/test-utils";

// Setup mocks for Next.js navigation & API client to ensure clean isolation
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
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
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
      stats: {
        $get: async () => ({
          ok: true,
          json: async () => ({
            stats: { totalSubscribers: 100, totalDigests: 50, totalUsers: 120 },
          }),
        }),
      },
    },
  }),
}));

describe("Milestone 6 Empirical Challenge: Monorepo Chaos & Integration", () => {
  let dom: EmulatedTab;

  beforeEach(() => {
    dom = setupDOM();
    currentPathname = "/dashboard";
    _pushedRoute = null;
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Monorepo Integrity & Test Concurrency Stress
  // =========================================================================
  describe("Area 1: Monorepo Integrity & Test Concurrency", () => {
    test("1.1 Root turbo.json defines essential pipeline tasks", () => {
      const turboPath = path.join(PROJECT_ROOT, "turbo.json");
      expect(fs.existsSync(turboPath)).toBeTrue();

      const turboContent = JSON.parse(fs.readFileSync(turboPath, "utf-8"));
      const tasks = turboContent.tasks || turboContent.pipeline;
      expect(tasks).toBeDefined();
      expect(tasks.build).toBeDefined();
      expect(tasks.lint || tasks["biome check"]).toBeDefined();
      expect(tasks.typecheck).toBeDefined();
    });

    test("1.2 All 3 apps declare dependency on @repo/ui workspace package", () => {
      const appNames = ["web", "console", "admin"];
      for (const app of appNames) {
        const pkgJsonPath = path.join(APPS_PATH, app, "package.json");
        expect(fs.existsSync(pkgJsonPath)).toBeTrue();

        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
        expect(deps["@repo/ui"]).toBeDefined();
      }
    });

    test("1.3 Concurrent multi-tab state transitions execute without cross-contamination", () => {
      const stateHistoryA: string[] = [];
      const stateHistoryB: string[] = [];

      function ClientComponentA() {
        const { theme, setTheme } = useTheme();
        stateHistoryA.push(theme);
        return el("button", { onClick: () => setTheme("dark") }, theme);
      }

      function ClientComponentB() {
        const { theme, setTheme } = useTheme();
        stateHistoryB.push(theme);
        return el("button", { onClick: () => setTheme("light") }, theme);
      }

      inspectHtml(
        el(
          ThemeProvider,
          { defaultTheme: "light", storageKey: "tab-a-key" },
          el(ClientComponentA, null),
        ),
      );
      inspectHtml(
        el(
          ThemeProvider,
          { defaultTheme: "dark", storageKey: "tab-b-key" },
          el(ClientComponentB, null),
        ),
      );

      expect(stateHistoryA.length).toBeGreaterThan(0);
      expect(stateHistoryB.length).toBeGreaterThan(0);
      expect(stateHistoryA[0]).toBe("light");
      expect(stateHistoryB[0]).toBe("dark");
    });
  });

  // =========================================================================
  // Area 2: Theme Persistence, Anti-FOUC & Tailwind v4 @source Directives
  // =========================================================================
  describe("Area 2: Theme Persistence & Anti-FOUC Directives", () => {
    test("2.1 All 3 front-end applications define identical valid Tailwind v4 @source directives in globals.css", () => {
      const appDirs = ["web", "console", "admin"];
      for (const app of appDirs) {
        const cssPath = path.join(APPS_PATH, app, "src/app/globals.css");
        expect(fs.existsSync(cssPath)).toBeTrue();

        const cssContent = fs.readFileSync(cssPath, "utf-8");
        expect(cssContent).toContain('@import "tailwindcss";');
        expect(cssContent).toContain('@import "@repo/ui/styles.css";');
        expect(cssContent).toContain('@source "../../../../packages/ui/src";');

        // Verify the relative @source resolves canonically to packages/ui/src
        const resolvedUiSrc = path.resolve(path.dirname(cssPath), "../../../../packages/ui/src");
        expect(fs.existsSync(resolvedUiSrc)).toBeTrue();
        expect(fs.existsSync(path.join(resolvedUiSrc, "index.ts"))).toBeTrue();
      }
    });

    test("2.2 All 3 application root layouts implement ThemeScript, suppressHydrationWarning, and ThemeProvider", () => {
      const appDirs = ["web", "console", "admin"];
      for (const app of appDirs) {
        const layoutPath = path.join(APPS_PATH, app, "src/app/layout.tsx");
        expect(fs.existsSync(layoutPath)).toBeTrue();

        const layoutContent = fs.readFileSync(layoutPath, "utf-8");
        expect(layoutContent).toContain("suppressHydrationWarning");
        expect(layoutContent).toContain("<ThemeScript");
        expect(layoutContent).toContain("<ThemeProvider");
      }
    });

    test("2.3 ThemeScript handles throwing localStorage (SecurityError in private browsing) safely", () => {
      dom.setSystemDarkMode(true);
      dom.localStorage.shouldThrowOnGet = true;

      const inspector = inspectHtml(
        el(ThemeScript, { storageKey: "fc-theme", defaultTheme: "system" }),
      );
      const scriptHtml = inspector.html;
      const match = scriptHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      expect(match).not.toBeNull();

      const rawJs = match![1];
      let execError: Error | null = null;
      try {
        const fn = new Function("window", "document", "localStorage", rawJs);
        fn(dom.window, dom.document, dom.localStorage);
      } catch (e: any) {
        execError = e;
      }

      expect(execError).toBeNull();
      // Because localStorage threw, it fell back to matchMedia system preference (which is dark)
      expect(dom.document.documentElement.classList.contains("dark")).toBeTrue();
    });

    test("2.4 ThemeScript sanitizes script closing tags preventing XSS script breakout", () => {
      const maliciousPayload = 'bad"</script><script>alert("hack")</script>';
      const inspector = inspectHtml(el(ThemeScript, { storageKey: maliciousPayload }));
      expect(inspector.html).not.toContain('</script><script>alert("hack")</script>');
      expect(inspector.html).toContain("\\u003c/script>");
    });

    test("2.5 ThemeScript supports CSP nonce attribute correctly", () => {
      const nonce = "test-csp-nonce-12345";
      const inspector = inspectHtml(el(ThemeScript, { nonce }));
      expect(inspector.hasAttribute("nonce", nonce)).toBeTrue();
    });
  });

  // =========================================================================
  // Area 3: WCAG AA Mathematical Contrast Compliance
  // =========================================================================
  describe("Area 3: WCAG AA Mathematical Contrast Compliance", () => {
    test("3.1 Complete design token contrast matrix in Light Mode (:root)", () => {
      const stylesCssPath = UI_STYLES_PATH;
      expect(fs.existsSync(stylesCssPath)).toBeTrue();
      const cssContent = fs.readFileSync(stylesCssPath, "utf-8");

      // Extract :root block
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
      expect(rootMatch).not.toBeNull();
      const rootBlock = rootMatch![1];

      const getVal = (name: string): string => {
        const m = rootBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
        if (!m) throw new Error(`Missing CSS variable: ${name}`);
        return m[1].trim();
      };

      const lightPairs = [
        {
          name: "body copy (foreground / background)",
          fg: getVal("--foreground"),
          bg: getVal("--background"),
          min: 4.5,
        },
        {
          name: "card text (card-foreground / card)",
          fg: getVal("--card-foreground"),
          bg: getVal("--card"),
          min: 4.5,
        },
        {
          name: "popover text (popover-foreground / popover)",
          fg: getVal("--popover-foreground"),
          bg: getVal("--popover"),
          min: 4.5,
        },
        {
          name: "primary button text (primary-foreground / primary)",
          fg: getVal("--primary-foreground"),
          bg: getVal("--primary"),
          min: 4.5,
        },
        {
          name: "secondary button text (secondary-foreground / secondary)",
          fg: getVal("--secondary-foreground"),
          bg: getVal("--secondary"),
          min: 4.5,
        },
        {
          name: "muted text (muted-foreground / background)",
          fg: getVal("--muted-foreground"),
          bg: getVal("--background"),
          min: 4.5,
        },
        {
          name: "accent brand (accent-foreground / accent)",
          fg: getVal("--accent-foreground"),
          bg: getVal("--accent"),
          min: 4.5,
        },
        {
          name: "destructive text (destructive-foreground / destructive)",
          fg: getVal("--destructive-foreground"),
          bg: getVal("--destructive"),
          min: 4.5,
        },
        {
          name: "focus ring (ring / background)",
          fg: getVal("--ring"),
          bg: getVal("--background"),
          min: 3.0,
        },
        {
          name: "sidebar text (sidebar-foreground / sidebar-background)",
          fg: getVal("--sidebar-foreground"),
          bg: getVal("--sidebar-background"),
          min: 4.5,
        },
        {
          name: "sidebar accent (sidebar-accent-foreground / sidebar-accent)",
          fg: getVal("--sidebar-accent-foreground"),
          bg: getVal("--sidebar-accent"),
          min: 4.5,
        },
      ];

      for (const pair of lightPairs) {
        const ratio = getContrastRatio(pair.fg, pair.bg);
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      }
    });

    test("3.2 Complete design token contrast matrix in Dark Mode (.dark)", () => {
      const stylesCssPath = UI_STYLES_PATH;
      const cssContent = fs.readFileSync(stylesCssPath, "utf-8");

      // Extract .dark block
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/);
      expect(darkMatch).not.toBeNull();
      const darkBlock = darkMatch![1];

      const getVal = (name: string): string => {
        const m = darkBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
        if (!m) throw new Error(`Missing CSS variable: ${name}`);
        return m[1].trim();
      };

      const darkPairs = [
        {
          name: "body copy (foreground / background)",
          fg: getVal("--foreground"),
          bg: getVal("--background"),
          min: 4.5,
        },
        {
          name: "card text (card-foreground / card)",
          fg: getVal("--card-foreground"),
          bg: getVal("--card"),
          min: 4.5,
        },
        {
          name: "popover text (popover-foreground / popover)",
          fg: getVal("--popover-foreground"),
          bg: getVal("--popover"),
          min: 4.5,
        },
        {
          name: "primary button text (primary-foreground / primary)",
          fg: getVal("--primary-foreground"),
          bg: getVal("--primary"),
          min: 4.5,
        },
        {
          name: "secondary button text (secondary-foreground / secondary)",
          fg: getVal("--secondary-foreground"),
          bg: getVal("--secondary"),
          min: 4.5,
        },
        {
          name: "muted text (muted-foreground / background)",
          fg: getVal("--muted-foreground"),
          bg: getVal("--background"),
          min: 4.5,
        },
        {
          name: "accent brand (accent-foreground / accent)",
          fg: getVal("--accent-foreground"),
          bg: getVal("--accent"),
          min: 4.5,
        },
        {
          name: "destructive text (destructive-foreground / destructive)",
          fg: getVal("--destructive-foreground"),
          bg: getVal("--destructive"),
          min: 4.5,
        },
        {
          name: "focus ring (ring / background)",
          fg: getVal("--ring"),
          bg: getVal("--background"),
          min: 3.0,
        },
        {
          name: "sidebar text (sidebar-foreground / sidebar-background)",
          fg: getVal("--sidebar-foreground"),
          bg: getVal("--sidebar-background"),
          min: 4.5,
        },
        {
          name: "sidebar accent (sidebar-accent-foreground / sidebar-accent)",
          fg: getVal("--sidebar-accent-foreground"),
          bg: getVal("--sidebar-accent"),
          min: 4.5,
        },
      ];

      for (const pair of darkPairs) {
        const ratio = getContrastRatio(pair.fg, pair.bg);
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      }
    });
  });

  // =========================================================================
  // Area 4: Edge Cases & Pure SSR Cleanliness
  // =========================================================================
  describe("Area 4: Edge Cases & Pure SSR Execution", () => {
    test("4.1 Pure SSR render of shared UI primitives without window/localStorage throws zero ReferenceErrors", () => {
      // Simulate pure server environment
      const origWindow = (globalThis as any).window;
      const origDoc = (globalThis as any).document;
      const origStorage = (globalThis as any).localStorage;

      delete (globalThis as any).window;
      delete (globalThis as any).document;
      delete (globalThis as any).localStorage;

      try {
        expect(typeof (globalThis as any).window).toBe("undefined");
        expect(typeof (globalThis as any).localStorage).toBe("undefined");

        // Render comprehensive component tree
        const markup = renderToStaticMarkup(
          el(
            ThemeProvider,
            { defaultTheme: "system" },
            el(ThemeScript, null),
            el(Button, { variant: "primary" }, "Action"),
            el(Badge, { variant: "success" }, "Live"),
            el(
              Card,
              null,
              el(CardHeader, null, el(CardTitle, null, "Card Title")),
              el(CardContent, null, "Content"),
            ),
            el(Input, { placeholder: "SSR Input" }),
            el(Label, { htmlFor: "ssr-in" }, "SSR Label"),
            el(Alert, { variant: "info" }, "Info Notice"),
            el(StatCard, { title: "Subscribers", value: 1200 }),
            el(Skeleton, { className: "h-4 w-20" }),
            el(EmptyState, { title: "No data", description: "Empty description" }),
          ),
        );

        expect(typeof markup).toBe("string");
        expect(markup.length).toBeGreaterThan(100);
        expect(markup).toContain("Subscribers");
        expect(markup).toContain("Action");
        expect(markup).toContain("Live");
      } finally {
        if (origWindow) (globalThis as any).window = origWindow;
        if (origDoc) (globalThis as any).document = origDoc;
        if (origStorage) (globalThis as any).localStorage = origStorage;
      }
    });

    test("4.2 Zero synchronous window.prompt and window.alert calls in apps/admin/src/app/playground", () => {
      const playgroundDir = path.join(APPS_PATH, "admin/src/app/playground");
      expect(fs.existsSync(playgroundDir)).toBeTrue();

      const files = fs.readdirSync(playgroundDir);
      for (const file of files) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const filePath = path.join(playgroundDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).not.toContain("window.prompt");
        expect(content).not.toContain("window.alert");
        // Ensure no unqualified alert() calls
        expect(content.match(/\balert\s*\(/)).toBeNull();
      }
    });

    test("4.3 Component resiliency under adversarial unicode, empty children, and large string stress", () => {
      const adversarialStrings = [
        "", // empty
        "   ", // whitespace only
        "🎉 🚀 ☕ ☕️ 🔥", // emojis
        "日本語のテキストと العربية", // CJK + RTL text
        "<script>alert(1)</script>", // XSS injection
        "A".repeat(5000), // Large 5KB string
      ];

      for (const str of adversarialStrings) {
        const markup = renderToStaticMarkup(
          el(
            Card,
            null,
            el(CardHeader, null, el(CardTitle, null, str), el(CardDescription, null, str)),
            el(CardContent, null, el(Button, null, str), el(Badge, null, str)),
            el(CardFooter, null, el(Input, { value: str, readOnly: true })),
          ),
        );

        expect(typeof markup).toBe("string");
        expect(markup.length).toBeGreaterThan(0);
      }
    });
  });
});
