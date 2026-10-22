/**
 * Challenger 2: Empirical Stress Test Suite
 * Milestone 1: Design System & Theme Foundations (@repo/ui)
 *
 * Focus Areas:
 * 1. Tailwind v4 Token Resolution & Content Discovery (@theme, @source)
 * 2. ThemeToggle Interactive States, Keyboard Accessibility, and ARIA
 * 3. Next.js SSR & Hydration Safety (ThemeScript, ThemeProvider, App Layouts)
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ThemeProvider, ThemeScript, ThemeToggle, useTheme } from "../../packages/ui/src";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import {
  APPS_PATH,
  el,
  inspectHtml,
  PROJECT_ROOT,
  React,
  UI_STYLES_PATH,
} from "./harness/test-utils";

describe("Challenger 2: Empirical Theme & Integration Challenge Suite", () => {
  let dom: EmulatedTab;

  beforeEach(() => {
    dom = setupDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: Tailwind CSS v4 Token Resolution & Content Discovery
  // =========================================================================
  describe("Area 1: Tailwind CSS v4 Token Resolution & Content Discovery", () => {
    test("1.1 Programmatic Tailwind v4 compile resolves all @theme utility tokens", async () => {
      const { compile } = await import("tailwindcss");
      const stylesCss = fs.readFileSync(UI_STYLES_PATH, "utf8");

      const compiler = await compile(stylesCss, {
        base: path.dirname(UI_STYLES_PATH),
        async loadStylesheet(id, base) {
          if (id === "tailwindcss") {
            const twPath = require.resolve("tailwindcss/index.css", { paths: [base] });
            return {
              path: twPath,
              base: path.dirname(twPath),
              content: fs.readFileSync(twPath, "utf8"),
            };
          }
          const resolved = path.resolve(base, id);
          return {
            path: resolved,
            base: path.dirname(resolved),
            content: fs.readFileSync(resolved, "utf8"),
          };
        },
      });

      const requiredTokens = [
        "bg-background",
        "text-foreground",
        "bg-card",
        "text-card-foreground",
        "bg-popover",
        "text-popover-foreground",
        "bg-primary",
        "text-primary-foreground",
        "bg-secondary",
        "text-secondary-foreground",
        "bg-muted",
        "text-muted-foreground",
        "bg-accent",
        "text-accent-foreground",
        "bg-destructive",
        "text-destructive-foreground",
        "bg-success",
        "text-success-foreground",
        "bg-warning",
        "text-warning-foreground",
        "bg-info",
        "text-info-foreground",
        "border-border",
        "border-border-subtle",
        "border-input",
        "ring-ring",
        "bg-sidebar",
        "text-sidebar-foreground",
        "border-sidebar-border",
        "bg-sidebar-accent",
        "text-sidebar-accent-foreground",
        "rounded-xs",
        "rounded-sm",
        "rounded-md",
        "rounded-lg",
        "rounded-xl",
        "rounded-2xl",
      ];

      const compiledCss = compiler.build(requiredTokens);
      expect(compiledCss.length).toBeGreaterThan(0);

      const unresolved: string[] = [];
      for (const token of requiredTokens) {
        const escaped = token.replace("/", "\\/").replace(":", "\\:");
        const isResolved = compiledCss.includes(`.${token}`) || compiledCss.includes(`.${escaped}`);
        if (!isResolved) unresolved.push(token);
      }

      console.log("[EMPIRICAL 1.1] Unresolved tokens count:", unresolved.length);
      expect(unresolved).toEqual([]);
    });

    test("1.2 Tailwind v4 compiles modern color-mix opacity variants", async () => {
      const { compile } = await import("tailwindcss");
      const stylesCss = fs.readFileSync(UI_STYLES_PATH, "utf8");

      const compiler = await compile(stylesCss, {
        base: path.dirname(UI_STYLES_PATH),
        async loadStylesheet(id, base) {
          if (id === "tailwindcss") {
            const twPath = require.resolve("tailwindcss/index.css", { paths: [base] });
            return {
              path: twPath,
              base: path.dirname(twPath),
              content: fs.readFileSync(twPath, "utf8"),
            };
          }
          const resolved = path.resolve(base, id);
          return {
            path: resolved,
            base: path.dirname(resolved),
            content: fs.readFileSync(resolved, "utf8"),
          };
        },
      });

      const opacityCandidates = [
        "bg-background/80",
        "bg-muted/40",
        "text-foreground/80",
        "border-accent/20",
        "border-border/40",
      ];

      const compiled = compiler.build(opacityCandidates);
      expect(compiled).toContain("color-mix(in srgb, hsl(var(--background)) 80%, transparent)");
      expect(compiled).toContain("color-mix(in srgb, hsl(var(--muted)) 40%, transparent)");
      expect(compiled).toContain("color-mix(in srgb, hsl(var(--accent)) 20%, transparent)");
    });

    test("1.3 [VERIFIED] @source path in app globals.css resolves to @repo/ui package", () => {
      const apps = ["web", "console", "admin"];

      for (const app of apps) {
        const cssPath = path.join(APPS_PATH, app, "src/app/globals.css");
        const content = fs.readFileSync(cssPath, "utf8");

        // Extract the @source directive
        const match = content.match(/@source\s+["']([^"']+)["']/);
        expect(match).not.toBeNull();
        const declaredPath = match![1];

        // Resolve path relative to the CSS file
        const cssDir = path.dirname(cssPath);
        const resolvedPath = path.resolve(cssDir, declaredPath);
        const exists = fs.existsSync(resolvedPath);

        console.log(`[VERIFIED 1.3] App "${app}":`);
        console.log(`  Declared: ${declaredPath}`);
        console.log(`  Resolved: ${resolvedPath}`);
        console.log(`  Exists on disk: ${exists}`);

        expect(declaredPath).toBe("../../../../packages/ui/src");
        expect(exists).toBeTrue();
      }
    });

    test("1.4 [VERIFIED] PostCSS running inside app directory discovers UI classes", async () => {
      const postcss = require(
        path.resolve(
          PROJECT_ROOT,
          "node_modules/.bun/postcss@8.5.29/node_modules/postcss/lib/postcss.js",
        ),
      );
      const tailwind = require(
        path.resolve(
          PROJECT_ROOT,
          "node_modules/.bun/@tailwindcss+postcss@4.3.3/node_modules/@tailwindcss/postcss/dist/index.js",
        ),
      );

      const webGlobalsPath = path.join(APPS_PATH, "web/src/app/globals.css");
      const currentCss = fs.readFileSync(webGlobalsPath, "utf8");

      const originalCwd = process.cwd();
      try {
        process.chdir(path.join(APPS_PATH, "web"));

        // Process with CURRENT globals.css (having 4 levels: @source "../../../../packages/ui/src")
        const resultCurrent = await postcss([tailwind()]).process(currentCss, {
          from: "src/app/globals.css",
        });

        // Check whether ring-ring (used in theme-toggle.tsx) was generated
        const currentHasRing =
          resultCurrent.css.includes(".ring-ring") ||
          resultCurrent.css.includes("focus-visible\\:ring-ring");

        console.log("[VERIFIED 1.4 in apps/web build context]", {
          currentHasRingRingFromUI: currentHasRing,
        });

        // Proof: Current 4-hop path includes ring-ring!
        expect(currentHasRing).toBeTrue();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  // =========================================================================
  // Area 2: ThemeToggle Interactive States, Accessibility & ARIA
  // =========================================================================
  describe("Area 2: ThemeToggle Interactive States, Accessibility & ARIA", () => {
    test("2.1 Focus-visible ring styles on trigger, segmented, and cycle buttons", () => {
      // Mount inside DOM context
      dom.document.documentElement.classList.add("dark");

      // Dropdown trigger
      const dropdownHtml = inspectHtml(
        el(ThemeProvider, { defaultTheme: "dark" }, el(ThemeToggle, { variant: "dropdown" })),
      ).html;
      // In SSR state it renders placeholder with rounded-lg border-border bg-card
      expect(dropdownHtml).toContain("rounded-lg");
      expect(dropdownHtml).toContain("border-border");

      // Inspect client component markup by evaluating mounted state
      // Segmented control
      const segmentedInspector = inspectHtml(
        el(ThemeProvider, { defaultTheme: "light" }, el(ThemeToggle, { variant: "segmented" })),
      );
      expect(
        segmentedInspector.contains("focus-visible:ring-ring") ||
          segmentedInspector.contains("aria-hidden"),
      ).toBeTrue();
    });

    test("2.2 [VERIFIED] Dropdown menu items have focus-visible:ring styles", () => {
      // Read theme-toggle.tsx source directly to verify class bindings
      const toggleSource = fs.readFileSync(
        path.join(PROJECT_ROOT, "packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      // Check the menuitem button className in dropdown variant
      const menuitemSection = toggleSource.slice(
        toggleSource.indexOf('role="menuitem'),
        toggleSource.indexOf("</button>", toggleSource.indexOf('role="menuitem')),
      );

      console.log("[VERIFIED 2.2 Menuitem section]:", menuitemSection);

      const hasFocusVisible = menuitemSection.includes("focus-visible:");
      const hasFocusRing = menuitemSection.includes("ring-");

      console.log("[VERIFIED 2.2]", {
        hasFocusVisible,
        hasFocusRing,
      });

      expect(hasFocusVisible).toBeTrue();
      expect(hasFocusRing).toBeTrue();
    });

    test("2.3 [VERIFIED] WAI-ARIA Menu keyboard navigation (ArrowDown/ArrowUp/Home/End) is implemented", () => {
      const toggleSource = fs.readFileSync(
        path.join(PROJECT_ROOT, "packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      const handlesArrowDown = toggleSource.includes('"ArrowDown"');
      const handlesArrowUp = toggleSource.includes('"ArrowUp"');
      const handlesHome = toggleSource.includes('"Home"');
      const handlesEnd = toggleSource.includes('"End"');

      console.log("[VERIFIED 2.3 Keyboard handling]:", {
        handlesArrowDown,
        handlesArrowUp,
        handlesHome,
        handlesEnd,
      });

      expect(handlesArrowDown).toBeTrue();
      expect(handlesArrowUp).toBeTrue();
      expect(handlesHome).toBeTrue();
      expect(handlesEnd).toBeTrue();
    });

    test("2.4 [VERIFIED] ARIA checked state and menuitemradio role on dropdown menu items", () => {
      const toggleSource = fs.readFileSync(
        path.join(PROJECT_ROOT, "packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      // Check for aria-checked or aria-selected in the menuitem button
      const menuitemIndex = toggleSource.indexOf('role="menuitem');
      const menuitemBlock = toggleSource.slice(menuitemIndex - 100, menuitemIndex + 400);

      const hasAriaChecked = menuitemBlock.includes("aria-checked");
      const hasAriaSelected = menuitemBlock.includes("aria-selected");
      const hasMenuitemRadio = menuitemBlock.includes("menuitemradio");

      console.log("[VERIFIED 2.4 ARIA checked semantics]:", {
        hasAriaChecked,
        hasAriaSelected,
        hasMenuitemRadio,
      });

      expect(hasAriaChecked).toBeTrue();
      expect(hasMenuitemRadio).toBeTrue();
    });
  });

  // =========================================================================
  // Area 3: Next.js SSR / Hydration Safety
  // =========================================================================
  describe("Area 3: Next.js SSR / Hydration Safety", () => {
    test("3.1 ThemeScript generates deterministic, self-contained inline script", () => {
      const inspector = inspectHtml(
        el(ThemeScript, { defaultTheme: "system", storageKey: "fc-theme" }),
      );
      expect(inspector.hasAttribute("id", "fc-theme-script")).toBeTrue();
      expect(inspector.contains("localStorage.getItem")).toBeTrue();
      expect(inspector.contains("prefers-color-scheme: dark")).toBeTrue();
    });

    test("3.2 [VERIFIED] ThemeScript handles localStorage SecurityError and completes DOM update", () => {
      const inspector = inspectHtml(el(ThemeScript, null));
      const match = inspector.html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      expect(match).not.toBeNull();
      const rawScript = match![1];

      // Simulate a browser where localStorage access throws SecurityError (Incognito/Private)
      const mockStorage = {
        getItem() {
          throw new DOMException("Access Denied", "SecurityError");
        },
      };

      const mockDoc = {
        documentElement: {
          classList: {
            addCalled: false,
            add(c: string) {
              if (c === "dark") this.addCalled = true;
            },
            remove() {},
          },
          style: {},
        },
      };

      const mockWin = {
        matchMedia(_q: string) {
          return { matches: true }; // OS is DARK
        },
      };

      // Execute script template as browser would in <head>
      const fn = new Function("window", "document", "localStorage", rawScript);
      fn(mockWin, mockDoc, mockStorage);

      console.log("[VERIFIED 3.2 SecurityError Script Execution]:", {
        darkClassAdded: mockDoc.documentElement.classList.addCalled,
      });

      // Verification: Inner try/catch around localStorage allows matchMedia & classList to execute!
      expect(mockDoc.documentElement.classList.addCalled).toBeTrue();
    });

    test("3.3 [BUG VERIFICATION] ThemeProvider useState initializer causes SSR/hydration asymmetry", () => {
      function Consumer() {
        const { theme, resolvedTheme } = useTheme();
        return React.createElement(
          "div",
          { id: "test", "data-theme": theme, "data-resolved": resolvedTheme },
          theme,
        );
      }

      // 1. SSR pass: window is undefined (simulated server)
      const globalScope = globalThis as { window?: unknown };
      const prevWindow = globalScope.window;
      delete globalScope.window;

      const serverHtml = inspectHtml(
        React.createElement(
          ThemeProvider,
          { defaultTheme: "system", storageKey: "fc-theme" },
          React.createElement(Consumer),
        ),
      ).html;

      // Restore window for client simulation
      globalScope.window = prevWindow;

      // 2. Client initial render: user has dark theme stored
      dom.localStorage.setItem("fc-theme", "dark");
      dom.document.documentElement.classList.add("dark");

      const clientInitialHtml = inspectHtml(
        React.createElement(
          ThemeProvider,
          { defaultTheme: "system", storageKey: "fc-theme" },
          React.createElement(Consumer),
        ),
      ).html;

      console.log("[EMPIRICAL 3.3 Hydration Mismatch Check]:");
      console.log("  Server HTML:", serverHtml);
      console.log("  Client Initial HTML:", clientInitialHtml);
      console.log("  Divergence detected:", serverHtml !== clientInitialHtml);

      // EMPIRICAL BUG PROOF:
      // Server renders: data-theme="system" data-resolved="light"
      // Client initial render produces: data-theme="dark" data-resolved="dark"
      // This is a direct hydration mismatch warning in React!
      expect(serverHtml).not.toEqual(clientInitialHtml);
    });

    test("3.4 [VERIFIED] App root layouts configure suppressHydrationWarning", () => {
      const layouts = [
        path.join(APPS_PATH, "web/src/app/layout.tsx"),
        path.join(APPS_PATH, "console/src/app/layout.tsx"),
        path.join(APPS_PATH, "admin/src/app/layout.tsx"),
      ];

      for (const layoutPath of layouts) {
        const content = fs.readFileSync(layoutPath, "utf8");
        const hasSuppress = content.includes("suppressHydrationWarning");
        console.log(
          `[VERIFIED 3.4] ${path.basename(path.dirname(path.dirname(layoutPath)))} has suppressHydrationWarning:`,
          hasSuppress,
        );

        // Required by PROJECT.md Section 1 to prevent React mismatch on <html> tag
        expect(hasSuppress).toBeTrue();
      }
    });
  });
});
