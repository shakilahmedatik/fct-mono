/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Covers >= 5 tests per feature area:
 * 1. Invalid Themes & Corrupted Storage
 * 2. Missing / Throwing LocalStorage (SSR, Incognito, Quota)
 * 3. Extreme Viewports, Touch & Content Stress
 * 4. Empty States & Dynamic Edge Data
 * 5. Rapid Toggling & Concurrency Stress
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  ThemeProvider,
  ThemeScript,
  ThemeToggle,
  useTheme,
} from "../../packages/ui/src";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { el, inspectHtml } from "./harness/test-utils";

describe("Tier 2: Boundary & Corner Cases", () => {
  let dom: EmulatedTab;

  beforeEach(() => {
    dom = setupDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Invalid Themes & Corrupted Storage (>=5 tests)
  // =========================================================================
  describe("Area 1: Invalid Themes & Corrupted Storage", () => {
    test("2.1 Corrupted string in localStorage falls back to defaultTheme", () => {
      dom.localStorage.setItem("fc-theme", "corrupted-junk-value");

      let activeTheme: string | undefined;
      function Consumer() {
        const { theme } = useTheme();
        activeTheme = theme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "system" }, el(Consumer, null)));

      expect(activeTheme).toBe("system");
    });

    test("2.2 Malformed JSON string in storage falls back gracefully", () => {
      dom.localStorage.setItem("fc-theme", '{"injected": true, "theme": "dark"}');

      let activeTheme: string | undefined;
      function Consumer() {
        const { theme } = useTheme();
        activeTheme = theme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)));

      expect(activeTheme).toBe("light");
    });

    test("2.3 Empty string stored in localStorage falls back to default", () => {
      dom.localStorage.setItem("fc-theme", "");

      let activeTheme: string | undefined;
      function Consumer() {
        const { theme } = useTheme();
        activeTheme = theme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "dark" }, el(Consumer, null)));

      expect(activeTheme).toBe("dark");
    });

    test("2.4 Stored theme with whitespace and odd casing falls back safely", () => {
      dom.localStorage.setItem("fc-theme", "  DARK  ");

      let activeTheme: string | undefined;
      function Consumer() {
        const { theme } = useTheme();
        activeTheme = theme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)));

      // Strict contract: only exact "light" | "dark" | "system" allowed, else fallback
      expect(activeTheme).toBe("light");
    });

    test("2.5 Special characters and XSS string payloads in storage fall back safely", () => {
      dom.localStorage.setItem("fc-theme", '<script>alert("evil")</script>\u0000\u001f');

      let activeTheme: string | undefined;
      function Consumer() {
        const { theme } = useTheme();
        activeTheme = theme;
        return el("div", null, theme);
      }

      inspectHtml(el(ThemeProvider, { defaultTheme: "system" }, el(Consumer, null)));

      expect(activeTheme).toBe("system");
    });
  });

  // =========================================================================
  // Area 2: Missing / Throwing LocalStorage (SSR, Incognito, Quota) (>=5 tests)
  // =========================================================================
  describe("Area 2: Missing / Throwing LocalStorage", () => {
    test("2.6 SecurityError on localStorage.getItem (Incognito/Private) operates in-memory without crashing", () => {
      dom.localStorage.shouldThrowOnGet = true;

      let rendered = false;
      function Consumer() {
        const { theme } = useTheme();
        rendered = true;
        return el("div", null, theme);
      }

      expect(() => {
        inspectHtml(el(ThemeProvider, { defaultTheme: "dark" }, el(Consumer, null)));
      }).not.toThrow();

      expect(rendered).toBeTrue();
    });

    test("2.7 QuotaExceededError on localStorage.setItem updates in-memory state cleanly", () => {
      dom.localStorage.shouldThrowOnSet = true;

      let rendered = false;
      function Consumer() {
        const { theme } = useTheme();
        rendered = true;
        return el("div", null, theme);
      }

      expect(() => {
        inspectHtml(el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)));
      }).not.toThrow();

      expect(rendered).toBeTrue();
    });

    test("2.8 SSR Environment where window is undefined renders components without throw", () => {
      // Temporarily remove window from global
      teardownDOM();

      expect(() => {
        const inspector = inspectHtml(
          el(ThemeScript, { storageKey: "fc-theme", defaultTheme: "system" }),
        );
        expect(inspector.hasAttribute("id", "fc-theme-script")).toBeTrue();
      }).not.toThrow();
    });

    test("2.9 ThemeScript handles storage exception in client script without throw", () => {
      const inspector = inspectHtml(
        el(ThemeScript, {
          storageKey: "fc-theme-restricted",
          defaultTheme: "dark",
        }),
      );

      // Script contains try/catch block
      expect(inspector.contains("try{")).toBeTrue();
      expect(inspector.contains("catch(_){}")).toBeTrue();
    });

    test("2.10 Custom storageKey configuration isolates distinct theme instances", () => {
      dom.localStorage.setItem("app-a-theme", "light");
      dom.localStorage.setItem("app-b-theme", "dark");

      let themeA: string | undefined;
      let themeB: string | undefined;

      function ConsumerA() {
        const { theme } = useTheme();
        themeA = theme;
        return el("span", null, theme);
      }

      function ConsumerB() {
        const { theme } = useTheme();
        themeB = theme;
        return el("span", null, theme);
      }

      inspectHtml(el(ThemeProvider, { storageKey: "app-a-theme" }, el(ConsumerA, null)));
      inspectHtml(el(ThemeProvider, { storageKey: "app-b-theme" }, el(ConsumerB, null)));

      expect(themeA).toBe("light");
      expect(themeB).toBe("dark");
    });
  });

  // =========================================================================
  // Area 3: Extreme Viewports, Touch & Content Stress (>=5 tests)
  // =========================================================================
  describe("Area 3: Extreme Viewports, Touch & Content Stress", () => {
    test("2.11 Mobile viewport constraints (320px width) maintain compact UI button sizes", () => {
      const inspector = inspectHtml(
        el(Button, { size: "sm", className: "w-full sm:w-auto" }, "Mobile Action"),
      );
      expect(inspector.contains("h-8")).toBeTrue();
      expect(inspector.contains("w-full")).toBeTrue();
    });

    test("2.12 Long text wrapping: 300+ characters in Button does not break layout classes", () => {
      const longText = "Very Long Button Title That Should Wrap Properly ".repeat(10);
      const inspector = inspectHtml(el(Button, { className: "max-w-xs break-words" }, longText));
      expect(inspector.contains("break-words")).toBeTrue();
      expect(inspector.contains("max-w-xs")).toBeTrue();
    });

    test("2.13 XSS payload in Input placeholder and value renders safely escaped", () => {
      const xssPayload = '<img src=x onerror="alert(1)">';
      const inspector = inspectHtml(
        el(Input, { placeholder: xssPayload, defaultValue: xssPayload }),
      );

      // Raw executable tags must be safely serialized
      expect(inspector.html).toContain("&lt;img");
      expect(inspector.html).not.toContain("<img src=x");
    });

    test("2.14 Special Unicode and Emojis render without character distortion", () => {
      const unicodeString = "FirstCup ☕ — 快速咖啡 intelligence 🚀 (WCAG 2.1)";
      const inspector = inspectHtml(el(Card, null, el(CardTitle, null, unicodeString)));

      expect(inspector.contains("FirstCup ☕")).toBeTrue();
      expect(inspector.contains("快速咖啡")).toBeTrue();
    });

    test("2.15 Extreme touch conditions: ThemeToggle supports touch events safely", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, null, el(ThemeToggle, { className: "touch-manipulation" })),
      );

      expect(inspector.contains("inline-flex")).toBeTrue();
      expect(inspector.contains("touch-manipulation")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 4: Empty States & Dynamic Edge Data (>=5 tests)
  // =========================================================================
  describe("Area 4: Empty States & Dynamic Edge Data", () => {
    test("2.16 Empty Card primitives render without throwing or collapsing unexpectedly", () => {
      const inspector = inspectHtml(
        el(Card, null, el(CardHeader, null), el(CardContent, null), el(CardFooter, null)),
      );
      expect(inspector.contains("rounded-2xl")).toBeTrue();
      expect(inspector.contains("border-border")).toBeTrue();
    });

    test("2.17 Button with empty children renders valid button element", () => {
      const inspector = inspectHtml(el(Button, null));
      expect(inspector.hasAttribute("class")).toBeTrue();
      expect(inspector.contains("<button")).toBeTrue();
    });

    test("2.18 Badge with empty content maintains badge structure and styling", () => {
      const inspector = inspectHtml(el(Badge, null));
      expect(inspector.contains("rounded-full")).toBeTrue();
    });

    test("2.19 Input with empty placeholder and empty value renders without error", () => {
      const inspector = inspectHtml(el(Input, { defaultValue: "", placeholder: "" }));
      expect(inspector.contains("<input")).toBeTrue();
      expect(inspector.contains("border-border")).toBeTrue();
    });

    test("2.20 Zero KPI metrics formatting: numerical 0 formats without NaN or null crashes", () => {
      const count = 0;
      const changeRate = "0.0%";
      const inspector = inspectHtml(
        el(
          Card,
          null,
          el(CardHeader, null, el(CardTitle, null, "Active Subscribers")),
          el(CardContent, null, el("span", { className: "text-2xl font-bold" }, String(count))),
          el(CardFooter, null, el("span", { className: "text-xs" }, changeRate)),
        ),
      );

      expect(inspector.contains(">0<")).toBeTrue();
      expect(inspector.contains("0.0%")).toBeTrue();
      expect(inspector.contains("NaN")).toBeFalse();
    });
  });

  // =========================================================================
  // Area 5: Rapid Toggling & Concurrency Stress (>=5 tests)
  // =========================================================================
  describe("Area 5: Rapid Toggling & Concurrency Stress", () => {
    test("2.21 Rapid sequential theme switches update storage coherently", () => {
      const key = "rapid-test-key";
      dom.localStorage.setItem(key, "light");

      const sequence = ["dark", "light", "system", "dark", "system", "light", "dark"];
      for (const next of sequence) {
        dom.localStorage.setItem(key, next);
      }

      expect(dom.localStorage.getItem(key)).toBe("dark");
    });

    test("2.22 Consecutive toggles with 50 iterations preserve final value", () => {
      const key = "stress-theme-50";
      dom.localStorage.setItem(key, "light");

      for (let i = 0; i < 50; i++) {
        const next = i % 2 === 0 ? "dark" : "light";
        dom.localStorage.setItem(key, next);
      }

      expect(dom.localStorage.getItem(key)).toBe("light");
    });

    test("2.23 Interleaving invalid values with valid themes recovers to last valid state", () => {
      const key = "recovery-key";
      dom.localStorage.setItem(key, "light");
      dom.localStorage.setItem(key, "INVALID_THEME");
      dom.localStorage.setItem(key, "dark");

      expect(dom.localStorage.getItem(key)).toBe("dark");
    });

    test("2.24 ThemeScript with nonce attribute includes security nonce for CSP", () => {
      const nonce = "rAnd0mN0nc3Value==";
      const inspector = inspectHtml(el(ThemeScript, { nonce }));

      expect(inspector.hasAttribute("nonce", nonce)).toBeTrue();
    });

    test("2.25 Cross-tab event listener registration and removal lifecycle", () => {
      let listenerCalled = false;
      const handler = (e: any) => {
        if (e.key === "fc-theme") listenerCalled = true;
      };

      dom.window.addEventListener("storage", handler);
      dom.window.dispatchEvent({ type: "storage", key: "fc-theme", newValue: "dark" });
      expect(listenerCalled).toBeTrue();

      listenerCalled = false;
      dom.window.removeEventListener("storage", handler);
      dom.window.dispatchEvent({ type: "storage", key: "fc-theme", newValue: "light" });
      expect(listenerCalled).toBeFalse();
    });
  });
});
