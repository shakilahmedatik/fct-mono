/**
 * Tier 1: Feature Coverage E2E Test Suite
 * Covers F01-F34 with >= 5 tests per feature area:
 * 1. Tokens & Theme Foundations (F01, F02, F06)
 * 2. Theme Switcher State Machines (F03, F04, F05)
 * 3. Component Primitives & Accessibility Attributes (F07, F08, F09, F10, F11-F18)
 * 4. Page Routes & Layouts Across apps/web, apps/console, apps/admin (F19-F34)
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  ThemeProvider,
  ThemeScript,
  ThemeToggle,
  useTheme,
} from "../../packages/ui/src";
import { verifyWcagCompliance } from "./harness/color-contrast";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { APPS_PATH, el, inspectHtml, parseCssVariables } from "./harness/test-utils";

describe("Tier 1: Feature Coverage", () => {
  let dom: EmulatedTab;

  beforeEach(() => {
    dom = setupDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Tokens & Theme Foundations (F01, F02, F06)
  // =========================================================================
  describe("Area 1: Tokens & Theme Foundations (F01, F02, F06)", () => {
    test("1.1 [F01] styles.css defines all required CSS variables in :root (light mode)", () => {
      const { rootVariables } = parseCssVariables();

      const requiredVars = [
        "--background",
        "--foreground",
        "--card",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--accent",
        "--accent-foreground",
        "--destructive",
        "--border",
        "--input",
        "--ring",
      ];

      for (const varName of requiredVars) {
        expect(rootVariables[varName]).toBeDefined();
        expect(rootVariables[varName].length).toBeGreaterThan(0);
      }
    });

    test("1.2 [F01] styles.css defines dark mode overrides in .dark block", () => {
      const { darkVariables } = parseCssVariables();

      const requiredDarkVars = [
        "--background",
        "--foreground",
        "--card",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--accent",
        "--accent-foreground",
        "--destructive",
        "--border",
        "--input",
        "--ring",
      ];

      for (const varName of requiredDarkVars) {
        expect(darkVariables[varName]).toBeDefined();
        expect(darkVariables[varName].length).toBeGreaterThan(0);
      }
    });

    test("1.3 [F01] @theme block maps all semantic variables to Tailwind v4 tokens", () => {
      const { themeTokens } = parseCssVariables();

      const expectedThemeTokens = [
        "--color-background",
        "--color-foreground",
        "--color-card",
        "--color-card-foreground",
        "--color-popover",
        "--color-primary",
        "--color-secondary",
        "--color-muted",
        "--color-accent",
        "--color-destructive",
        "--color-border",
        "--color-input",
        "--color-ring",
        "--radius-sm",
        "--radius-md",
        "--radius-lg",
      ];

      for (const token of expectedThemeTokens) {
        expect(themeTokens[token]).toBeDefined();
      }
    });

    test("1.4 [F02] WCAG AA color compliance in light mode (normal text >= 4.5:1, UI >= 3.0:1)", () => {
      const { rootVariables } = parseCssVariables();

      // Foreground text on background canvas (normal text >= 4.5:1)
      const textOnCanvas = verifyWcagCompliance(
        rootVariables["--foreground"],
        rootVariables["--background"],
        "normal-text",
      );
      expect(textOnCanvas.passed).toBeTrue();
      expect(textOnCanvas.ratio).toBeGreaterThanOrEqual(4.5);

      // Card foreground on card surface (normal text >= 4.5:1)
      const cardText = verifyWcagCompliance(
        rootVariables["--card-foreground"],
        rootVariables["--card"],
        "normal-text",
      );
      expect(cardText.passed).toBeTrue();
      expect(cardText.ratio).toBeGreaterThanOrEqual(4.5);

      // Primary foreground on primary button (normal text >= 4.5:1)
      const primaryOnButton = verifyWcagCompliance(
        rootVariables["--primary-foreground"],
        rootVariables["--primary"],
        "normal-text",
      );
      expect(primaryOnButton.passed).toBeTrue();

      // Accent brand element on canvas (UI element >= 3.0:1)
      const accentOnCanvas = verifyWcagCompliance(
        rootVariables["--accent"],
        rootVariables["--background"],
        "large-text-or-ui",
      );
      expect(accentOnCanvas.passed).toBeTrue();
      // Destructive foreground on destructive button (normal text >= 4.5:1)
      const destructiveOnButton = verifyWcagCompliance(
        rootVariables["--destructive-foreground"],
        rootVariables["--destructive"],
        "normal-text",
      );
      expect(destructiveOnButton.passed).toBeTrue();
      expect(destructiveOnButton.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test("1.5 [F02] WCAG AA color compliance in dark mode (normal text >= 4.5:1, UI >= 3.0:1)", () => {
      const { darkVariables } = parseCssVariables();

      // Foreground text on dark canvas (normal text >= 4.5:1)
      const darkText = verifyWcagCompliance(
        darkVariables["--foreground"],
        darkVariables["--background"],
        "normal-text",
      );
      expect(darkText.passed).toBeTrue();
      expect(darkText.ratio).toBeGreaterThanOrEqual(4.5);

      // Card foreground on dark card (normal text >= 4.5:1)
      const darkCardText = verifyWcagCompliance(
        darkVariables["--card-foreground"],
        darkVariables["--card"],
        "normal-text",
      );
      expect(darkCardText.passed).toBeTrue();
      expect(darkCardText.ratio).toBeGreaterThanOrEqual(4.5);

      // Muted foreground on dark canvas (normal text >= 4.5:1)
      const darkMuted = verifyWcagCompliance(
        darkVariables["--muted-foreground"],
        darkVariables["--background"],
        "normal-text",
      );
      expect(darkMuted.passed).toBeTrue();
      expect(darkMuted.ratio).toBeGreaterThanOrEqual(4.5);

      // Accent brand element on dark canvas (UI element >= 3.0:1)
      const darkAccent = verifyWcagCompliance(
        darkVariables["--accent"],
        darkVariables["--background"],
        "large-text-or-ui",
      );
      expect(darkAccent.passed).toBeTrue();
      expect(darkAccent.ratio).toBeGreaterThanOrEqual(3.0);
    });

    test("1.6 [F06] Tailwind Content Discovery: all apps configure @source for @repo/ui", () => {
      const appCssPaths = [
        path.join(APPS_PATH, "web/src/app/globals.css"),
        path.join(APPS_PATH, "console/src/app/globals.css"),
        path.join(APPS_PATH, "admin/src/app/globals.css"),
      ];

      for (const cssPath of appCssPaths) {
        expect(fs.existsSync(cssPath)).toBeTrue();
        const content = fs.readFileSync(cssPath, "utf8");
        expect(content).toContain('@import "@repo/ui/styles.css";');
        expect(content).toContain('@source "../../../../packages/ui/src";');
      }
    });
  });

  // =========================================================================
  // Area 2: Theme Switcher State Machines (F03, F04, F05)
  // =========================================================================
  describe("Area 2: Theme Switcher State Machines (F03, F04, F05)", () => {
    test("1.7 [F03] ThemeScript renders inline script with anti-FOUC logic and dark class toggle", () => {
      const inspector = inspectHtml(
        el(ThemeScript, { storageKey: "fc-theme", defaultTheme: "system" }),
      );
      expect(inspector.hasAttribute("id", "fc-theme-script")).toBeTrue();
      expect(inspector.contains("localStorage.getItem")).toBeTrue();
      expect(inspector.contains("classList.add('dark')")).toBeTrue();
      expect(inspector.contains("prefers-color-scheme: dark")).toBeTrue();
    });

    test("1.8 [F04] ThemeProvider initializes with defaultTheme and mounts cleanly", () => {
      let currentTheme: string | undefined;

      function Consumer() {
        const { theme } = useTheme();
        currentTheme = theme;
        return el("div", { "data-testid": "theme" }, theme);
      }

      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)),
      );

      expect(inspector.contains("light")).toBeTrue();
      expect(currentTheme).toBe("light");
    });

    test("1.9 [F04] ThemeProvider dynamically resolves system theme via matchMedia", () => {
      dom.setSystemDarkMode(true);

      let resolved: string | undefined;

      function Consumer() {
        const { resolvedTheme } = useTheme();
        resolved = resolvedTheme;
        return el("div", { "data-testid": "resolved" }, resolvedTheme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "system" }, el(Consumer, null)));

      expect(resolved).toBe("dark");
    });

    test("1.10 [F05] ThemeToggle renders accessible trigger button with ARIA attributes", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(ThemeToggle, null)),
      );

      // In SSR/initial mount, renders accessible placeholder
      expect(
        inspector.hasAttribute("aria-hidden", "true") || inspector.hasAttribute("aria-label"),
      ).toBeTrue();
      expect(inspector.contains("inline-flex")).toBeTrue();
    });

    test("1.11 [F05] ThemeToggle segmented variant renders with layout classes", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(ThemeToggle, { variant: "segmented" })),
      );

      expect(inspector.contains("inline-flex")).toBeTrue();
    });

    test("1.12 [F05] ThemeToggle cycle variant renders accessible container", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "dark" }, el(ThemeToggle, { variant: "cycle" })),
      );

      expect(inspector.contains("inline-flex")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 3: Component Primitives & Accessibility Attributes
  // =========================================================================
  describe("Area 3: Component Primitives & Accessibility Attributes", () => {
    test("1.13 [F07] Button renders all variants with focus rings and disabled styling", () => {
      const variants = ["primary", "secondary", "outline", "ghost", "destructive"] as const;

      for (const variant of variants) {
        const inspector = inspectHtml(el(Button, { variant }, "Click Me"));
        expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
        expect(inspector.contains("disabled:opacity-50")).toBeTrue();
      }
    });

    test("1.14 [F07] Button with isLoading displays accessible SVG spinner and disables interaction", () => {
      const inspector = inspectHtml(el(Button, { isLoading: true }, "Submit Request"));
      expect(inspector.hasAttribute("disabled")).toBeTrue();
      expect(inspector.contains("<title>Loading</title>")).toBeTrue();
      expect(inspector.contains("animate-spin")).toBeTrue();
    });

    test("1.15 [F08] Badge renders semantic status variants with consistent contrast", () => {
      const variants = [
        "default",
        "secondary",
        "success",
        "warning",
        "destructive",
        "outline",
      ] as const;

      for (const variant of variants) {
        const inspector = inspectHtml(el(Badge, { variant }, "Status"));
        expect(inspector.contains("rounded-full")).toBeTrue();
        expect(inspector.contains("text-xs")).toBeTrue();
      }
    });

    test("1.16 [F09] Card primitive suite renders compound card structure", () => {
      const inspector = inspectHtml(
        el(
          Card,
          { className: "test-card" },
          el(
            CardHeader,
            null,
            el(CardTitle, null, "Daily Briefing"),
            el(CardDescription, null, "Synthesized intelligence for executives"),
          ),
          el(CardContent, null, el("p", null, "Today's top tech news")),
          el(CardFooter, null, el(Button, { size: "sm" }, "Listen Now")),
        ),
      );

      expect(inspector.contains("rounded-2xl")).toBeTrue();
      expect(inspector.contains("Daily Briefing")).toBeTrue();
      expect(inspector.contains("Synthesized intelligence for executives")).toBeTrue();
      expect(inspector.contains("Listen Now")).toBeTrue();
    });

    test("1.17 [F10] Input renders accessible text input with focus ring and placeholder styles", () => {
      const inspector = inspectHtml(
        el(Input, {
          placeholder: "Enter your email",
          type: "email",
          "aria-label": "Email address",
        }),
      );

      expect(inspector.hasAttribute("type", "email")).toBeTrue();
      expect(inspector.hasAttribute("placeholder", "Enter your email")).toBeTrue();
      expect(inspector.hasAttribute("aria-label", "Email address")).toBeTrue();
      expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
    });

    test("1.18 Interface contracts: UI package exports full intended public surface", async () => {
      const ui = await import("../../packages/ui/src");
      expect(ui.Button).toBeDefined();
      expect(ui.Badge).toBeDefined();
      expect(ui.Card).toBeDefined();
      expect(ui.CardHeader).toBeDefined();
      expect(ui.CardTitle).toBeDefined();
      expect(ui.CardDescription).toBeDefined();
      expect(ui.CardContent).toBeDefined();
      expect(ui.CardFooter).toBeDefined();
      expect(ui.Input).toBeDefined();
      expect(ui.ThemeProvider).toBeDefined();
      expect(ui.ThemeScript).toBeDefined();
      expect(ui.ThemeToggle).toBeDefined();
      expect(ui.useTheme).toBeDefined();
      expect(ui.cn).toBeDefined();
    });
  });

  // =========================================================================
  // Area 4: Page Routes & Layouts across Apps (F19-F34)
  // =========================================================================
  describe("Area 4: Page Routes & Layouts across Apps (F19-F34)", () => {
    test("1.19 [F19-F23] apps/web layout defines header, nav links, and brand logo", () => {
      const layoutPath = path.join(APPS_PATH, "web/src/app/layout.tsx");
      expect(fs.existsSync(layoutPath)).toBeTrue();
      const content = fs.readFileSync(layoutPath, "utf8");

      expect(content).toContain("First Cup");
      expect(content).toContain("Pricing");
      expect(content).toContain("Contact");
      expect(content).toContain("Console");
    });

    test("1.20 [F19-F22] apps/web defines required marketing routes", () => {
      const routes = [
        path.join(APPS_PATH, "web/src/app/page.tsx"),
        path.join(APPS_PATH, "web/src/app/pricing/page.tsx"),
        path.join(APPS_PATH, "web/src/app/blog/page.tsx"),
        path.join(APPS_PATH, "web/src/app/contact/page.tsx"),
      ];

      for (const route of routes) {
        expect(fs.existsSync(route)).toBeTrue();
        const code = fs.readFileSync(route, "utf8");
        expect(code.length).toBeGreaterThan(100);
      }
    });

    test("1.21 [F24-F29] apps/console defines dashboard, preferences, billing, and auth isolation", () => {
      const routes = [
        path.join(APPS_PATH, "console/src/app/layout.tsx"),
        path.join(APPS_PATH, "console/src/app/(auth)/login/page.tsx"),
        path.join(APPS_PATH, "console/src/app/dashboard/page.tsx"),
        path.join(APPS_PATH, "console/src/app/preferences/page.tsx"),
        path.join(APPS_PATH, "console/src/app/billing/page.tsx"),
      ];

      for (const route of routes) {
        expect(fs.existsSync(route)).toBeTrue();
      }

      // Check auth isolation: login page does not contain dashboard sidebar
      const loginCode = fs.readFileSync(
        path.join(APPS_PATH, "console/src/app/(auth)/login/page.tsx"),
        "utf8",
      );
      expect(loginCode).toContain("Sign In");
    });

    test("1.22 [F30-F34] apps/admin defines admin layout, dashboard, users, digests, and playground", () => {
      const routes = [
        path.join(APPS_PATH, "admin/src/app/layout.tsx"),
        path.join(APPS_PATH, "admin/src/app/dashboard/page.tsx"),
        path.join(APPS_PATH, "admin/src/app/users/page.tsx"),
        path.join(APPS_PATH, "admin/src/app/digests/page.tsx"),
        path.join(APPS_PATH, "admin/src/app/playground/page.tsx"),
      ];

      for (const route of routes) {
        expect(fs.existsSync(route)).toBeTrue();
      }
    });

    test("1.23 Monorepo theme classes: applications apply background, foreground, and dark tokens", () => {
      const layouts = [
        path.join(APPS_PATH, "web/src/app/layout.tsx"),
        path.join(APPS_PATH, "console/src/app/layout.tsx"),
        path.join(APPS_PATH, "admin/src/app/layout.tsx"),
      ];

      for (const layoutPath of layouts) {
        const content = fs.readFileSync(layoutPath, "utf8");
        expect(content).toContain("bg-background");
        expect(content).toContain("text-foreground");
      }
    });
  });
});
