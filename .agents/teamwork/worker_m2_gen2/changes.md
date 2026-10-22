# Milestone 2 Remediations — Change Log

**Worker**: `worker_m2_gen2`  
**Date**: 2026-10-14  
**Scope**: `@repo/ui` component suite accessibility, responsive layout, and error message remediations

---

## 1. `packages/ui/src/components/dialog.tsx`
- **Focus Trap Implementation**:
  - Implemented `getFocusableElements(container)` querying standard interactive targets (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`) and excluding disabled, aria-disabled, aria-hidden, and negative tabindex.
  - Implemented initial autofocus on modal open: autofocuses first focusable element or modal container surface (`tabIndex={-1}`) if text-only modal. Added 0ms timeout tick for hydration stability.
  - Implemented keyboard focus cycling (`trapFocus` on `window`):
    - `Tab` wraps around from last focusable element to first focusable element.
    - `Shift+Tab` wraps around from first focusable element to last focusable element.
    - Handles edge cases where activeElement is on container or leaked outside modal.
  - Implemented focus restoration on unmount/close: stores `document.activeElement` prior to dialog activation and restores focus to the trigger button when `isOpen` becomes `false` or component unmounts.
  - Memoized context value in `Dialog` and stabilized `DialogContent` focus effect dependencies using `dialogRef`.

---

## 2. `packages/ui/src/components/navbar.tsx`
- **Responsive Breakpoint Synchronization**:
  - Aligned mobile drawer from `sm:hidden` to `md:hidden`, resolving the 640px-767px tablet viewport blackout.
- **Drawer Context & Link Rendering**:
  - Added `inDrawer` boolean property to `NavbarContextValue`.
  - Drawer content is wrapped in `<NavbarContext.Provider value={drawerContext}>` where `inDrawer: true`.
  - In `NavbarNav`, when `inDrawer` is active, switched classes from `"hidden md:flex items-center gap-6"` to `"flex flex-col space-y-3"` and set `aria-label="Mobile navigation"`.
  - In `NavbarBrand`, suppressed duplicate brand rendering inside drawer (`if (navbar?.inDrawer && !showInDrawer) return null`).
  - In `NavbarMobileToggle`, suppressed duplicate toggle button inside drawer (`if (navbar?.inDrawer) return null`).
  - In `NavbarActions`, rendered vertical flex column with top border separator when inside drawer.
  - In `NavbarLink`, added `block py-1.5` touch padding when inside drawer.
  - Prevented nested landmark violations by using `<div>` instead of `<nav>` for the drawer wrapper.

---

## 3. `packages/ui/src/components/switch.tsx`
- **Accessible Name & Label Linkage**:
  - Generated automatic switch ID with `React.useId()`, or consumed explicit `id` prop.
  - Assigned `id={switchId}` to `<button role="switch">`.
  - Linked `<label htmlFor={switchId} id={labelId}>` so clicking the label text natively toggles the switch button.
  - Attached `aria-labelledby` and `aria-describedby` to the `<button role="switch">`.
  - Added `!e.defaultPrevented` check to `handleKeyDown` for Space and Enter, matching `handleClick`.

---

## 4. Form Controls Error Messaging (`input.tsx`, `textarea.tsx`, `select.tsx`)
- **`packages/ui/src/components/input.tsx`**:
  - Checks if `typeof error === "string" && error.trim().length > 0`.
  - Links `<input>` to `<p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">` via `aria-describedby`.
  - Preserves raw `<input>` without outer wrapper when `error` is boolean or absent and icons are not present (preserving DOM shape compatibility).
  - Handles icon adornment wrappers cleanly with error message stacked vertically beneath.
- **`packages/ui/src/components/textarea.tsx`**:
  - Checks for string error message and renders `<p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">`.
  - Connects `<textarea>` to error message via `aria-describedby`.
  - Preserves raw `<textarea>` when error is boolean/absent.
- **`packages/ui/src/components/select.tsx`**:
  - Checks for string error message and wraps `<select>` and `<p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">` in vertical block wrapper.
  - Connects `<select>` to error message via `aria-describedby`.
  - Preserves inline select control without outer wrapper when error is boolean/absent.

---

## 5. `tests/adversarial-components-challenge.test.ts`
- **Aligned Test Assertions**:
  - **Test 1.3**: Asserted that string error message IS rendered into DOM with `role="alert"` and `mt-1.5 text-xs text-destructive`.
  - **Test 1.4**: Asserted that textarea string error message IS rendered into DOM with `role="alert"`.
  - **Test 1.9**: Asserted that switch has `aria-labelledby`, `<label>` with `htmlFor`, and keyboard check for `defaultPrevented`.
  - **Test 2.4**: Inverted audit checks to verify `hasTabIntercept`, `hasFocusCall`, and `hasFocusTrap` are all `toBeTrue()`.
  - **Test 2.8**: Verified `hidden md:flex`, `md:hidden`, and `md:hidden animate-in slide-in-from-top-2` are present, while `sm:hidden` is absent.
  - **Test 2.9**: Verified drawer no longer blindly renders `{children}` without drawer context and that `inDrawer` is active.

---

## 6. Verification Summary
- `packages/ui` typecheck: 0 errors
- Biome check (`packages/ui/src`, `tests/`): 0 errors
- `bun test`: 230 passed, 0 failed (1055 expect calls across 16 files)
- `bun tests/e2e/run-all.ts`: 62/62 passed (100% across Tiers 1-4)
- Apps typecheck (`apps/web`, `apps/console`, `apps/admin`): 0 errors
