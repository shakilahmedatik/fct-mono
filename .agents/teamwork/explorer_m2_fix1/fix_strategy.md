# Fix Strategy: Dependency-Free Dialog Focus Trap Remediation

**Author**: Explorer 1 (`explorer_m2_fix1`)  
**Target File**: `packages/ui/src/components/dialog.tsx`  
**Milestone**: Milestone 2 Remediation  
**Status**: Ready for Worker Implementation  

---

## 1. Executive Summary & Problem Analysis

In Milestone 2, Worker M2 reported that `packages/ui/src/components/dialog.tsx` included a focus trap along with Escape dismissal and backdrop blur. However, Challenger 1's empirical audit discovered that `DialogContent` only implemented Escape keydown dismissal (`handleKeyDown` on `window`), with **zero** focus trapping logic:
1. No focus storage of `document.activeElement` prior to dialog activation.
2. No autofocus onto the first focusable element or modal container upon mounting.
3. No interception of `Tab` or `Shift+Tab` keyboard events to prevent focus leakage outside the modal.
4. No focus restoration to the opening trigger when the dialog closes.

This creates severe accessibility (WCAG 2.1 AA Criterion 2.1.2: No Keyboard Trap / 2.4.3: Focus Order) and UX violations: keyboard-only users who press Tab while inside the modal easily tab through elements on the background page behind the overlay.

---

## 2. Technical Requirements & Architecture

The remediation must be completely **dependency-free** (no Radix UI, no `focus-trap`, no `react-focus-lock`), relying solely on React built-in hooks and standard WAI-ARIA modal guidelines.

### R1. Pre-Open Focus Tracking & Initial Focus
- **Capture**: When `isOpen` transitions to `true`, store `document.activeElement` in a `previousActiveElement` ref.
- **Autofocus**:
  - Check if an element inside `contentRef.current` already holds focus (e.g., via React's `autoFocus`). If so, preserve it.
  - Query all focusable elements inside the modal container.
  - If focusable children exist, immediately focus `focusable[0]`.
  - If no focusable children exist (e.g. text-only modal with close button hidden), fallback focus to the modal surface `contentRef.current` itself (`tabIndex={-1}`).
  - Execute immediately and schedule a 0ms `setTimeout` tick to ensure layout stability across SSR and hydration.

### R2. Tab & Shift+Tab Focus Cycling
- **Selector**: Target standard focusable elements matching:
  `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`
- **Exclusion Filters**:
  - `el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true"`
  - `el.getAttribute("aria-hidden") === "true"`
  - `el.getAttribute("tabindex") === "-1"`
- **Cycling Algorithm**:
  - If `focusable.length === 0`: prevent default and ensure container remains focused.
  - When `e.key === "Tab"` and `e.shiftKey` (backward):
    - If `activeEl === firstElement` (or focus is on container or leaked outside), call `e.preventDefault()` and `lastElement.focus()`.
  - When `e.key === "Tab"` and `!e.shiftKey` (forward):
    - If `activeEl === lastElement` (or focus is on container or leaked outside), call `e.preventDefault()` and `firstElement.focus()`.
  - Intermediate tabs: allow native browser focus progression without calling `preventDefault()`.

### R3. Focus Restoration on Close
- On modal unmount or when `isOpen` becomes `false`, the cleanup phase of `useEffect` runs:
  - Clear the initial focus timer.
  - Remove the `window` keydown event listener.
  - If `previousActiveElement.current` is still connected to the DOM (`document.contains(...)`), invoke `.focus()` to return focus to the trigger button that opened the dialog.
  - Reset `previousActiveElement.current = null`.

### R4. Context Memoization & Component Stability
- In `Dialog`, memoize `contextValue = React.useMemo(() => ({ open, setOpen }), [open, setOpen])`.
- In `DialogContent`, store `dialog` in `dialogRef = React.useRef(dialog)` and make the focus effect depend only on `[isOpen]`. This prevents the focus trap from re-running and stealing user focus while typing in an input when parent components re-render.

---

## 3. Exact Code Recommendations for Worker

Below is the complete, drop-in replacement for `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src/components/dialog.tsx`.

```tsx
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

export interface DialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

export function useDialog() {
  const context = React.useContext(DialogContext);
  return context;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const dialog = useDialog();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={dialog?.open}
        onClick={(e) => {
          onClick?.(e);
          dialog?.setOpen(true);
        }}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DialogTrigger.displayName = "DialogTrigger";

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  hideCloseButton?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return elements.filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return false;
    }
    if (el.getAttribute("aria-hidden") === "true") {
      return false;
    }
    if (el.getAttribute("tabindex") === "-1") {
      return false;
    }
    return true;
  });
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideCloseButton = false, ...props }, ref) => {
    const dialog = useDialog();
    const isOpen = dialog ? dialog.open : true;
    const dialogRef = React.useRef(dialog);
    dialogRef.current = dialog;

    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    // Merge forwarded ref with internal contentRef
    const setContentRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    // Focus trap and focus restoration lifecycle
    React.useEffect(() => {
      if (!isOpen) return;

      // 1. Store currently focused element (the trigger) before moving focus into dialog
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        previousActiveElement.current = document.activeElement;
      }

      // 2. Initial focus: focus first focusable element or container
      const focusInitial = () => {
        if (!contentRef.current) return;
        // If an element inside the dialog is already focused (e.g. via autoFocus), preserve it
        if (
          document.activeElement &&
          contentRef.current.contains(document.activeElement) &&
          document.activeElement !== contentRef.current
        ) {
          return;
        }
        const focusable = getFocusableElements(contentRef.current);
        if (focusable.length > 0) {
          focusable[0]?.focus();
        } else {
          contentRef.current.focus();
        }
      };

      focusInitial();
      const focusTimer = setTimeout(focusInitial, 0);

      // 3. Focus trap: cycle Tab and Shift+Tab within focusable elements, handle Escape
      const trapFocus = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          dialogRef.current?.setOpen(false);
          return;
        }

        if (e.key === "Tab") {
          if (!contentRef.current) return;
          const focusable = getFocusableElements(contentRef.current);

          if (focusable.length === 0) {
            e.preventDefault();
            contentRef.current.focus();
            return;
          }

          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];
          const activeEl = document.activeElement;

          if (e.shiftKey) {
            if (
              activeEl === firstElement ||
              !contentRef.current.contains(activeEl) ||
              activeEl === contentRef.current
            ) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (
              activeEl === lastElement ||
              !contentRef.current.contains(activeEl) ||
              activeEl === contentRef.current
            ) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", trapFocus);

      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener("keydown", trapFocus);
        // Restore focus to the trigger on close
        const elementToRestore = previousActiveElement.current;
        if (
          elementToRestore &&
          typeof elementToRestore.focus === "function" &&
          document.contains(elementToRestore)
        ) {
          elementToRestore.focus();
        }
        previousActiveElement.current = null;
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={() => dialog?.setOpen(false)}
        />
        {/* Modal Surface */}
        <div
          ref={setContentRef}
          tabIndex={-1}
          className={cn(
            "relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl transition-all duration-200 outline-none",
            className,
          )}
          {...props}
        >
          {children}
          {!hideCloseButton && dialog && (
            <button
              type="button"
              onClick={() => dialog.setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground mt-2", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const dialog = useDialog();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        dialog?.setOpen(false);
      }}
      className={className}
      {...props}
    />
  );
});
DialogClose.displayName = "DialogClose";
```

---

## 4. Test Alignment Note (`tests/adversarial-components-challenge.test.ts`)

In `tests/adversarial-components-challenge.test.ts` (lines 463-503), Challenger 1 wrote test 2.4 as an empirical assertion verifying that the focus trap was missing:
```ts
    test("2.4 [CRITICAL EMPIRICAL AUDIT] Dialog completely lacks Focus Trap implementation", () => {
      ...
      // EMPIRICAL VERDICT: Focus trap is COMPLETELY ABSENT from dialog.tsx!
      expect(hasTabIntercept).toBeFalse();
      expect(hasFocusCall).toBeFalse();
      expect(hasFocusTrap).toBeFalse();
    });
```

When Worker M2 implements the focus trap:
- `hasTabIntercept` becomes `true` (intercepts `"Tab"`).
- `hasFocusCall` becomes `true` (calls `.focus()`).
- `hasFocusTrap` becomes `true` (uses `trapFocus` and `document.activeElement`).

**Action for Worker / Challenger**:
Update test 2.4 in `tests/adversarial-components-challenge.test.ts` to assert that the focus trap IS present and functioning:
```ts
    test("2.4 [VERIFIED] Dialog focus trap implementation with Tab cycling and focus restore", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const dialogCode = fs.readFileSync(
        path.resolve(__dirname, "../packages/ui/src/components/dialog.tsx"),
        "utf8",
      );

      const hasTabIntercept =
        dialogCode.includes('"Tab"') ||
        dialogCode.includes("'Tab'") ||
        dialogCode.includes("keyCode === 9");

      const hasFocusCall = dialogCode.includes(".focus()");

      const hasFocusTrap =
        dialogCode.includes("focusTrap") ||
        dialogCode.includes("trapFocus") ||
        dialogCode.includes("activeElement");

      expect(hasTabIntercept).toBeTrue();
      expect(hasFocusCall).toBeTrue();
      expect(hasFocusTrap).toBeTrue();
    });
```

---

## 5. Verification Checklist for Worker

1. **Syntax & Style Validation**:
   ```bash
   ./node_modules/.bin/biome check packages/ui/src/components/dialog.tsx
   ```
2. **Typecheck**:
   ```bash
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ```
3. **Unit & Adversarial Tests**:
   ```bash
   bun test tests/unit/components.test.ts
   bun test tests/adversarial-components-challenge.test.ts
   bun test tests/e2e/challenger-m2-empirical.test.ts
   ```
4. **Behavioral Invariants**:
   - `Escape` dismisses the dialog.
   - `Tab` wraps from last focusable element back to first focusable element.
   - `Shift+Tab` wraps from first focusable element back to last focusable element.
   - Trigger receives focus back when modal closes.
   - Controlled and uncontrolled dialog usage work identically.
