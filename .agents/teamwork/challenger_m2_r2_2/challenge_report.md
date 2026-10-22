# Challenge Report — Milestone 2 Remediation Review (Round 2)

**Evaluator**: Challenger 2 Round 2 (`challenger_m2_r2_2`)  
**Target Milestone**: Milestone 2: Reusable Component Suite (`@repo/ui`) Remediation  
**Date**: 2026-10-14  

---

## Challenge Summary

**Overall risk assessment**: LOW  
**Verdict**: **APPROVE**  

All four remediations performed by Worker M2 Gen 2 have been empirically verified and stress-tested:
1. **Dialog Focus Trapping & Restoration**: Genuine native focus trapping with autofocus, circular Tab and Shift+Tab cycling, and restoration of focus to the triggering element upon close.
2. **Navbar Responsive Breakpoint Synchronization**: Resolved the 640px–767px blackout by synchronizing the mobile drawer to `md:hidden`, aligning with `NavbarNav` (`hidden md:flex`) and `NavbarMobileToggle` (`inline-flex md:hidden`), and utilizing `inDrawer` context to prevent duplicate brand/toggle elements and eliminate nested landmark issues.
3. **Switch Accessibility**: Connected `<label htmlFor>` to the switch ID, added `aria-labelledby` and `aria-describedby`, and added `!e.defaultPrevented` validation to keydown event handlers.
4. **Form Controls Error Handling**: `Input`, `Textarea`, and `Select` render accessible `<p role="alert">` textual error messages connected via `aria-describedby` when a string error is provided, while maintaining backward-compatible visual styling without empty paragraphs when a boolean error is supplied.

---

## Challenges

### [Low / Non-blocking] Challenge 1: JSX Prop Spreading Order in Form Controls

- **Assumption challenged**: Providing an existing `aria-describedby` alongside an `error` string properly merges both IDs into `aria-describedby` on the underlying input element.
- **Attack scenario**: When a consumer renders:
  ```tsx
  <Input id="user" aria-describedby="user-hint" error="Username taken" />
  ```
  The component code calculates:
  ```tsx
  aria-describedby={
    props["aria-describedby"]
      ? errorId
        ? `${props["aria-describedby"]} ${errorId}`
        : props["aria-describedby"]
      : errorId
  }
  {...props}
  ```
  Because `{...props}` is spread *after* `aria-describedby={...}`, React uses the value from `{...props}`, which clobbers the merged string back to `"user-hint"`.
- **Blast radius**: Low. In standard usage where consumers pass `error="message"` without a preexisting `aria-describedby`, `aria-describedby` is undefined in `props`, so the computed `errorId` linkage remains intact and connects to `<p id="...-error" role="alert">`.
- **Mitigation**: In a future polish iteration, destructure `aria-describedby` in component parameters or place `{...props}` before computed accessibility attributes.

---

## Stress Test Results

| # | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---|-----------------|-------------------|-----------------|--------|
| 1 | Pure SSR rendering across all 18 components in `@repo/ui` with zero DOM globals (`window = undefined`, `document = undefined`) | All components render static HTML without runtime exceptions or leaks | 18/18 components render cleanly without error | **PASS** |
| 2 | Dialog focus trap Tab cycling with active elements | Tab moves from last element to first element; Shift+Tab moves from first element to last | Focus circularly confined; Tab and Shift+Tab wrap properly | **PASS** |
| 3 | Dialog with 0 focusable elements (text-only modal) | Falls back safely to modal container (`tabIndex={-1}`) without null pointer crashes | Container receives focus fallback cleanly | **PASS** |
| 4 | Dialog trigger focus restoration upon modal close | Focus returns to trigger element that initiated open; validates `document.contains()` | Trigger element receives focus; detached nodes guarded | **PASS** |
| 5 | Navbar mobile drawer breakpoint alignment | Drawer uses `md:hidden`, matching `hidden md:flex` nav and `inline-flex md:hidden` toggle | Zero blackout across 640px-767px viewports | **PASS** |
| 6 | Navbar drawer landmark and component hygiene | `NavbarBrand` and `NavbarMobileToggle` suppress duplicates in drawer; drawer wrapper is `<div>` | No duplicate landmarks or controls inside mobile drawer | **PASS** |
| 7 | Switch accessibility linkage | `<label htmlFor={id} id={labelId}>` rendered, button has matching `aria-labelledby` | Screen reader label properly associated; click on label toggles switch | **PASS** |
| 8 | Switch keydown event guard | Does not toggle when `e.defaultPrevented` is true | Keydown listener guards with `!e.defaultPrevented` | **PASS** |
| 9 | Form control string vs boolean error contract | String error renders `<p role="alert">`; boolean error applies styling without empty paragraph | Input, Textarea, and Select adhere to identical contract | **PASS** |
| 10 | Full application composition with all 18 components | Complex dashboard layout with Navbar, Sidebar, StatCards, Table, Tabs, Form Controls, Alert, Dialog, Tooltip, EmptyState, Skeleton renders without conflict | Full static markup rendered cleanly without DOM collisions | **PASS** |
| 11 | Full E2E Test Suite (`bun tests/e2e/run-all.ts`) | 100% pass across Tiers 1-4 (Features F01 through F34) | 62 passed, 0 failed (100% pass in 912ms) | **PASS** |
| 12 | Challenger 2 Empirical Test Suite (`bun test tests/e2e/challenger-m2-empirical.test.ts`) | Comprehensive empirical coverage across 10 areas | 50 passed, 0 failed (177 assertions in 248ms) | **PASS** |
| 13 | Monorepo Test Suite (`bun test`) | All repository test files pass | 234 passed, 0 failed across 16 files (in 1.43s) | **PASS** |
| 14 | Monorepo Application Typechecks (`apps/web`, `apps/console`, `apps/admin`) | `tsc --noEmit` exits with 0 across all apps | Zero TypeScript diagnostics reported | **PASS** |
| 15 | `@repo/ui` Typecheck | `tsc --noEmit -p packages/ui/tsconfig.json` exits with 0 | Zero TypeScript diagnostics reported | **PASS** |
| 16 | Biome Code Quality & Format Check | `biome check` exits with 0 | Checked 27 files with 0 errors | **PASS** |

---

## Unchallenged Areas

- **Headless Browser Visual Rendering**: Pixel-level rasterization and visual screenshot regressions were not verified via headless Chromium/Playwright; component verification was performed via React server rendering, DOM simulation, and HTML attribute inspection.
