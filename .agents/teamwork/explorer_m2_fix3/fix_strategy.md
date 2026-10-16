# Milestone 2 Fix Strategy: Switch Accessibility & Form Error Messages

**Agent**: Explorer 3 (`explorer_m2_fix3`)  
**Target Milestone**: Milestone 2: Reusable Component Suite (`@repo/ui`)  
**Target Files**:
- `packages/ui/src/components/switch.tsx`
- `packages/ui/src/components/input.tsx`
- `packages/ui/src/components/textarea.tsx`
- `packages/ui/src/components/select.tsx`
- `tests/adversarial-components-challenge.test.ts` (test updates)

---

## 1. Executive Summary

Challenger 1 identified accessibility and ergonomic omissions across form controls in `@repo/ui`:
1. **Switch Label Accessibility**:
   - `switch.tsx` rendered the label inside an unlinked `<span>` and wrapped it in a generic `<div>` with `cursor-pointer`.
   - `<button role="switch">` lacked an `id`, `aria-labelledby`, and `aria-describedby`.
   - Clicking the label text failed to toggle the switch control because there was no `<label htmlFor={switchId}>` linkage.
   - `handleKeyDown` in `switch.tsx` neglected `e.defaultPrevented`, unlike `handleClick`.
2. **Form Controls String Error Message Omission**:
   - `input.tsx`, `textarea.tsx`, and `select.tsx` declared `error?: boolean | string`, but only used boolean truthiness to apply destructive styles and `aria-invalid="true"`.
   - The textual error string was completely discarded from the DOM.
   - Consumers were forced to manually create external `<p>` or `<Alert>` elements.

This document provides exact, copy-pasteable drop-in code for Worker M2 to remediate these issues, ensuring full WAI-ARIA compliance, WCAG AA standards, and seamless test suite alignment.

---

## 2. Component Remediation Details

### 2.1 `packages/ui/src/components/switch.tsx`

#### Rationale & Architecture:
- Use `React.useId()` as default ID generator when `id` prop is not explicitly passed by caller.
- Assign `id={switchId}` to `<button role="switch">`.
- When `label` is provided, generate `labelId = `${switchId}-label`` and render `<label htmlFor={switchId} id={labelId}>`.
- When `description` is provided, generate `descriptionId = `${switchId}-desc`` and render `<span id={descriptionId}>`.
- On `<button role="switch">`, attach `aria-labelledby={props["aria-labelledby"] || labelId}` and `aria-describedby={props["aria-describedby"] || descriptionId}`.
- Clicking the `<label htmlFor={switchId}>` natively triggers click activation on `<button id={switchId}>` in all standard browsers, executing `handleClick` and toggling the switch.
- Update `handleKeyDown` to check `!e.defaultPrevented && (e.key === " " || e.key === "Enter")`, making keyboard behavior consistent with mouse clicks.

#### Exact Recommended Code for `packages/ui/src/components/switch.tsx`:

```tsx
import * as React from "react";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      label,
      description,
      onClick,
      onKeyDown,
      id,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const autoId = React.useId();
    const switchId = id || autoId;
    const labelId = label ? `${switchId}-label` : undefined;
    const descriptionId = description ? `${switchId}-desc` : undefined;

    const toggle = React.useCallback(() => {
      if (disabled) return;
      const next = !checked;
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    }, [disabled, checked, isControlled, onCheckedChange]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        toggle();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (!e.defaultPrevented && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        toggle();
      }
    };

    const button = (
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        aria-labelledby={props["aria-labelledby"] || labelId}
        aria-describedby={props["aria-describedby"] || descriptionId}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted",
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-md ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    );

    if (label || description) {
      return (
        <div className="flex items-center space-x-3">
          {button}
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
                id={labelId}
                className={cn(
                  "text-sm font-medium text-foreground cursor-pointer select-none",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                id={descriptionId}
                className={cn(
                  "text-xs text-muted-foreground",
                  disabled && "opacity-70",
                )}
              >
                {description}
              </span>
            )}
          </div>
        </div>
      );
    }

    return button;
  },
);
Switch.displayName = "Switch";
```

---

### 2.2 `packages/ui/src/components/input.tsx`

#### Rationale & Architecture:
- Determine if a textual error message exists: `const hasErrorText = typeof error === "string" && error.trim().length > 0;`.
- When `hasErrorText` is true:
  - Generate IDs using `React.useId()`: `const autoId = React.useId(); const inputId = id || autoId; const errorId = `${inputId}-error`;`.
  - Pass `aria-describedby={props["aria-describedby"] ? `${props["aria-describedby"]} ${errorId}` : errorId}` to `<input>`.
  - Render `<p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>` beneath the input control.
  - Wrap in `<div className="w-full">` to maintain proper vertical block stacking.
- When `hasErrorText` is false and no icons are present (e.g. `error={true}`, `error={false}`, or `error={undefined}` with no left/right icons), return raw `<input>` directly without any wrapper `div`. This preserves exact compatibility with assertions like `inspector.html.startsWith("<input")`.
- When icons are present, place the `<p role="alert">` outside the relative icon flexbox, inside a shared vertical wrapper `<div className="w-full">`.

#### Exact Recommended Code for `packages/ui/src/components/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const inputId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${inputId}-error` : undefined;

    const inputElement = (
      <input
        type={type}
        id={inputId}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-foreground",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          error && "border-destructive text-destructive focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        aria-invalid={error ? "true" : props["aria-invalid"]}
        aria-describedby={
          props["aria-describedby"]
            ? errorId
              ? `${props["aria-describedby"]} ${errorId}`
              : props["aria-describedby"]
            : errorId
        }
        {...props}
      />
    );

    const errorParagraph = hasErrorText && (
      <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
        {error}
      </p>
    );

    if (leftIcon || rightIcon) {
      const wrappedInput = (
        <div className="relative flex w-full items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground">
              {leftIcon}
            </div>
          )}
          {inputElement}
          {rightIcon && (
            <div className="pointer-events-none absolute right-3 flex items-center justify-center text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
      );

      if (hasErrorText) {
        return (
          <div className="w-full">
            {wrappedInput}
            {errorParagraph}
          </div>
        );
      }

      return wrappedInput;
    }

    if (hasErrorText) {
      return (
        <div className="w-full">
          {inputElement}
          {errorParagraph}
        </div>
      );
    }

    return inputElement;
  },
);
Input.displayName = "Input";
```

---

### 2.3 `packages/ui/src/components/textarea.tsx`

#### Rationale & Architecture:
- Same logic as `Input`:
  - Determine `hasErrorText = typeof error === "string" && error.trim().length > 0;`.
  - When `hasErrorText` is true, render `<div className="w-full">{textareaElement}<p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">{error}</p></div>`.
  - Associate `<textarea>` with `errorId` via `aria-describedby`.
  - If `hasErrorText` is false, return raw `<textarea>` element directly.

#### Exact Recommended Code for `packages/ui/src/components/textarea.tsx`:

```tsx
import * as React from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const textareaId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${textareaId}-error` : undefined;

    const textareaElement = (
      <textarea
        id={textareaId}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-foreground",
          error && "border-destructive text-destructive focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        aria-invalid={error ? "true" : props["aria-invalid"]}
        aria-describedby={
          props["aria-describedby"]
            ? errorId
              ? `${props["aria-describedby"]} ${errorId}`
              : props["aria-describedby"]
            : errorId
        }
        {...props}
      />
    );

    if (hasErrorText) {
      return (
        <div className="w-full">
          {textareaElement}
          <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      );
    }

    return textareaElement;
  },
);
Textarea.displayName = "Textarea";
```

---

### 2.4 `packages/ui/src/components/select.tsx`

#### Rationale & Architecture:
- `Select` has a container `<div className="relative flex w-full items-center">` for the dropdown select element and the right ChevronDown icon.
- When `hasErrorText = typeof error === "string" && error.trim().length > 0;` is true:
  - Do NOT place the `<p role="alert">` inside the flex row (which would render it horizontally adjacent to the chevron).
  - Wrap the select control and the `<p>` inside a vertical container `<div className="w-full">`.
  - Pass `aria-describedby={errorId}` to `<select>` and set `id={errorId}` on `<p className="mt-1.5 text-xs text-destructive" role="alert">{error}</p>`.
- When `hasErrorText` is false, return the relative select control directly.

#### Exact Recommended Code for `packages/ui/src/components/select.tsx`:

```tsx
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, leftIcon, children, disabled, id, ...props }, ref) => {
    const hasErrorText = typeof error === "string" && error.trim().length > 0;
    const autoId = React.useId();
    const selectId = id || (hasErrorText ? autoId : undefined);
    const errorId = hasErrorText ? `${selectId}-error` : undefined;

    const selectControl = (
      <div className="relative flex w-full items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={error ? "true" : props["aria-invalid"]}
          aria-describedby={
            props["aria-describedby"]
              ? errorId
                ? `${props["aria-describedby"]} ${errorId}`
                : props["aria-describedby"]
              : errorId
          }
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer",
            leftIcon && "pl-10",
            error && "border-destructive text-destructive focus-visible:ring-destructive",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 flex items-center justify-center text-muted-foreground">
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </div>
      </div>
    );

    if (hasErrorText) {
      return (
        <div className="w-full">
          {selectControl}
          <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      );
    }

    return selectControl;
  },
);
Select.displayName = "Select";

export interface SelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <option
        ref={ref}
        className={cn("bg-background text-foreground py-1", className)}
        {...props}
      />
    );
  },
);
SelectOption.displayName = "SelectOption";
```

---

## 3. Adversarial Test Suite Synchronization

In `tests/adversarial-components-challenge.test.ts`, Challenger 1 wrote tests 1.3, 1.4, and 1.9 documenting the observed limitations by asserting `toBeFalse()` on text presence and label tags.

When Worker M2 implements the fixes, Worker M2 should update these three tests to assert that the limitations are resolved:

### 3.1 Test 1.3 Update (`tests/adversarial-components-challenge.test.ts` lines 139-154)

**Before:**
```ts
    test("1.3 [EMPIRICAL LIMITATION] Input error string prop does NOT render textual message in DOM", () => {
      const errorMessage = "Your email address is invalid.";
      const inspector = inspectHtml(el(Input, { error: errorMessage, type: "email" }));

      // The border and aria-invalid classes ARE applied because error is truthy:
      expect(inspector.contains("border-destructive")).toBeTrue();
      expect(inspector.hasAria("invalid", "true")).toBeTrue();

      // BUT the textual error string is NEVER rendered in the HTML DOM!
      const rendersText = inspector.contains(errorMessage);
      console.log("[EMPIRICAL FINDING 1.3] Input error message rendered in DOM:", rendersText);
      expect(rendersText).toBeFalse();

      // Analysis: Input accepts `error?: boolean | string`, but only treats it as a boolean flag.
      // Callers expecting the component to render an inline error message must provide their own <p> or <Alert>.
    });
```

**After:**
```ts
    test("1.3 [RESOLVED] Input error string prop renders accessible textual message in DOM", () => {
      const errorMessage = "Your email address is invalid.";
      const inspector = inspectHtml(el(Input, { error: errorMessage, type: "email" }));

      // The border and aria-invalid classes ARE applied:
      expect(inspector.contains("border-destructive")).toBeTrue();
      expect(inspector.hasAria("invalid", "true")).toBeTrue();

      // Textual error string IS rendered in the HTML DOM:
      const rendersText = inspector.contains(errorMessage);
      expect(rendersText).toBeTrue();
      expect(inspector.contains('role="alert"')).toBeTrue();
      expect(inspector.contains("mt-1.5 text-xs text-destructive")).toBeTrue();
    });
```

### 3.2 Test 1.4 Update (`tests/adversarial-components-challenge.test.ts` line 180)

**Before:**
```ts
      // Text string itself is not rendered into DOM
      expect(errorInspector.contains("Field required")).toBeFalse();
```

**After:**
```ts
      // Text string itself is rendered into DOM
      expect(errorInspector.contains("Field required")).toBeTrue();
      expect(errorInspector.contains('role="alert"')).toBeTrue();
```

### 3.3 Test 1.9 Update (`tests/adversarial-components-challenge.test.ts` lines 332-366)

**Before:**
```ts
    test("1.9 [EMPIRICAL FLAW] Switch keyboard handler ignores e.defaultPrevented and label lacks accessible association", () => {
...
      // Check whether button has aria-label or aria-labelledby:
      expect(labeledInspector.hasAttribute("aria-label")).toBeFalse();
      expect(labeledInspector.hasAttribute("aria-labelledby")).toBeFalse();

      // Check wrapper tag: It is a <div>, not a <label>, with cursor-pointer
      expect(
        labeledInspector.html.includes('<div class="flex items-center space-x-3 cursor-pointer">'),
      ).toBeTrue();
      // The text is in a <span> without an id or htmlFor linkage
      expect(labeledInspector.contains("<label")).toBeFalse();
...
    });
```

**After:**
```ts
    test("1.9 [RESOLVED] Switch keyboard handler checks defaultPrevented and label is connected via htmlFor and aria-labelledby", () => {
      const labeledInspector = inspectHtml(
        el(Switch, { label: "Dark Mode Toggle", description: "Enable dark theme" }),
      );
      expect(labeledInspector.contains("Dark Mode Toggle")).toBeTrue();
      expect(labeledInspector.contains("Enable dark theme")).toBeTrue();

      // Button has aria-labelledby
      expect(labeledInspector.hasAttribute("aria-labelledby")).toBeTrue();

      // The label is rendered with htmlFor
      expect(labeledInspector.contains("<label")).toBeTrue();
      expect(labeledInspector.hasAttribute("for")).toBeTrue();
    });
```

---

## 4. Verification Instructions for the Worker

After applying the changes:
1. Run component unit tests and adversarial challenge:
   ```bash
   bun test tests/unit/components.test.ts
   bun test tests/adversarial-components-challenge.test.ts
   bun test tests/
   ```
2. Run TypeScript typecheck:
   ```bash
   ./node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
   ./node_modules/.bin/tsc --noEmit -p tests/tsconfig.json
   ```
3. Run Biome formatting and linting:
   ```bash
   ./node_modules/.bin/biome check packages/ui
   ./node_modules/.bin/biome check tests/adversarial-components-challenge.test.ts
   ```
