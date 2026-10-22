import { describe, expect, test } from "bun:test";
import { ThemeProvider, ThemeScript, ThemeToggle, useTheme } from "../../packages/ui/src";
import { el, inspectHtml } from "../e2e/harness/test-utils";

describe("@repo/ui theme unit tests", () => {
  describe("ThemeScript", () => {
    test("renders script element with default storage key and system theme", () => {
      const inspector = inspectHtml(el(ThemeScript, null));
      expect(inspector.hasAttribute("id", "fc-theme-script")).toBeTrue();
      expect(inspector.contains('"fc-theme"')).toBeTrue();
      expect(inspector.contains('"system"')).toBeTrue();
      expect(inspector.contains("classList.add('dark')")).toBeTrue();
      expect(inspector.contains("classList.remove('dark')")).toBeTrue();
      expect(inspector.contains("prefers-color-scheme: dark")).toBeTrue();
    });

    test("respects custom storageKey and defaultTheme props", () => {
      const inspector = inspectHtml(
        el(ThemeScript, {
          storageKey: "custom-theme-key",
          defaultTheme: "dark",
        }),
      );
      expect(inspector.contains('"custom-theme-key"')).toBeTrue();
      expect(inspector.contains('"dark"')).toBeTrue();
    });
  });

  describe("useTheme", () => {
    test("throws an explicit error when invoked outside ThemeProvider", () => {
      function NakedComponent() {
        useTheme();
        return null;
      }

      expect(() => {
        inspectHtml(el(NakedComponent, null));
      }).toThrow("useTheme must be used within a ThemeProvider");
    });
  });

  describe("ThemeProvider", () => {
    test("renders children and provides default context values", () => {
      function Consumer() {
        const { theme, resolvedTheme } = useTheme();
        return el("span", { "data-theme": theme, "data-resolved": resolvedTheme }, theme);
      }

      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "dark" }, el(Consumer, null)),
      );

      expect(inspector.hasAttribute("data-theme", "dark")).toBeTrue();
      expect(inspector.hasAttribute("data-resolved", "dark")).toBeTrue();
      expect(inspector.contains("dark</span>")).toBeTrue();
    });

    test("provides light theme context when defaultTheme is light", () => {
      function Consumer() {
        const { theme, resolvedTheme } = useTheme();
        return el("div", null, `Theme is ${theme}, resolved is ${resolvedTheme}`);
      }

      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(Consumer, null)),
      );

      expect(inspector.contains("Theme is light, resolved is light")).toBeTrue();
    });
  });

  describe("ThemeToggle", () => {
    test("renders without error inside ThemeProvider in SSR mode", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(ThemeToggle, null)),
      );

      expect(inspector.hasAttribute("aria-hidden", "true")).toBeTrue();
      expect(inspector.contains("inline-flex")).toBeTrue();
    });

    test("renders cycle variant SSR placeholder", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "dark" }, el(ThemeToggle, { variant: "cycle" })),
      );

      expect(inspector.hasAttribute("aria-hidden", "true")).toBeTrue();
    });

    test("renders segmented variant SSR placeholder", () => {
      const inspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "system" }, el(ThemeToggle, { variant: "segmented" })),
      );

      expect(inspector.hasAttribute("aria-hidden", "true")).toBeTrue();
    });

    test("defines WAI-ARIA menu semantics and focus-visible rings in source", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const toggleCode = fs.readFileSync(
        path.resolve(import.meta.dir, "../../packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      // Verify WAI-ARIA attributes
      expect(toggleCode.includes('role="menuitemradio"')).toBeTrue();
      expect(toggleCode.includes("aria-checked={isSelected}")).toBeTrue();
      expect(toggleCode.includes('role="menu"')).toBeTrue();
      expect(toggleCode.includes('aria-orientation="vertical"')).toBeTrue();
      expect(toggleCode.includes('aria-haspopup="menu"')).toBeTrue();

      // Verify Keyboard Navigation keys
      expect(toggleCode.includes('"ArrowDown"')).toBeTrue();
      expect(toggleCode.includes('"ArrowUp"')).toBeTrue();
      expect(toggleCode.includes('"Home"')).toBeTrue();
      expect(toggleCode.includes('"End"')).toBeTrue();
      expect(toggleCode.includes('"Escape"')).toBeTrue();
      expect(toggleCode.includes('"Tab"')).toBeTrue();

      // Verify Focus Ring classes on menu items
      expect(toggleCode.includes("focus-visible:ring-2 focus-visible:ring-ring")).toBeTrue();
    });
  });
});
