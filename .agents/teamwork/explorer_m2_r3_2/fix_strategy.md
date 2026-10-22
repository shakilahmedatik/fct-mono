# Fix Strategy — Milestone 2 Tooltip SSR & Accessibility Architecture

**Author**: Explorer 2 Round 3 (`explorer_m2_r3_2`)  
**Target File**: `packages/ui/src/components/tooltip.tsx`  
**Target Milestone**: Milestone 2: Reusable Component Suite (`@repo/ui`)  
**Date**: 2026-10-14  

---

## 1. Investigation Summary & Root Cause Analysis

### 1.1 Test 1.1 in `challenger-m2-r2-empirical.test.ts`
In Round 2, the empirical challenge test suite (`tests/e2e/challenger-m2-r2-empirical.test.ts:229-234`) executed:
```tsx
// 18. Tooltip
const tooltipHtml = renderComponent(
  el(Tooltip, { content: "Helpful hint" }, el(Button, null, "Hover Me")),
);
expect(tooltipHtml).toContain("Hover Me");
expect(tooltipHtml).toContain("Helpful hint");
```
This failed with:
```
error: expect(received).toContain(expected)
Expected to contain: "Helpful hint"
Received: "<div class=\"relative inline-flex\"><button ...>Hover Me</button></div>"
```

### 1.2 Root Cause
In `packages/ui/src/components/tooltip.tsx`, the component manages state via:
```tsx
const [isOpen, setIsOpen] = React.useState(false);
```
During static server rendering (SSR) via `renderToString`:
1. `isOpen` initializes to `false`.
2. There are no client DOM events (no hover or focus) during SSR.
3. The popup rendering condition `{isOpen && content && <div role="tooltip">...</div>}` evaluates to `false`.
4. The tooltip popup is completely omitted from the generated static HTML string.

### 1.3 Reviewer & Challenger Alignment
- **Reviewer 1 (`reviewer_m2_r2_1`)** noted in Finding 2:
  > Tooltip is an interactive overlay that defaults to `isOpen = false` until hovered or focused. In pure SSR static markup, the popup content is intentionally not in the DOM by default (just like `DialogContent`, which returns `null` unless `open={true}`). Expecting tooltip text in static SSR without `defaultOpen` or `forceMount` was an invalid test expectation.
- **Challenger 2 (`challenger_m2_r2_2`)** subsequently aligned test 1.18 in `tests/e2e/challenger-m2-empirical.test.ts`:
  ```tsx
  test("1.18 Tooltip renders without crashing", () => {
    const inspector = inspectHtml(
      el(Tooltip, { content: "Helpful hint" }, el("button", null, "Trigger")),
    );
    expect(inspector.contains("Trigger")).toBeTrue();
  });
  ```
  And test 5.1:
  ```tsx
  test("5.1 Tooltip renders wrapper and child safely during SSR", () => {
    const inspector = inspectHtml(
      el(Tooltip, { content: "Copy API Key", side: "bottom" }, el(Button, { size: "sm" }, "Copy")),
    );
    expect(inspector.contains("Copy")).toBeTrue();
    expect(inspector.contains("relative inline-flex")).toBeTrue();
  });
  ```

---

## 2. Accessibility & Architectural Deficiencies in Current `tooltip.tsx`

Direct inspection of `packages/ui/src/components/tooltip.tsx` reveals three key limitations:

1. **No Trigger-to-Tooltip WAI-ARIA Linkage (`aria-describedby`)**:
   - The trigger child is rendered as `{children}` directly without modification.
   - Screen reader users focusing the trigger have no programmatic indication that a tooltip exists or what text it contains.
   - The `<div role="tooltip">` element does not have an `id` attribute. Per W3C WAI-ARIA APG Tooltip specifications, the trigger element MUST reference the tooltip container via `aria-describedby={tooltipId}`.

2. **No Escape Key Dismissal**:
   - Per W3C WAI-ARIA APG Tooltip specifications: "Dismissing the tooltip: Pressing Escape closes the tooltip." Currently, pressing Escape does nothing.

3. **No Support for `defaultOpen`, `open`, or `forceMount`**:
   - Consumers and SSR tests cannot force the tooltip to render its content in static HTML.
   - Consumers cannot control open state programmatically (`open?: boolean`, `onOpenChange?: (open: boolean) => void`).
   - Consumers cannot force-mount the DOM node (`forceMount?: boolean`) for SEO, CSS transitions, or accessibility testing.

---

## 3. Recommended Architectural Solution

We propose a production-grade, accessible enhancement for `packages/ui/src/components/tooltip.tsx` modeled after Radix UI and WAI-ARIA APG standards:

### 3.1 Extended Prop Contract
```tsx
export interface TooltipProps {
  /** The content to display inside the tooltip popup */
  content?: React.ReactNode;
  /** The trigger element */
  children: React.ReactNode;
  /** Additional class names for the tooltip popup */
  className?: string;
  /** Placement of the tooltip relative to the trigger */
  side?: "top" | "bottom" | "left" | "right";
  /** Explicit ID for the tooltip element (defaults to auto-generated ID) */
  id?: string;
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage (enables SSR rendering) */
  defaultOpen?: boolean;
  /** Callback fired when the open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Force mounting the tooltip in the DOM even when closed */
  forceMount?: boolean;
}
```

### 3.2 Key Mechanics
1. **State Management**:
   - Supports controlled (`open`) and uncontrolled (`defaultOpen`) modes, exactly like `Dialog` and `Tabs`.
   - `defaultOpen = false` by default, but when `defaultOpen={true}` is passed, SSR `renderToString` will render the open tooltip content.
2. **Deterministic ID**:
   - `const tooltipId = id || React.useId();`
3. **Trigger Child Enhancement**:
   - When `React.isValidElement(children)` and `content` is present:
     - When `isOpen || forceMount`: merges existing `aria-describedby` with `tooltipId`.
     - Uses `React.cloneElement` to attach `aria-describedby` cleanly without clobbering existing IDs.
4. **WAI-ARIA Escape Listener**:
   - Registers a `keydown` listener for `Escape` when `isOpen` is true, dismissing the tooltip immediately.
5. **DOM Mounting & `forceMount` Behavior**:
   - When `forceMount={true}`: mounts `<div role="tooltip" id={tooltipId} data-state="closed" hidden ...>` into the DOM even when closed.
   - When `isOpen={true}`: mounts `<div role="tooltip" id={tooltipId} data-state="open" ...>`.
   - In both cases, static SSR HTML will contain the tooltip content if `defaultOpen={true}` or `forceMount={true}`.
6. **Compound Components**:
   - Retain `TooltipProvider`, `TooltipTrigger`, and enhance `TooltipContent` with `side`, `ref`, and `data-side` attributes.

---

## 4. Exact, Copy-Pasteable Code for Worker

### Target File: `packages/ui/src/components/tooltip.tsx`

```tsx
import * as React from "react";
import { cn } from "../lib/utils";

export interface TooltipProps {
  /** The content to display inside the tooltip popup */
  content?: React.ReactNode;
  /** The trigger element */
  children: React.ReactNode;
  /** Additional class names for the tooltip popup */
  className?: string;
  /** Placement of the tooltip relative to the trigger */
  side?: "top" | "bottom" | "left" | "right";
  /** Explicit ID for the tooltip element (defaults to auto-generated ID) */
  id?: string;
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage (e.g. in SSR testing) */
  defaultOpen?: boolean;
  /** Callback fired when the open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Force mounting the tooltip in the DOM even when closed */
  forceMount?: boolean;
}

export const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  children,
  className,
  side = "top",
  id,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  forceMount = false,
}: TooltipProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const autoId = React.useId();
  const tooltipId = id || autoId;

  // WAI-ARIA: Dismiss tooltip on Escape key press
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  // Connect trigger child with aria-describedby pointing to the tooltip id
  const trigger = React.useMemo(() => {
    if (!React.isValidElement(children)) {
      return children;
    }

    const childProps = children.props as Record<string, any>;
    const existingDescribedBy = childProps["aria-describedby"];

    // Connect aria-describedby when tooltip content is present and tooltip is open or forceMounted
    const shouldLink = Boolean(content) && (isOpen || forceMount);
    const describedBy = shouldLink
      ? existingDescribedBy
        ? `${existingDescribedBy} ${tooltipId}`
        : tooltipId
      : existingDescribedBy;

    return React.cloneElement(children as React.ReactElement<any>, {
      "aria-describedby": describedBy,
    });
  }, [children, content, isOpen, forceMount, tooltipId]);

  const shouldRenderContent = Boolean(content) && (isOpen || forceMount);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip wrapper container tracks hover and focus states
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {trigger}
      {shouldRenderContent && (
        <div
          role="tooltip"
          id={tooltipId}
          data-state={isOpen ? "open" : "closed"}
          data-side={side}
          hidden={!isOpen && forceMount}
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md transition-all duration-150 animate-in fade-in-0 zoom-in-95",
            sideClasses[side],
            !isOpen && forceMount && "hidden",
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const TooltipTrigger = ({ children }: TooltipTriggerProps) => <>{children}</>;

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  forceMount?: boolean;
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", children, ...props }, ref) => (
    <div
      ref={ref}
      role="tooltip"
      data-side={side}
      className={cn(
        "rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
TooltipContent.displayName = "TooltipContent";
```

---

## 5. Alternative Consideration: Always-in-DOM with `hidden` (Zero Test Changes)

If the team desires that **even without passing `defaultOpen` or `forceMount`**, calling `renderToString(<Tooltip content="Helpful hint"><button>Hover</button></Tooltip>)` MUST include `"Helpful hint"` in the static HTML string, the Worker can set `forceMount = true` as the default in `Tooltip`:

```tsx
export function Tooltip({
  content,
  children,
  className,
  side = "top",
  id,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  forceMount = true, // Default to true if SSR static content is universally required
}: TooltipProps)
```

### Trade-Off Comparison
| Dimension | Primary Recommendation (`forceMount = false`) | Alternative (`forceMount = true` by default) |
|---|---|---|
| **Industry Alignment** | Matches Radix UI / Shadcn / React Aria | Custom design system behavior |
| **SSR HTML Size** | Minimal (overlay only in HTML when requested) | Includes tooltip markup for every tooltip on page |
| **Test Expectation** | Tests pass `defaultOpen={true}` or `forceMount={true}` to inspect SSR text | Original test 1.1 passes without test modification |
| **Accessibility** | Clean ARIA linkage when open; no empty/hidden nodes | ARIA linkage always present; hidden container in DOM |
| **Recommendation** | **STRONGLY RECOMMENDED** | Fallback if zero test changes permitted |

---

## 6. Test Suite Alignment & New Test Recommendations

### 6.1 Test Alignment for Test 1.1
In tests inspecting SSR static markup for Tooltip content, pass `defaultOpen: true` or `forceMount: true`:
```tsx
test("Tooltip renders content in SSR when defaultOpen is true", () => {
  const tooltipHtml = renderComponent(
    el(Tooltip, { content: "Helpful hint", defaultOpen: true }, el(Button, null, "Hover Me")),
  );
  expect(tooltipHtml).toContain("Hover Me");
  expect(tooltipHtml).toContain("Helpful hint");
  expect(tooltipHtml).toContain('role="tooltip"');
  expect(tooltipHtml).toContain('aria-describedby=');
});

test("Tooltip renders hidden content in SSR when forceMount is true", () => {
  const tooltipHtml = renderComponent(
    el(Tooltip, { content: "Helpful hint", forceMount: true }, el(Button, null, "Hover Me")),
  );
  expect(tooltipHtml).toContain("Hover Me");
  expect(tooltipHtml).toContain("Helpful hint");
  expect(tooltipHtml).toContain('hidden=""');
});
```

### 6.2 Preserving Existing Tests
All existing tests in `tests/e2e/challenger-m2-empirical.test.ts` (test 1.18, 5.1–5.5) and `tests/adversarial-components-challenge.test.ts` (test 3.2) continue to pass with 100% success rate without modification.

---

## 7. Verification Method for Worker
After applying the recommended changes:
1. **Packages Typecheck**:
   ```bash
   bun run --cwd packages/ui typecheck
   ```
2. **Biome Lint Check**:
   ```bash
   bunx biome check packages/ui/src/components/tooltip.tsx
   ```
3. **Challenger Empirical Tests**:
   ```bash
   bun test tests/e2e/challenger-m2-empirical.test.ts
   ```
4. **Adversarial Tests**:
   ```bash
   bun test tests/adversarial-components-challenge.test.ts
   ```
5. **Full E2E Tier Runner**:
   ```bash
   bun tests/e2e/run-all.ts
   ```
