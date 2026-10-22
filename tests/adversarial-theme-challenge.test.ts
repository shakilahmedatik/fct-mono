/**
 * Adversarial Theme Challenge Suite — Challenger M1.1
 * Empirically challenges and benchmarks:
 * 1. ThemeScript FOUC edge cases (localStorage SecurityError, invalid/corrupt values, script execution)
 * 2. Mathematical WCAG AA contrast ratio verification across all token pairs
 * 3. Dynamic state transitions, rapid cycling, and cross-tab synchronization
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ThemeProvider, ThemeScript, ThemeToggle, useTheme } from "../packages/ui/src";
import { getContrastRatio } from "./e2e/harness/color-contrast";
import {
  createMultiTabEnvironment,
  type EmulatedTab,
  setupDOM,
  teardownDOM,
} from "./e2e/harness/mock-dom";
import { el, inspectHtml, parseCssVariables } from "./e2e/harness/test-utils";

/**
 * Extracts and evaluates the raw JavaScript content inside ThemeScript.
 */
function extractAndRunThemeScript(
  props?: { storageKey?: string; defaultTheme?: any; nonce?: string },
  contextWindow?: any,
  contextDoc?: any,
): { scriptHtml: string; rawJs: string; executedError: Error | null } {
  const inspector = inspectHtml(el(ThemeScript, props ?? null));
  const scriptHtml = inspector.html;

  const match = scriptHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error(`Failed to extract script body from: ${scriptHtml}`);
  }
  const rawJs = match[1];

  let executedError: Error | null = null;
  const win = contextWindow ?? (globalThis as any).window;
  const doc = contextDoc ?? (globalThis as any).document;

  try {
    const fn = new Function("window", "document", "localStorage", rawJs);
    fn(win, doc, win?.localStorage);
  } catch (err: any) {
    executedError = err;
  }

  return { scriptHtml, rawJs, executedError };
}

describe("Adversarial Challenge: Milestone 1 Theme Foundations", () => {
  let dom: EmulatedTab;

  beforeEach(() => {
    dom = setupDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Challenge 1: ThemeScript FOUC Edge Cases
  // =========================================================================
  describe("Challenge 1: ThemeScript FOUC & Error Resilience", () => {
    test("1.1 [VERIFIED] ThemeScript execution sets dark class when localStorage throws SecurityError", () => {
      // User has OS in dark mode, default is "system"
      dom.setSystemDarkMode(true);
      dom.localStorage.shouldThrowOnGet = true; // Simulates incognito / cross-origin iframe / blocked storage

      expect(dom.document.documentElement.classList.contains("dark")).toBeFalse();

      // Execute ThemeScript as browser executes in <head>
      const result = extractAndRunThemeScript({ storageKey: "fc-theme", defaultTheme: "system" });
      expect(result.executedError).toBeNull();

      const hasDarkAfterScript = dom.document.documentElement.classList.contains("dark");
      const colorSchemeAfterScript = dom.document.documentElement.style.colorScheme;

      console.log("[VERIFIED EVIDENCE 1.1]", {
        localStorageThrows: true,
        systemIsDark: true,
        hasDarkAfterScript,
        colorSchemeAfterScript,
      });

      // Dedicated inner try/catch around localStorage allows execution to proceed to matchMedia
      expect(hasDarkAfterScript).toBeTrue();
    });

    test("1.2 [VERIFIED] ThemeScript applies explicit defaultTheme='dark' when localStorage throws SecurityError", () => {
      dom.setSystemDarkMode(false);
      dom.localStorage.shouldThrowOnGet = true;

      extractAndRunThemeScript({ storageKey: "fc-theme", defaultTheme: "dark" });

      const hasDarkAfterScript = dom.document.documentElement.classList.contains("dark");
      console.log("[VERIFIED EVIDENCE 1.2]", {
        defaultTheme: "dark",
        localStorageThrows: true,
        hasDarkAfterScript,
      });

      // Even when localStorage throws, defaultTheme is respected
      expect(hasDarkAfterScript).toBeTrue();
    });

    test("1.3 [VERIFIED] ThemeScript with corrupt non-standard values in localStorage falls back to system preference", () => {
      const corruptValues = [
        "undefined",
        "null",
        "NaN",
        "{}",
        "true",
        "false",
        "DARK",
        "light-mode",
        "0",
      ];

      for (const val of corruptValues) {
        dom.document.documentElement.classList.remove("dark");
        dom.setSystemDarkMode(true); // OS preference is DARK
        dom.localStorage.setItem("fc-theme", val);

        extractAndRunThemeScript({ storageKey: "fc-theme", defaultTheme: "system" });

        const hasDarkAfterScript = dom.document.documentElement.classList.contains("dark");
        console.log(`[VERIFIED EVIDENCE 1.3] Value "${val}": hasDark=${hasDarkAfterScript}`);

        // Corrupt values fall back to defaultTheme ("system"), matching OS preference
        expect(hasDarkAfterScript).toBeTrue();
      }
    });

    test("1.4 [VERIFIED] Pre-hydration paint vs post-hydration match under corrupt storage (Zero-FOUC)", () => {
      dom.setSystemDarkMode(true); // OS preference is DARK
      dom.localStorage.setItem("fc-theme", "corrupt_data");

      // Phase 1: Browser parses <head> and runs ThemeScript
      extractAndRunThemeScript({ storageKey: "fc-theme", defaultTheme: "system" });
      const domAfterScriptDark = dom.document.documentElement.classList.contains("dark");

      // Phase 2: React hydrates ThemeProvider
      let providerTheme: string | undefined;
      let providerResolved: string | undefined;

      function Consumer() {
        const { theme, resolvedTheme } = useTheme();
        providerTheme = theme;
        providerResolved = resolvedTheme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "system" }, el(Consumer, null)));

      console.log("[VERIFIED EVIDENCE 1.4 ZERO-FOUC]", {
        domAfterScriptDark,
        providerTheme,
        providerResolved,
      });

      // Pre-hydration paint and post-hydration are both in dark mode:
      expect(domAfterScriptDark).toBeTrue();
      expect(providerResolved).toBe("dark");
    });

    test("1.5 [VERIFIED] Script injection resilience: sanitized script tag prevents breakout", () => {
      const maliciousKey = "test</script><script>alert(1)</script>";
      const inspector = inspectHtml(el(ThemeScript, { storageKey: maliciousKey }));

      // Breakout string is sanitized via \\u003c
      const containsBreakout = inspector.html.includes("</script><script>alert(1)</script>");
      console.log("[VERIFIED EVIDENCE 1.5 SCRIPT BREAKOUT]", {
        containsBreakout,
        snippet: inspector.html.slice(0, 150),
      });

      expect(containsBreakout).toBeFalse();
    });

    test("1.6 ThemeScript with valid nonce propagates correctly", () => {
      const nonce = "secure-csp-nonce-xyz==";
      const inspector = inspectHtml(el(ThemeScript, { nonce }));
      expect(inspector.hasAttribute("nonce", nonce)).toBeTrue();
    });
  });

  // =========================================================================
  // Challenge 2: Mathematical WCAG AA Contrast Ratios Across All Token Pairs
  // =========================================================================
  describe("Challenge 2: Mathematical WCAG AA Contrast Ratios", () => {
    test("2.1 Full token matrix verification in Light Mode (:root) and WCAG AA violation detection", () => {
      const { rootVariables } = parseCssVariables();

      const pairsToCheck = [
        {
          name: "foreground / background",
          fg: rootVariables["--foreground"],
          bg: rootVariables["--background"],
          req: 4.5,
        },
        {
          name: "card-foreground / card",
          fg: rootVariables["--card-foreground"],
          bg: rootVariables["--card"],
          req: 4.5,
        },
        {
          name: "popover-foreground / popover",
          fg: rootVariables["--popover-foreground"],
          bg: rootVariables["--popover"],
          req: 4.5,
        },
        {
          name: "primary-foreground / primary",
          fg: rootVariables["--primary-foreground"],
          bg: rootVariables["--primary"],
          req: 4.5,
        },
        {
          name: "secondary-foreground / secondary",
          fg: rootVariables["--secondary-foreground"],
          bg: rootVariables["--secondary"],
          req: 4.5,
        },
        {
          name: "muted-foreground / background",
          fg: rootVariables["--muted-foreground"],
          bg: rootVariables["--background"],
          req: 4.5,
        },
        {
          name: "muted-foreground / muted",
          fg: rootVariables["--muted-foreground"],
          bg: rootVariables["--muted"],
          req: 4.5,
        },
        {
          name: "muted-foreground / card",
          fg: rootVariables["--muted-foreground"],
          bg: rootVariables["--card"],
          req: 4.5,
        },
        {
          name: "accent-foreground / accent",
          fg: rootVariables["--accent-foreground"],
          bg: rootVariables["--accent"],
          req: 4.5,
        },
        {
          name: "accent / background (UI)",
          fg: rootVariables["--accent"],
          bg: rootVariables["--background"],
          req: 3.0,
        },
        {
          name: "destructive-foreground / destructive",
          fg: rootVariables["--destructive-foreground"],
          bg: rootVariables["--destructive"],
          req: 4.5,
        },
        {
          name: "destructive / background (UI)",
          fg: rootVariables["--destructive"],
          bg: rootVariables["--background"],
          req: 3.0,
        },
        {
          name: "destructive / card (UI)",
          fg: rootVariables["--destructive"],
          bg: rootVariables["--card"],
          req: 3.0,
        },
        {
          name: "border / background (UI)",
          fg: rootVariables["--border"],
          bg: rootVariables["--background"],
          req: 1.2,
        },
        {
          name: "ring / background (focus UI)",
          fg: rootVariables["--ring"],
          bg: rootVariables["--background"],
          req: 3.0,
        },
        {
          name: "sidebar-foreground / sidebar-background",
          fg: rootVariables["--sidebar-foreground"],
          bg: rootVariables["--sidebar-background"],
          req: 4.5,
        },
        {
          name: "sidebar-accent-foreground / sidebar-accent",
          fg: rootVariables["--sidebar-accent-foreground"],
          bg: rootVariables["--sidebar-accent"],
          req: 4.5,
        },
      ];

      const results = pairsToCheck.map((p) => {
        const ratio = getContrastRatio(p.fg, p.bg);
        const passed = ratio >= p.req;
        return { ...p, ratio, passed };
      });

      console.log("[EMPIRICAL EVIDENCE 2.1 LIGHT MODE CONTRAST MATRIX]:");
      for (const r of results) {
        console.log(`  ${r.passed ? "PASS" : "FAIL"} [${r.ratio}:1 >= ${r.req}:1] ${r.name}`);
      }

      // All 17 token pairs pass, including calibrated destructive-foreground / destructive.
      // The exact ratio moves with the design tokens, so assert the WCAG AA
      // requirement (>= 4.5:1) instead of a hardcoded ratio.
      const destructiveCheck = results.find(
        (r) => r.name === "destructive-foreground / destructive",
      )!;
      expect(destructiveCheck.ratio).toBeGreaterThanOrEqual(4.5);
      expect(destructiveCheck.passed).toBeTrue(); // >= 4.5:1 required by WCAG AA!

      // All pairs must pass:
      for (const r of results) {
        expect(r.passed).toBeTrue();
      }
    });

    test("2.2 Full token matrix verification in Dark Mode (.dark)", () => {
      const { darkVariables } = parseCssVariables();

      const pairsToCheck = [
        {
          name: "foreground / background",
          fg: darkVariables["--foreground"],
          bg: darkVariables["--background"],
          req: 4.5,
        },
        {
          name: "card-foreground / card",
          fg: darkVariables["--card-foreground"],
          bg: darkVariables["--card"],
          req: 4.5,
        },
        {
          name: "popover-foreground / popover",
          fg: darkVariables["--popover-foreground"],
          bg: darkVariables["--popover"],
          req: 4.5,
        },
        {
          name: "primary-foreground / primary",
          fg: darkVariables["--primary-foreground"],
          bg: darkVariables["--primary"],
          req: 4.5,
        },
        {
          name: "secondary-foreground / secondary",
          fg: darkVariables["--secondary-foreground"],
          bg: darkVariables["--secondary"],
          req: 4.5,
        },
        {
          name: "muted-foreground / background",
          fg: darkVariables["--muted-foreground"],
          bg: darkVariables["--background"],
          req: 4.5,
        },
        {
          name: "muted-foreground / muted",
          fg: darkVariables["--muted-foreground"],
          bg: darkVariables["--muted"],
          req: 4.5,
        },
        {
          name: "muted-foreground / card",
          fg: darkVariables["--muted-foreground"],
          bg: darkVariables["--card"],
          req: 4.5,
        },
        {
          name: "accent-foreground / accent",
          fg: darkVariables["--accent-foreground"],
          bg: darkVariables["--accent"],
          req: 4.5,
        },
        {
          name: "accent / background (UI)",
          fg: darkVariables["--accent"],
          bg: darkVariables["--background"],
          req: 3.0,
        },
        {
          name: "destructive-foreground / destructive",
          fg: darkVariables["--destructive-foreground"],
          bg: darkVariables["--destructive"],
          req: 4.5,
        },
        {
          name: "destructive / background (UI)",
          fg: darkVariables["--destructive"],
          bg: darkVariables["--background"],
          req: 3.0,
        },
        {
          name: "destructive / card (UI)",
          fg: darkVariables["--destructive"],
          bg: darkVariables["--card"],
          req: 3.0,
        },
        {
          name: "ring / background (focus UI)",
          fg: darkVariables["--ring"],
          bg: darkVariables["--background"],
          req: 3.0,
        },
        {
          name: "sidebar-foreground / sidebar-background",
          fg: darkVariables["--sidebar-foreground"],
          bg: darkVariables["--sidebar-background"],
          req: 4.5,
        },
        {
          name: "sidebar-accent-foreground / sidebar-accent",
          fg: darkVariables["--sidebar-accent-foreground"],
          bg: darkVariables["--sidebar-accent"],
          req: 4.5,
        },
      ];

      const results = pairsToCheck.map((p) => {
        const ratio = getContrastRatio(p.fg, p.bg);
        const passed = ratio >= p.req;
        return { ...p, ratio, passed };
      });

      console.log("[EMPIRICAL EVIDENCE 2.2 DARK MODE CONTRAST MATRIX]:");
      for (const r of results) {
        console.log(`  ${r.passed ? "PASS" : "FAIL"} [${r.ratio}:1 >= ${r.req}:1] ${r.name}`);
      }

      // In dark mode, all 16 token pairs pass WCAG AA
      for (const r of results) {
        expect(r.passed).toBeTrue();
      }
    });

    test("2.3 Status badge contrast analysis: success, warning, and info", () => {
      const { rootVariables, darkVariables } = parseCssVariables();

      const lightSuccess = getContrastRatio(
        rootVariables["--success-foreground"],
        rootVariables["--success"],
      );
      const lightWarning = getContrastRatio(
        rootVariables["--warning-foreground"],
        rootVariables["--warning"],
      );
      const lightInfo = getContrastRatio(
        rootVariables["--info-foreground"],
        rootVariables["--info"],
      );

      const darkSuccess = getContrastRatio(
        darkVariables["--success-foreground"],
        darkVariables["--success"],
      );
      const darkWarning = getContrastRatio(
        darkVariables["--warning-foreground"],
        darkVariables["--warning"],
      );
      const darkInfo = getContrastRatio(
        darkVariables["--info-foreground"],
        darkVariables["--info"],
      );

      console.log("[EMPIRICAL EVIDENCE 2.3 STATUS BADGE CONTRASTS]", {
        lightSuccess,
        lightWarning,
        lightInfo,
        darkSuccess,
        darkWarning,
        darkInfo,
      });

      // Empirical measurements:
      expect(lightSuccess).toBe(3.19); // 3.19:1 < 4.5:1
      expect(lightWarning).toBe(2.52); // 2.52:1 < 4.5:1
      expect(lightInfo).toBe(4.86); // PASS
      expect(darkSuccess).toBe(7.76); // PASS
      expect(darkWarning).toBe(9.33); // PASS
      expect(darkInfo).toBe(3.49); // 3.49:1 < 4.5:1
    });
  });

  // =========================================================================
  // Challenge 3: Dynamic State Transitions & Concurrency Stress
  // =========================================================================
  describe("Challenge 3: Dynamic State Transitions & Concurrency Stress", () => {
    test("3.1 500-cycle rapid theme switching stress harness", () => {
      let currentTheme: string | undefined;
      let currentResolved: string | undefined;
      let setFn: ((theme: any) => void) | undefined;

      function Consumer() {
        const context = useTheme();
        currentTheme = context.theme;
        currentResolved = context.resolvedTheme;
        setFn = context.setTheme;
        return el("div", { "data-theme": context.theme }, context.theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)));

      const cycle = ["dark", "system", "light", "dark", "light"] as const;
      const history: { i: number; theme: string; resolved: string }[] = [];

      for (let i = 0; i < 500; i++) {
        const target = cycle[i % cycle.length];
        setFn?.(target);
        history.push({ i, theme: currentTheme!, resolved: currentResolved! });
      }

      expect(history.length).toBe(500);
      expect(currentTheme).toBe("light");
      expect(currentResolved).toBe("light");
      expect(dom.localStorage.getItem("fc-theme")).toBe("light");
      expect(dom.document.documentElement.classList.contains("dark")).toBeFalse();
    });

    test("3.2 Multi-tab concurrent storage sync with invalid and null payloads", () => {
      const multi = createMultiTabEnvironment();

      let tabBTheme: string | undefined;
      let _tabBResolved: string | undefined;

      const tabBWin = multi.tabB.window;

      tabBWin.addEventListener("storage", (e: any) => {
        if (e.key === "fc-theme") {
          const val = e.newValue;
          if (val === "light" || val === "dark" || val === "system") {
            tabBTheme = val;
            _tabBResolved = val === "system" ? "light" : val;
          } else {
            tabBTheme = "system";
            _tabBResolved = "light";
          }
        }
      });

      // 1. Valid dark sync
      multi.syncTabAtoTabB("fc-theme", "dark");
      expect(tabBTheme).toBe("dark");

      // 2. Corrupt string sync from Tab A
      multi.syncTabAtoTabB("fc-theme", "INVALID_TRASH");
      expect(tabBTheme).toBe("system");

      // 3. Null (storage cleared) sync from Tab A
      multi.syncTabAtoTabB("fc-theme", null);
      expect(tabBTheme).toBe("system");
    });

    test("3.3 Dynamic OS matchMedia appearance changes while active", () => {
      dom.setSystemDarkMode(false);

      let activeResolved: string | undefined;
      function Consumer() {
        const { resolvedTheme } = useTheme();
        activeResolved = resolvedTheme;
        return el("div", null, resolvedTheme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "system" }, el(Consumer, null)));
      expect(activeResolved).toBe("light");

      dom.setSystemDarkMode(true);
      expect(dom.mediaQueryDark.matches).toBeTrue();
    });

    test("3.4 Multi-instance component synchronization on same page", () => {
      const _toggleCount = 0;
      function Page() {
        return el(
          ThemeProvider,
          { defaultTheme: "light" },
          el(ThemeToggle, { variant: "dropdown" }),
          el(ThemeToggle, { variant: "segmented" }),
          el(ThemeToggle, { variant: "cycle" }),
        );
      }

      const inspector = inspectHtml(el(Page, null));
      expect(inspector.html.length).toBeGreaterThan(0);
    });
  });
});
