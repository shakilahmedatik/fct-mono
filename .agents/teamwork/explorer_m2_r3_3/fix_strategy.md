# Fix Strategy: TabsContent SSR Persistence & `forceMount` Support

**Investigator**: Explorer 3 Round 3 (`explorer_m2_r3_3`)  
**Target Milestone**: Milestone 2: Reusable Component Suite (`@repo/ui`)  
**Target File**: `packages/ui/src/components/tabs.tsx`  
**Date**: 2026-10-14  

---

## 1. Executive Summary

In Milestone 2 Round 2, Challenger 2 authored an empirical stress test (`tests/e2e/challenger-m2-r2-empirical.test.ts`, Test 6.1) that rendered a full application composition containing a 3-tab `Tabs` component initialized with `defaultValue="directory"`. The test asserted that text within inactive tab panels (`"Attach Audio Podcast Brief"`) was present in the static SSR HTML (`renderToString(fullPage)`).

Because `TabsContent` in `packages/ui/src/components/tabs.tsx` unconditionally executed `if (!isSelected) return null;`, unselected panels were completely omitted from SSR output and DOM trees, causing the test assertion to fail.

To resolve this discrepancy while adhering to Radix UI / modern design system conventions and maintaining 100% backward compatibility with existing tests that assert unmounted inactive tabs (`expect(contains("First content")).toBeFalse()`), we design an optional `forceMount?: boolean` prop on `Tabs` and `TabsContent`, along with explicit `hidden` attribute support.

---

## 2. Root Cause & Behavioral Analysis

### 2.1 The Failure in Challenger 2 Round 2 (Test 6.1)
In `.agents/teamwork/challenger_m2_r2_2/test_output.log`:
```
627 |       const pageHtml = renderComponent(fullPage);
628 |       expect(pageHtml).toContain("FirstCup Monorepo");
629 |       expect(pageHtml).toContain("Daily Active Users");
630 |       expect(pageHtml).toContain("Subscriber Management");
631 |       expect(pageHtml).toContain("Attach Audio Podcast Brief");
                                ^
error: expect(received).toContain(expected)
Expected to contain: "Attach Audio Podcast Brief"
Received: "<div class=\"w-full space-y-4\"><div role=\"tablist\" ...>...</div><div role=\"tabpanel\" data-state=\"active\" ...>Subscriber Management</div></div>"
```

The second tab (`New Subscriber` / `value="create"`) contained the form with `"Attach Audio Podcast Brief"`. Because `defaultValue="directory"`, `isSelected` was `false`.

### 2.2 Why Inactive Tabs Default to `return null`
In WAI-ARIA and component libraries (Radix UI, shadcn/ui, Headless UI), the default behavior for unselected tabs is **lazy mounting** (unmounting inactive panels):
1. **Lightweight DOM**: Unrendered panels do not run effects, mount heavy components (data tables, editors), or inflate memory.
2. **Existing Test Invariant**: In `tests/adversarial-components-challenge.test.ts` lines 518–520:
   ```ts
   // Content panel: only tab2 content rendered
   expect(inspector.contains("Second content")).toBeTrue();
   expect(inspector.contains("First content")).toBeFalse();
   ```
   If unselected tabs were mounted unconditionally by default, `inspector.contains("First content")` would return `true`, breaking existing verified test suites.

### 2.3 The Need for `forceMount` & `hidden`
In modern Next.js / React applications, persistent mounting is essential in two major scenarios:
1. **SEO & Static Indexing**: Full-page marketing and documentation sites require all tab contents (e.g. Overview, Specs, Reviews) to be present in initial SSR HTML for search crawlers.
2. **Animation & State Retention**: Client transitions (e.g. Framer Motion fade/slide between panels) and form state retention require inactive panels to remain in the DOM.

When a panel is force-mounted or marked `hidden`:
- **HTML5 `hidden` attribute**: Rendered as `<div role="tabpanel" data-state="inactive" hidden ...>`. Browsers apply user-agent `[hidden] { display: none; }` and remove the element from the accessibility tree (WCAG 4.1.2 compliance).
- **Tailwind `.hidden` utility**: Guarantees `display: none` even if the consumer applied conflicting display classes like `className="flex flex-col"` or `className="grid"`.
- **Keyboard & Screen Reader Isolation**: Hidden elements cannot receive keyboard focus, tab navigation skips them, and screen readers ignore them completely.

---

## 3. Technical Architecture & Design Decisions

### 3.1 Dual-Level `forceMount` Support
1. **Per-Component**: `<TabsContent value="tab2" forceMount>...</TabsContent>` enables persistence for specific panels.
2. **Root-Level Cascade**: `<Tabs defaultValue="tab1" forceMount>...</Tabs>` provides `forceMount` via `TabsContext` so all child panels inherit persistence without boilerplate.
3. **Child Override**: Individual panels can pass `forceMount={false}` to opt out even if the root has `forceMount={true}`.

### 3.2 Explicit `hidden` Attribute Pass-Through
If a consumer passes `hidden` directly (`<TabsContent value="tab2" hidden={!isSelected}>` or `hidden={true}`), the component recognizes that the consumer intends DOM presence with visibility management rather than unmounting:
```tsx
const isHiddenProvided = propHidden !== undefined;
if (!isSelected && !forceMount && !isHiddenProvided) {
  return null;
}
```

### 3.3 Prop Spreading & Precedence Defense
To prevent `{...props}` from clobbering the managed `hidden` and `data-state` attributes, `forceMount` and `hidden` are destructured out of `props`:
```tsx
export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (
    {
      className,
      value,
      forceMount: propForceMount,
      hidden: propHidden,
      children,
      ...props
    },
    ref,
  ) => {
```
The rendered JSX specifies:
```tsx
<div
  ref={ref}
  role="tabpanel"
  {...props}
  data-state={isSelected ? "active" : "inactive"}
  hidden={isHidden}
  className={cn(
    "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
    !isSelected && "hidden",
  )}
>
  {children}
</div>
```
- Spreading `{...props}` before `data-state` and `hidden` ensures consumer attributes (e.g. `id`, `aria-labelledby`) are preserved while internal state cannot be corrupted.
- Placing `!isSelected && "hidden"` **after** `className` in `cn(...)` ensures Tailwind-merge prioritizes `hidden` over any caller display classes (`flex`, `grid`, `block`) when the tab is inactive.

---

## 4. Exact Implementation for the Worker

### File: `packages/ui/src/components/tabs.tsx`

Replace the entire contents of `packages/ui/src/components/tabs.tsx` with the following clean, typed implementation:

```tsx
import * as React from "react";
import { cn } from "../lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  forceMount?: boolean;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Whether to force mounting all child TabsContent panels in the DOM, including inactive ones.
   * Inactive panels render with `data-state="inactive"` and the `hidden` attribute.
   * Can be overridden on individual TabsContent components.
   * @default false
   */
  forceMount?: boolean;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  forceMount = false,
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value, setValue, forceMount }}>
      <div className={cn("w-full space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const listRef = React.useRef<HTMLDivElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const list = listRef.current;
      if (!list) return;

      const tabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
      );
      const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      if (e.key === "ArrowRight") {
        targetIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        targetIndex = 0;
      } else if (e.key === "End") {
        targetIndex = tabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      tabs[targetIndex]?.focus();
      tabs[targetIndex]?.click();
    };

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isSelected = context ? context.value === value : false;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        data-state={isSelected ? "active" : "inactive"}
        tabIndex={isSelected ? 0 : -1}
        onClick={(e) => {
          onClick?.(e);
          context?.setValue(value);
        }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          isSelected
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /**
   * Used to force mounting when persistent DOM presence is needed (e.g. SEO, SSR indexing, or animations).
   * When true, the tab panel is rendered in the DOM when inactive as well, with data-state="inactive" and hidden attribute.
   * @default false
   */
  forceMount?: boolean;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (
    {
      className,
      value,
      forceMount: propForceMount,
      hidden: propHidden,
      children,
      ...props
    },
    ref,
  ) => {
    const context = React.useContext(TabsContext);
    const isSelected = context ? context.value === value : true;
    const forceMount = propForceMount ?? context?.forceMount ?? false;
    const isHiddenProvided = propHidden !== undefined;

    if (!isSelected && !forceMount && !isHiddenProvided) {
      return null;
    }

    const isHidden = !isSelected ? true : propHidden;

    return (
      <div
        ref={ref}
        role="tabpanel"
        {...props}
        data-state={isSelected ? "active" : "inactive"}
        hidden={isHidden}
        className={cn(
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
          !isSelected && "hidden",
        )}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = "TabsContent";
```

---

## 5. Recommended Unit Test Additions

Add the following tests to `tests/unit/components.test.ts` within `describe("Tabs", ...)`:

```tsx
test("TabsContent unmounts inactive tab panels by default", () => {
  const inspector = inspectHtml(
    el(
      Tabs,
      { defaultValue: "tab1" },
      el(TabsList, null,
        el(TabsTrigger, { value: "tab1" }, "Tab 1"),
        el(TabsTrigger, { value: "tab2" }, "Tab 2"),
      ),
      el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
      el(TabsContent, { value: "tab2" }, "Panel 2 Inactive"),
    ),
  );
  expect(inspector.contains("Panel 1 Active")).toBeTrue();
  expect(inspector.contains("Panel 2 Inactive")).toBeFalse();
});

test("TabsContent forceMount={true} mounts inactive panel with hidden attribute and data-state='inactive'", () => {
  const inspector = inspectHtml(
    el(
      Tabs,
      { defaultValue: "tab1" },
      el(TabsList, null,
        el(TabsTrigger, { value: "tab1" }, "Tab 1"),
        el(TabsTrigger, { value: "tab2" }, "Tab 2"),
      ),
      el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
      el(TabsContent, { value: "tab2", forceMount: true }, "Panel 2 Inactive"),
    ),
  );
  expect(inspector.contains("Panel 1 Active")).toBeTrue();
  expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
  expect(inspector.contains('data-state="inactive"')).toBeTrue();
  expect(inspector.contains('hidden=""') || inspector.contains('hidden')).toBeTrue();
});

test("Tabs root forceMount={true} cascades to all child TabsContent panels", () => {
  const inspector = inspectHtml(
    el(
      Tabs,
      { defaultValue: "tab1", forceMount: true },
      el(TabsList, null,
        el(TabsTrigger, { value: "tab1" }, "Tab 1"),
        el(TabsTrigger, { value: "tab2" }, "Tab 2"),
      ),
      el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
      el(TabsContent, { value: "tab2" }, "Panel 2 Inactive"),
    ),
  );
  expect(inspector.contains("Panel 1 Active")).toBeTrue();
  expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
});

test("TabsContent with explicit hidden attribute mounts unselected panel", () => {
  const inspector = inspectHtml(
    el(
      Tabs,
      { defaultValue: "tab1" },
      el(TabsList, null,
        el(TabsTrigger, { value: "tab1" }, "Tab 1"),
        el(TabsTrigger, { value: "tab2" }, "Tab 2"),
      ),
      el(TabsContent, { value: "tab1" }, "Panel 1 Active"),
      el(TabsContent, { value: "tab2", hidden: true }, "Panel 2 Inactive"),
    ),
  );
  expect(inspector.contains("Panel 2 Inactive")).toBeTrue();
});
```

---

## 6. Verification Steps for Worker

1. **Apply the updated code** to `packages/ui/src/components/tabs.tsx`.
2. **Typecheck `@repo/ui`**:
   ```bash
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ```
   (Must exit 0 with zero diagnostics).
3. **Biome Lint Check**:
   ```bash
   ./node_modules/.bin/biome check packages/ui/src/components/tabs.tsx
   ```
   (Must exit 0).
4. **Run Unit & Adversarial Tests**:
   ```bash
   bun test tests/unit/components.test.ts
   bun test tests/adversarial-components-challenge.test.ts
   bun test tests/e2e/challenger-m2-empirical.test.ts
   ```
   (All must pass with 100% success).
5. **Run Full Monorepo E2E Suite**:
   ```bash
   bun tests/e2e/run-all.ts
   ```
   (All 62 tests across Tiers 1–4 must pass).
