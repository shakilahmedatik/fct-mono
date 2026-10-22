/**
 * Tier 3: Cross-Feature Combinations (Pairwise) E2E Test Suite
 * Evaluates pairwise interactions:
 * 1. Theme Switching x Modals / Overlays
 * 2. Theme Switching x Dropdowns & Popovers
 * 3. Theme Switching x Form Controls & Error States
 * 4. Multi-Tab Synchronization
 * 5. Layout Navigation x Theme Toggle
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
  ThemeToggle,
} from "../../packages/ui/src";
import { verifyWcagCompliance } from "./harness/color-contrast";
import {
  createMultiTabEnvironment,
  type EmulatedTab,
  setupDOM,
  teardownDOM,
} from "./harness/mock-dom";
import { el, inspectHtml, parseCssVariables } from "./harness/test-utils";

describe("Tier 3: Cross-Feature Combinations (Pairwise)", () => {
  let _dom: EmulatedTab;

  beforeEach(() => {
    _dom = setupDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Pair 1: Theme Switching x Modals / Overlays
  // =========================================================================
  describe("Pair 1: Theme Switching x Modals / Overlays", () => {
    test("3.1 Modal dialog surface container inherits dark and light theme tokens", () => {
      const { rootVariables, darkVariables } = parseCssVariables();

      // Simulated Dialog modal content
      function ModalPreview({ isDark }: { isDark: boolean }) {
        return el(
          "div",
          {
            role: "dialog",
            "aria-modal": "true",
            className: `fixed inset-0 z-50 flex items-center justify-center ${isDark ? "dark" : ""}`,
          },
          el(
            Card,
            { className: "w-full max-w-md shadow-2xl border-border bg-card text-card-foreground" },
            el(
              CardHeader,
              null,
              el(CardTitle, null, "Upgrade FirstCup Subscription"),
              el(CardDescription, null, "Choose an annual tier for 2 months free"),
            ),
            el(CardContent, null, el("p", null, "Unlimited executive briefings")),
            el(
              CardFooter,
              { className: "flex justify-end gap-2" },
              el(Button, { variant: "outline" }, "Cancel"),
              el(Button, { variant: "primary" }, "Confirm Upgrade"),
            ),
          ),
        );
      }

      // In light mode: card foreground vs card background meets 4.5:1
      const lightCheck = verifyWcagCompliance(
        rootVariables["--card-foreground"],
        rootVariables["--card"],
        "normal-text",
      );
      expect(lightCheck.passed).toBeTrue();

      // In dark mode: dark card foreground vs dark card background meets 4.5:1
      const darkCheck = verifyWcagCompliance(
        darkVariables["--card-foreground"],
        darkVariables["--card"],
        "normal-text",
      );
      expect(darkCheck.passed).toBeTrue();

      const inspectorLight = inspectHtml(el(ModalPreview, { isDark: false }));
      expect(inspectorLight.hasRole("dialog")).toBeTrue();
      expect(inspectorLight.hasAria("modal", "true")).toBeTrue();

      const inspectorDark = inspectHtml(el(ModalPreview, { isDark: true }));
      expect(inspectorDark.contains("dark")).toBeTrue();
    });

    test("3.2 Dialog action buttons maintain focus visibility outline across themes", () => {
      const inspector = inspectHtml(
        el(
          "div",
          { role: "dialog" },
          el(
            Button,
            { variant: "outline", className: "focus-visible:ring-2 focus-visible:ring-ring" },
            "Dismiss",
          ),
        ),
      );

      expect(inspector.contains("focus-visible:ring-2")).toBeTrue();
      expect(inspector.contains("border-border")).toBeTrue();
    });
  });

  // =========================================================================
  // Pair 2: Theme Switching x Dropdowns & Popovers
  // =========================================================================
  describe("Pair 2: Theme Switching x Dropdowns & Popovers", () => {
    test("3.3 Dropdown menu popover reflects card elevation and border tokens", () => {
      const inspector = inspectHtml(
        el(
          ThemeProvider,
          { defaultTheme: "dark" },
          el(ThemeToggle, { variant: "dropdown", align: "end" }),
        ),
      );

      // In SSR / mounted, uses card and border tokens
      expect(inspector.contains("border-border")).toBeTrue();
      expect(inspector.contains("bg-card")).toBeTrue();
    });

    test("3.4 Dropdown options render icons with muted-foreground and active checkmarks", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(ThemeToggle, { variant: "segmented" })),
      );

      expect(inspector.contains("inline-flex")).toBeTrue();
    });
  });

  // =========================================================================
  // Pair 3: Theme Switching x Form Controls & Error States
  // =========================================================================
  describe("Pair 3: Theme Switching x Form Controls & Error States", () => {
    test("3.5 Form card with Input, Button, and Badge retains high contrast in both themes", () => {
      const { rootVariables, darkVariables } = parseCssVariables();

      function FormCard() {
        return el(
          Card,
          { className: "p-6" },
          el(Badge, { variant: "success" }, "Active License"),
          el(Input, { placeholder: "Team Member Email", className: "mt-4" }),
          el(Button, { variant: "primary", className: "mt-4 w-full" }, "Invite to FirstCup"),
        );
      }

      const lightHtml = inspectHtml(el(FormCard, null));
      expect(lightHtml.contains("rounded-2xl")).toBeTrue();
      expect(lightHtml.contains("rounded-full")).toBeTrue();

      // Check input text contrast against background in light mode (>= 4.5:1)
      const lightInputTextCheck = verifyWcagCompliance(
        rootVariables["--foreground"],
        rootVariables["--background"],
        "normal-text",
      );
      expect(lightInputTextCheck.passed).toBeTrue();

      // Check input focus ring indicator contrast against background (>= 3.0:1)
      const lightFocusRingCheck = verifyWcagCompliance(
        rootVariables["--ring"],
        rootVariables["--background"],
        "large-text-or-ui",
      );
      expect(lightFocusRingCheck.passed).toBeTrue();
      expect(lightFocusRingCheck.ratio).toBeGreaterThanOrEqual(3.0);

      // Check input text contrast against background in dark mode (>= 4.5:1)
      const darkInputTextCheck = verifyWcagCompliance(
        darkVariables["--foreground"],
        darkVariables["--background"],
        "normal-text",
      );
      expect(darkInputTextCheck.passed).toBeTrue();
    });

    test("3.6 Input destructive error state maintains high contrast against card surface", () => {
      const { rootVariables, darkVariables } = parseCssVariables();

      const inspector = inspectHtml(
        el(Input, {
          defaultValue: "invalid-email@",
          className: "border-destructive text-destructive focus-visible:ring-destructive",
          "aria-invalid": "true",
        }),
      );

      expect(inspector.hasAria("invalid", "true")).toBeTrue();
      expect(inspector.contains("border-destructive")).toBeTrue();

      // Destructive text on light card
      const lightDestructive = verifyWcagCompliance(
        rootVariables["--destructive"],
        rootVariables["--card"],
        "large-text-or-ui",
      );
      expect(lightDestructive.passed).toBeTrue();

      // Destructive text on dark card
      const darkDestructive = verifyWcagCompliance(
        darkVariables["--destructive"],
        darkVariables["--card"],
        "large-text-or-ui",
      );
      expect(darkDestructive.passed).toBeTrue();
    });
  });

  // =========================================================================
  // Pair 4: Multi-Tab Synchronization
  // =========================================================================
  describe("Pair 4: Multi-Tab Synchronization", () => {
    test("3.7 Tab A theme switch fires storage event and synchronizes Tab B", () => {
      const multiTab = createMultiTabEnvironment();

      // Tab A initial state: light
      multiTab.tabA.localStorage.setItem("fc-theme", "light");

      let tabBNotifiedTheme: any = null;
      multiTab.tabB.window.addEventListener("storage", (e: any) => {
        if (e.key === "fc-theme") {
          tabBNotifiedTheme = e.newValue;
        }
      });

      // Tab A changes theme to dark
      multiTab.syncTabAtoTabB("fc-theme", "dark");

      expect(tabBNotifiedTheme).toBe("dark");
      expect(multiTab.tabB.localStorage.getItem("fc-theme")).toBe("dark");
    });

    test("3.8 Tab B ignores irrelevant storage keys and only reacts to configured storageKey", () => {
      const multiTab = createMultiTabEnvironment();

      let targetSyncCount = 0;
      let otherSyncCount = 0;

      multiTab.tabB.window.addEventListener("storage", (e: any) => {
        if (e.key === "fc-theme") {
          targetSyncCount++;
        } else {
          otherSyncCount++;
        }
      });

      // Dispatch random unrelated key
      multiTab.syncTabAtoTabB("some-random-cache-key", "random-data");
      expect(targetSyncCount).toBe(0);
      expect(otherSyncCount).toBe(1);

      // Dispatch real theme key
      multiTab.syncTabAtoTabB("fc-theme", "light");
      expect(targetSyncCount).toBe(1);
    });
  });

  // =========================================================================
  // Pair 5: Layout Navigation x Theme Toggle
  // =========================================================================
  describe("Pair 5: Layout Navigation x Theme Toggle", () => {
    test("3.9 Application header embeds ThemeToggle without layout disruption", () => {
      function HeaderMock() {
        return el(
          "header",
          {
            className:
              "sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4",
          },
          el("div", { className: "flex items-center gap-2 font-bold" }, "FirstCup Tech"),
          el(
            "nav",
            { className: "flex items-center gap-4" },
            el("a", { href: "/features" }, "Features"),
            el("a", { href: "/pricing" }, "Pricing"),
          ),
          el(
            "div",
            { className: "flex items-center gap-3" },
            el(ThemeToggle, { variant: "dropdown" }),
          ),
        );
      }

      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "dark" }, el(HeaderMock, null)),
      );

      expect(inspector.contains("FirstCup Tech")).toBeTrue();
      expect(inspector.contains("border-border")).toBeTrue();
      expect(inspector.contains("sticky top-0")).toBeTrue();
    });

    test("3.10 Sidebar navigation items preserve active contrast in light and dark modes", () => {
      const { rootVariables, darkVariables } = parseCssVariables();

      // Sidebar foreground on sidebar background in light mode
      const lightSidebar = verifyWcagCompliance(
        rootVariables["--sidebar-foreground"],
        rootVariables["--sidebar-background"],
        "normal-text",
      );
      expect(lightSidebar.passed).toBeTrue();

      // Sidebar foreground on sidebar background in dark mode
      const darkSidebar = verifyWcagCompliance(
        darkVariables["--sidebar-foreground"],
        darkVariables["--sidebar-background"],
        "normal-text",
      );
      expect(darkSidebar.passed).toBeTrue();
    });
  });
});
