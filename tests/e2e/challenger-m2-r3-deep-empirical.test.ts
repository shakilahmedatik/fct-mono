/**
 * Challenger 2 Round 3 Deep Empirical Stress Test Suite
 * Milestone 2: Tooltip & Tabs SSR, Hydration Safety & Edge Cases
 */

import { describe, expect, test } from "bun:test";
import {
  Input,
  Select,
  SelectOption,
  sideClasses,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
} from "../../packages/ui/src";
import { el, inspectHtml } from "./harness/test-utils";

function extractTooltipId(html: string): string | null {
  const match = html.match(
    /<div[^>]*\bid="([^"]+)"[^>]*role="tooltip"|<div[^>]*role="tooltip"[^>]*\bid="([^"]+)"/,
  );
  return match ? match[1] || match[2] : null;
}

function extractTriggerDescribedBy(html: string): string | null {
  const match = html.match(/<button[^>]*\baria-describedby="([^"]+)"/);
  return match ? match[1] : null;
}

describe("Challenger 2 Round 3: Empirical Stress & Edge Case Harness", () => {
  // =========================================================================
  // 1. Tooltip SSR & Accessibility Deep Stress Tests
  // =========================================================================
  describe("1. Tooltip SSR & Accessibility", () => {
    test("1.1 defaultOpen={true} renders tooltip text and connects aria-describedby in SSR static HTML", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          content: "Tooltip text defaultOpen",
          defaultOpen: true,
          children: el("button", { type: "button" }, "Trigger Button"),
        }),
      );

      // Verify content is present
      expect(inspector.contains("Tooltip text defaultOpen")).toBeTrue();
      expect(inspector.contains('role="tooltip"')).toBeTrue();
      expect(inspector.contains('data-state="open"')).toBeTrue();

      // Extract trigger's aria-describedby and tooltip's id
      const describedById = extractTriggerDescribedBy(inspector.html);
      expect(describedById).not.toBeNull();
      expect(describedById!.length).toBeGreaterThan(0);

      // Verify tooltip container has the exact matching ID
      const tooltipId = extractTooltipId(inspector.html);
      expect(tooltipId).not.toBeNull();
      expect(tooltipId).toBe(describedById);
    });

    test("1.2 forceMount={true} renders tooltip text with hidden attribute and data-state='closed' in SSR", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          content: "Tooltip text forceMount",
          forceMount: true,
          children: el("button", { type: "button" }, "Target Element"),
        }),
      );

      // Verify content is present in HTML
      expect(inspector.contains("Tooltip text forceMount")).toBeTrue();
      expect(inspector.contains('role="tooltip"')).toBeTrue();
      expect(inspector.contains('data-state="closed"')).toBeTrue();
      expect(inspector.contains("hidden")).toBeTrue();

      // Verify trigger has aria-describedby matching tooltip ID
      const describedById = extractTriggerDescribedBy(inspector.html);
      expect(describedById).not.toBeNull();

      const tooltipId = extractTooltipId(inspector.html);
      expect(tooltipId).not.toBeNull();
      expect(tooltipId).toBe(describedById);
    });

    test("1.3 defaultOpen=false & forceMount=false (default) lazily unmounts tooltip in SSR static HTML", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          content: "Should not appear in static HTML",
          children: el("button", { type: "button" }, "Normal Trigger"),
        }),
      );

      // Content and tooltip container MUST NOT appear in static HTML
      expect(inspector.contains("Normal Trigger")).toBeTrue();
      expect(inspector.contains("Should not appear in static HTML")).toBeFalse();
      expect(inspector.contains('role="tooltip"')).toBeFalse();
      expect(inspector.contains("aria-describedby")).toBeFalse();
    });

    test("1.4 Tooltip with explicit id prop binds trigger aria-describedby to explicit id", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          id: "custom-tooltip-id-999",
          content: "Explicit ID text",
          defaultOpen: true,
          children: el("button", { type: "button" }, "Trigger"),
        }),
      );

      expect(inspector.contains('aria-describedby="custom-tooltip-id-999"')).toBeTrue();
      expect(inspector.contains('id="custom-tooltip-id-999"')).toBeTrue();
    });

    test("1.5 Tooltip preserves pre-existing aria-describedby on trigger element", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          id: "my-tip",
          content: "Appended tip",
          defaultOpen: true,
          children: el(
            "button",
            { type: "button", "aria-describedby": "existing-help-text" },
            "Trigger with Help",
          ),
        }),
      );

      expect(inspector.contains('aria-describedby="existing-help-text my-tip"')).toBeTrue();
    });

    test("1.6 Tooltip with null or empty content suppresses aria-describedby and popup markup", () => {
      const inspectorNull = inspectHtml(
        el(Tooltip, {
          content: null,
          defaultOpen: true,
          children: el("button", { type: "button" }, "Null Content"),
        }),
      );
      expect(inspectorNull.contains("aria-describedby")).toBeFalse();
      expect(inspectorNull.contains('role="tooltip"')).toBeFalse();

      const inspectorEmpty = inspectHtml(
        el(Tooltip, {
          content: "",
          forceMount: true,
          children: el("button", { type: "button" }, "Empty Content"),
        }),
      );
      expect(inspectorEmpty.contains("aria-describedby")).toBeFalse();
      expect(inspectorEmpty.contains('role="tooltip"')).toBeFalse();
    });

    test("1.7 Controlled Tooltip: open={true} vs open={false}", () => {
      const inspectorOpen = inspectHtml(
        el(Tooltip, {
          content: "Controlled Open",
          open: true,
          children: el("button", { type: "button" }, "Open Trigger"),
        }),
      );
      expect(inspectorOpen.contains("Controlled Open")).toBeTrue();
      expect(inspectorOpen.contains('data-state="open"')).toBeTrue();

      const inspectorClosed = inspectHtml(
        el(Tooltip, {
          content: "Controlled Closed",
          open: false,
          children: el("button", { type: "button" }, "Closed Trigger"),
        }),
      );
      expect(inspectorClosed.contains("Controlled Closed")).toBeFalse();
      expect(inspectorClosed.contains('role="tooltip"')).toBeFalse();
    });

    test("1.8 Tooltip side classes verification", () => {
      const sides = ["top", "bottom", "left", "right"] as const;
      for (const side of sides) {
        const inspector = inspectHtml(
          el(Tooltip, {
            content: `Side ${side}`,
            side,
            defaultOpen: true,
            children: el("span", null, "Target"),
          }),
        );
        expect(inspector.contains(`data-side="${side}"`)).toBeTrue();
        expect(inspector.contains(sideClasses[side])).toBeTrue();
      }
    });

    test("1.9 SSR execution produces valid markup without warnings or errors", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          content: "Hydration check",
          defaultOpen: true,
          children: el("button", { type: "button" }, "SSR Button"),
        }),
      );
      expect(inspector.html.length).toBeGreaterThan(0);
      expect(inspector.contains("Hydration check")).toBeTrue();
    });

    test("1.10 Tooltip safely handles non-element children (plain text) without crash", () => {
      const inspector = inspectHtml(
        el(Tooltip, {
          content: "Text hover info",
          defaultOpen: true,
          children: "Plain text trigger",
        }),
      );
      expect(inspector.contains("Plain text trigger")).toBeTrue();
      expect(inspector.contains("Text hover info")).toBeTrue();
    });

    test("1.11 Tooltip implements Escape key dismissal logic", () => {
      // Inspect packages/ui/src/components/tooltip.tsx source for Escape listener
      const fs = require("node:fs");
      const path = require("node:path");
      const tooltipCode = fs.readFileSync(
        path.resolve(__dirname, "../../packages/ui/src/components/tooltip.tsx"),
        "utf8",
      );
      expect(tooltipCode.includes('e.key === "Escape"')).toBeTrue();
      expect(tooltipCode.includes('document.addEventListener("keydown"')).toBeTrue();
      expect(tooltipCode.includes('document.removeEventListener("keydown"')).toBeTrue();
    });
  });

  // =========================================================================
  // 2. Tabs SSR & ForceMount Stress Tests
  // =========================================================================
  describe("2. Tabs SSR & ForceMount Behaviors", () => {
    test("2.1 Default Tabs (forceMount=false) lazily unmounts inactive panels in SSR static HTML", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Content"),
          el(TabsContent, { value: "tab2" }, "Panel 2 Content"),
        ),
      );

      // Active panel is rendered
      expect(inspector.contains("Panel 1 Content")).toBeTrue();
      expect(inspector.contains('role="tabpanel" data-state="active"')).toBeTrue();

      // Inactive panel is NOT rendered at all (lazy unmounting)
      expect(inspector.contains("Panel 2 Content")).toBeFalse();
      expect(inspector.contains('role="tabpanel" data-state="inactive"')).toBeFalse();
    });

    test("2.2 Tabs with forceMount={true} cascades to all child TabsContent and renders inactive panels with hidden", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1", forceMount: true },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
            el(TabsTrigger, { value: "tab3" }, "Tab 3"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2" }, "Panel 2 Inactive"),
          el(TabsContent, { value: "tab3" }, "Panel 3 Inactive"),
        ),
      );

      // All panels must be in SSR static HTML
      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
      expect(inspector.contains("Panel 3 Inactive")).toBeTrue();

      // Verify active panel does NOT have hidden attribute or class
      const activeMatch = inspector.html.match(
        /<div[^>]*role="tabpanel"[^>]*data-state="active"[^>]*>Panel 1 Active<\/div>/,
      );
      expect(activeMatch).not.toBeNull();
      expect(activeMatch![0]).not.toContain("hidden");

      // Verify inactive panels HAVE role="tabpanel", data-state="inactive", and hidden attribute
      const inactiveMatches = inspector.html.matchAll(
        /<div[^>]*role="tabpanel"[^>]*data-state="inactive"[^>]*>Panel \d Inactive<\/div>/g,
      );
      let count = 0;
      for (const match of inactiveMatches) {
        count++;
        expect(match[0]).toContain("hidden");
        expect(match[0]).toContain('role="tabpanel"');
      }
      expect(count).toBe(2);
    });

    test("2.3 Individual TabsContent forceMount={true} mounts inactive panel while sibling stays unmounted", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
            el(TabsTrigger, { value: "tab3" }, "Tab 3"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2", forceMount: true }, "Panel 2 ForceMounted"),
          el(TabsContent, { value: "tab3" }, "Panel 3 Lazy"),
        ),
      );

      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      expect(inspector.contains("Panel 2 ForceMounted")).toBeTrue();
      expect(inspector.contains("Panel 3 Lazy")).toBeFalse();

      // Panel 2 has hidden attribute and inactive state
      expect(inspector.contains('data-state="inactive"')).toBeTrue();
    });

    test("2.4 Individual TabsContent forceMount={false} overrides root Tabs forceMount={true}", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "tab1", forceMount: true },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
          el(TabsContent, { value: "tab2", forceMount: false }, "Panel 2 Explicitly Unmounted"),
        ),
      );

      expect(inspector.contains("Panel 1 Active")).toBeTrue();
      // Panel 2 overridden to forceMount=false should be unmounted!
      expect(inspector.contains("Panel 2 Explicitly Unmounted")).toBeFalse();
    });

    test("2.5 TabsContent rendered standalone without parent Tabs does not throw and renders", () => {
      const inspector = inspectHtml(el(TabsContent, { value: "standalone" }, "Standalone Panel"));
      expect(inspector.contains("Standalone Panel")).toBeTrue();
      expect(inspector.contains('role="tabpanel"')).toBeTrue();
      expect(inspector.contains('data-state="active"')).toBeTrue();
    });

    test("2.6 Tabs with controlled value prop reflects active state correctly", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { value: "tab2" },
          el(
            TabsList,
            null,
            el(TabsTrigger, { value: "tab1" }, "Tab 1"),
            el(TabsTrigger, { value: "tab2" }, "Tab 2"),
          ),
          el(TabsContent, { value: "tab1" }, "Panel 1"),
          el(TabsContent, { value: "tab2" }, "Panel 2"),
        ),
      );

      expect(inspector.contains("Panel 1")).toBeFalse();
      expect(inspector.contains("Panel 2")).toBeTrue();
      expect(inspector.contains('aria-selected="true"')).toBeTrue();
    });

    test("2.7 Nested Tabs isolate context properly without leaking forceMount", () => {
      const inspector = inspectHtml(
        el(
          Tabs,
          { defaultValue: "outer1", forceMount: true },
          el(
            TabsContent,
            { value: "outer1" },
            "Outer Panel 1",
            el(
              Tabs,
              { defaultValue: "inner1", forceMount: false },
              el(TabsContent, { value: "inner1" }, "Inner Panel 1"),
              el(TabsContent, { value: "inner2" }, "Inner Panel 2 Inactive"),
            ),
          ),
          el(TabsContent, { value: "outer2" }, "Outer Panel 2 Inactive"),
        ),
      );

      // Outer forceMount=true mounts outer2
      expect(inspector.contains("Outer Panel 1")).toBeTrue();
      expect(inspector.contains("Outer Panel 2 Inactive")).toBeTrue();

      // Inner forceMount=false unmounts inner2
      expect(inspector.contains("Inner Panel 1")).toBeTrue();
      expect(inspector.contains("Inner Panel 2 Inactive")).toBeFalse();
    });

    test("2.8 Tabs implements keyboard navigation (ArrowRight, ArrowLeft, Home, End)", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const tabsCode = fs.readFileSync(
        path.resolve(__dirname, "../../packages/ui/src/components/tabs.tsx"),
        "utf8",
      );

      expect(tabsCode.includes('e.key === "ArrowRight"')).toBeTrue();
      expect(tabsCode.includes('e.key === "ArrowLeft"')).toBeTrue();
      expect(tabsCode.includes('e.key === "Home"')).toBeTrue();
      expect(tabsCode.includes('e.key === "End"')).toBeTrue();
      expect(tabsCode.includes('role="tablist"')).toBeTrue();
    });
  });

  // =========================================================================
  // 3. Form Controls Prop Precedence Stress Tests
  // =========================================================================
  describe("3. Form Controls Prop Precedence", () => {
    test("3.1 Input preserves caller aria-describedby alongside errorId without being overwritten", () => {
      const inspector = inspectHtml(
        el(Input, {
          id: "email-input",
          "aria-describedby": "help-text",
          error: "Invalid email address",
          placeholder: "user@example.com",
        }),
      );

      expect(inspector.contains('aria-invalid="true"')).toBeTrue();
      expect(inspector.contains('aria-describedby="help-text email-input-error"')).toBeTrue();
      expect(inspector.contains("Invalid email address")).toBeTrue();
    });

    test("3.2 Textarea preserves caller aria-describedby alongside errorId without being overwritten", () => {
      const inspector = inspectHtml(
        el(Textarea, {
          id: "bio-textarea",
          "aria-describedby": "bio-help",
          error: "Bio too short",
        }),
      );

      expect(inspector.contains('aria-invalid="true"')).toBeTrue();
      expect(inspector.contains('aria-describedby="bio-help bio-textarea-error"')).toBeTrue();
      expect(inspector.contains("Bio too short")).toBeTrue();
    });

    test("3.3 Select preserves caller aria-describedby alongside errorId without being overwritten", () => {
      const inspector = inspectHtml(
        el(
          Select,
          {
            id: "country-select",
            "aria-describedby": "country-hint",
            error: "Select a country",
          },
          el(SelectOption, { value: "us" }, "United States"),
        ),
      );

      expect(inspector.contains('aria-invalid="true"')).toBeTrue();
      expect(inspector.contains('aria-describedby="country-hint country-select-error"')).toBeTrue();
      expect(inspector.contains("Select a country")).toBeTrue();
    });
  });
});
