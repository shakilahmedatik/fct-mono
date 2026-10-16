# Milestone 1 Remediation Strategy: ThemeToggle Accessibility & Keyboard Navigation

**Target File**: `packages/ui/src/theme/theme-toggle.tsx`  
**Author**: Explorer 3 (`explorer_m1_fix3`)  
**Target Consumer**: Worker M1 (`worker_m1`)  
**Date**: October 14, 2026  
**Status**: Ready for Implementation  

---

## 1. Executive Summary

Empirical audits conducted by Challenger 2 (`challenger_m1_2`) revealed that the dropdown variant of `ThemeToggle` (`packages/ui/src/theme/theme-toggle.tsx`) had three critical accessibility defects that violate WCAG 2.1 AA and WAI-ARIA Authoring Practices Guide (APG) standards for Menu Button patterns:

1. **Missing Keyboard Navigation**: The dropdown listened solely for the `Escape` key. It completely ignored `ArrowDown`, `ArrowUp`, `Home`, `End`, and did not handle `Tab` menu closing or focus restoration to the trigger button. Keyboard users could not navigate options or open the menu via standard directional keys.
2. **Missing WAI-ARIA Radio Menu Semantics**: The dropdown menu items were annotated with generic `role="menuitem"` instead of `role="menuitemradio"`. They lacked `aria-checked="true" | "false"`, relying solely on a visual Lucide `<Check />` icon for active state indication. Consequently, screen readers could not announce which theme was selected. Additionally, the trigger button lacked `aria-controls="theme-menu"`.
3. **Missing Visible Focus Rings**: Dropdown menu items rendered with `hover:bg-muted/70`, but had zero `focus-visible:` or `ring-` classes. A keyboard user navigating the menu experienced no visible focus outline.

This document provides complete, copy-pasteable replacement code for `packages/ui/src/theme/theme-toggle.tsx`, test updates for `tests/e2e/challenger2-empirical.test.ts`, and unit test additions for `tests/unit/theme.test.ts`.

---

## 2. Detailed Technical Breakdown

### 2.1 Defect 1: Keyboard Navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`, `Escape`, `Tab`)

- **Current State**:
  - `packages/ui/src/theme/theme-toggle.tsx:50-65`: Only handles `event.key === "Escape"` on `document`.
  - When the trigger button has focus, pressing `ArrowDown` or `ArrowUp` does nothing.
  - When the menu opens, focus remains trapped on the trigger button rather than shifting to the active or first menu item.
  - While navigating inside the menu, `ArrowDown` / `ArrowUp` does not move focus between items; `Home` does not jump to the first item; `End` does not jump to the last item.
- **WAI-ARIA APG Menu Button Requirements**:
  1. **Trigger Button**:
     - `ArrowDown` / `Enter` / `Space`: Opens the menu and moves focus to the first item (or currently active item).
     - `ArrowUp`: Opens the menu and moves focus to the last item.
  2. **Menu Items**:
     - `ArrowDown`: Moves focus to the next item, wrapping from the last item back to the first (`(index + 1) % 3`).
     - `ArrowUp`: Moves focus to the previous item, wrapping from the first item back to the last (`(index - 1 + 3) % 3`).
     - `Home`: Moves focus directly to the first item (`index = 0`).
     - `End`: Moves focus directly to the last item (`index = length - 1`).
     - `Escape`: Closes the menu and returns focus to the trigger button (`triggerRef.current?.focus()`).
     - `Tab`: Closes the menu without preventing default, allowing native tab order progression to continue.
     - `Enter` / `Space`: Activates the selected option (`setTheme(value)`), closes the menu, and returns focus to the trigger button.

### 2.2 Defect 2: ARIA Semantics (`role="menuitemradio"`, `aria-checked`, `role="menu"`, `aria-controls`)

- **Current State**:
  - Lines 197: `<button type="button" role="menuitem">`
  - Selection is indicated only via `{isSelected && <Check className="h-3.5 w-3.5 text-primary" />}`.
  - No `aria-checked` attribute is present on menu buttons.
  - Trigger button lacks `aria-controls="theme-menu"`.
- **WAI-ARIA APG Radio Menu Requirements**:
  1. Because theme choice (`light`, `dark`, `system`) represents a mutually exclusive set of options, items in the menu must carry `role="menuitemradio"`.
  2. Each item must declare `aria-checked={isSelected}` (`true` if selected, `false` otherwise).
  3. Roving `tabIndex`: The active/focused item has `tabIndex={0}`, while inactive items have `tabIndex={-1}`.
  4. The dropdown container must declare `id="theme-menu"`, `role="menu"`, `aria-orientation="vertical"`, `aria-label="Theme options"`, and `tabIndex={-1}`.
  5. The trigger button must declare `aria-controls="theme-menu"` when open.

### 2.3 Defect 3: Focus-Visible Styling

- **Current State**:
  - Line 203:
    ```tsx
    className={cn(
      "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-foreground",
      isSelected ? "bg-muted font-semibold text-primary" : "hover:bg-muted/70",
    )}
    ```
- **Remediation**:
  - Add consistent design-system focus styling:
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:bg-muted/70`
  - This ensures keyboard navigation renders the 2px focus outline with token color `--ring` (`ring-ring`), identical to the trigger button, segmented buttons, and cycle buttons.

---

## 3. Copy-Pasteable Code Replacement for Worker M1

Worker M1 should replace the entire contents of `packages/ui/src/theme/theme-toggle.tsx` with the following clean, verified implementation:

```tsx
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { type Theme, useTheme } from "./use-theme";

export interface ThemeToggleProps {
  className?: string;
  variant?: "dropdown" | "cycle" | "segmented";
  align?: "start" | "end";
}

const themeOptions: {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle({
  className,
  variant = "dropdown",
  align = "end",
}: ThemeToggleProps): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle outside click to close dropdown
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Handle global escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // If not mounted yet (SSR), render accessible placeholder
  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground",
          className,
        )}
        aria-hidden="true"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </div>
    );
  }

  // Segmented control variant
  if (variant === "segmented") {
    return (
      <fieldset
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-muted-foreground",
          className,
        )}
        aria-label="Theme selection"
      >
        {themeOptions.map(({ value, label, icon: Icon }) => {
          const isSelected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTheme(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
                isSelected
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </fieldset>
    );
  }

  // Cycle variant
  if (variant === "cycle") {
    const cycleNext = () => {
      if (theme === "light") setTheme("dark");
      else if (theme === "dark") setTheme("system");
      else setTheme("light");
    };

    return (
      <button
        type="button"
        onClick={cycleNext}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
          className,
        )}
        aria-label={`Current theme: ${theme}. Click to switch theme.`}
        title={`Theme: ${theme} (click to cycle)`}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  // Helper to open dropdown and focus designated item
  const openMenuWithFocus = (target: "first" | "last" | "selected") => {
    let targetIndex = 0;
    if (target === "last") {
      targetIndex = themeOptions.length - 1;
    } else if (target === "selected") {
      const selectedIndex = themeOptions.findIndex((opt) => opt.value === theme);
      targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }
    setOpen(true);
    setActiveIndex(targetIndex);
    setTimeout(() => {
      itemRefs.current[targetIndex]?.focus();
    }, 0);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenuWithFocus(open ? "selected" : "first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenuWithFocus("last");
    }
  };

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (index + 1) % themeOptions.length;
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prevIndex = (index - 1 + themeOptions.length) % themeOptions.length;
        setActiveIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;
      }
      case "Home": {
        event.preventDefault();
        setActiveIndex(0);
        itemRefs.current[0]?.focus();
        break;
      }
      case "End": {
        event.preventDefault();
        const lastIndex = themeOptions.length - 1;
        setActiveIndex(lastIndex);
        itemRefs.current[lastIndex]?.focus();
        break;
      }
      case "Escape": {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
        break;
      }
      case "Tab": {
        setOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            setActiveIndex(-1);
          } else {
            openMenuWithFocus("selected");
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "theme-menu" : undefined}
        aria-label={`Toggle theme (currently ${theme})`}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
          open && "bg-muted ring-2 ring-ring",
        )}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">Toggle theme</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id="theme-menu"
          role="menu"
          aria-orientation="vertical"
          aria-label="Theme options"
          tabIndex={-1}
          className={cn(
            "absolute z-50 mt-1.5 w-36 origin-top rounded-lg border border-border bg-card p-1 shadow-lg backdrop-blur-md transition-all focus:outline-none",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {themeOptions.map(({ value, label, icon: Icon }, index) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={activeIndex === index ? 0 : -1}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                  setActiveIndex(-1);
                  triggerRef.current?.focus();
                }}
                onKeyDown={(e) => handleItemKeyDown(e, index)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-foreground cursor-pointer select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-muted font-semibold text-primary"
                    : "hover:bg-muted/70 focus:bg-muted/70",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Updates Required in Test Suites

### 4.1 Invert Assertions in `tests/e2e/challenger2-empirical.test.ts`

In `tests/e2e/challenger2-empirical.test.ts`, tests 2.2, 2.3, and 2.4 were written by Challenger 2 to prove that the bugs existed by asserting `expect(...).toBeFalse()`.

Once Worker M1 applies the code replacement in `theme-toggle.tsx`, Worker M1 should update those three tests to assert positive compliance (`toBeTrue()`):

```ts
    test("2.2 [VERIFIED] Dropdown menu items have focus-visible:ring styles", () => {
      const toggleSource = fs.readFileSync(
        path.join(PROJECT_ROOT, "packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      const menuitemSection = toggleSource.slice(
        toggleSource.indexOf('role="menuitem'),
        toggleSource.indexOf("</button>", toggleSource.indexOf('role="menuitem')),
      );

      const hasFocusVisible = menuitemSection.includes("focus-visible:");
      const hasFocusRing = menuitemSection.includes("ring-");

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

      const menuitemIndex = toggleSource.indexOf('role="menuitem');
      const menuitemBlock = toggleSource.slice(menuitemIndex - 100, menuitemIndex + 400);

      const hasAriaChecked = menuitemBlock.includes("aria-checked");
      const hasMenuitemRadio = menuitemBlock.includes("menuitemradio");

      expect(hasAriaChecked).toBeTrue();
      expect(hasMenuitemRadio).toBeTrue();
    });
```

### 4.2 New Unit Tests for `tests/unit/theme.test.ts`

Worker M1 should add these tests to `tests/unit/theme.test.ts` inside the `describe("ThemeToggle")` block:

```ts
    test("defines WAI-ARIA menu semantics and focus-visible rings in source", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const toggleCode = fs.readFileSync(
        path.resolve(import.meta.dir, "../../packages/ui/src/theme/theme-toggle.tsx"),
        "utf8",
      );

      // Verify WAI-ARIA attributes
      expect(toggleCode.includes('role="menuitemradio"')).toBeTrue();
      expect(toggleCode.includes('aria-checked={isSelected}')).toBeTrue();
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
```

---

## 5. Verification Commands for Worker M1

After applying the changes, Worker M1 should run:

1. **TypeScript Typecheck**:
   ```bash
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ```
   *Expected*: Exits 0 with zero errors.

2. **Biome Lint and Formatting**:
   ```bash
   ./node_modules/.bin/biome check packages/ui/src/theme/theme-toggle.tsx
   ```
   *Expected*: Exits 0 with zero lint violations.

3. **Empirical Challenger Suite**:
   ```bash
   bun test tests/e2e/challenger2-empirical.test.ts
   ```
   *Expected*: All 12 tests pass 100%.

4. **Tier 1 to Tier 4 E2E Suites**:
   ```bash
   bun test tests/e2e/tier1-feature-coverage.test.ts tests/e2e/tier2-boundary-corner.test.ts tests/e2e/tier3-cross-feature.test.ts tests/e2e/tier4-real-world.test.ts
   ```
   *Expected*: All 62 tests pass 100%.
