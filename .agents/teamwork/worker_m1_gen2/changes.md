# Milestone 1 Remediation Changes Log

**Worker**: `worker_m1_gen2`  
**Milestone**: Milestone 1 (Design System & Theme Foundations — `@repo/ui`)  
**Date**: October 14, 2026  

---

## 1. Token Contrast Calibration (`packages/ui/src/styles.css`)
- **File**: `packages/ui/src/styles.css`
- **Change**: Calibrated `--destructive` in light mode (`:root`) from `0 84.2% 55%` to `0 84.2% 48%`.
- **Rationale**: The previous 55% lightness value produced a contrast ratio of `4.03:1` against `--destructive-foreground` (`0 0% 98%`), violating WCAG 2.1 AA body and button text standards (minimum 4.5:1). Calibrating to 48% lowers relative luminance from `0.1999` to `0.1652`, yielding `4.67:1` against text and `4.88:1` against canvas/card surfaces while preserving the FirstCup red hue (`0`) and saturation (`84.2%`).

---

## 2. Tailwind CSS v4 `@source` Path Resolution (`apps/*/src/app/globals.css`)
- **Files**:
  - `apps/web/src/app/globals.css`
  - `apps/console/src/app/globals.css`
  - `apps/admin/src/app/globals.css`
- **Change**: Corrected `@source "../../../packages/ui/src";` to `@source "../../../../packages/ui/src";`.
- **Rationale**: Application stylesheets are nested 4 levels deep (`apps/<app>/src/app/`). A 3-hop traversal resolved to `apps/packages/ui/src` (non-existent). The 4-hop traversal correctly reaches `/packages/ui/src`, allowing PostCSS and Tailwind CSS v4 to scan UI component source files and emit essential tokens such as `.ring-ring` and `focus-visible:ring-ring`.

---

## 3. ThemeScript Hardening (`packages/ui/src/theme/theme-script.tsx`)
- **File**: `packages/ui/src/theme/theme-script.tsx`
- **Changes**:
  - Isolated `localStorage.getItem(k)` inside a dedicated inner `try / catch` block so storage `SecurityError` (incognito/private browsing, cross-origin iframes, blocked cookies) defaults safely to `null` and allows subsequent `window.matchMedia` evaluation and DOM class manipulation to proceed without aborting.
  - Aligned theme validation to `(s === 'light' || s === 'dark' || s === 'system') ? s : d`, ensuring corrupt values like `"undefined"`, `"null"`, or `"{}"` fall back to `defaultTheme` before first paint, preventing pre-to-post hydration theme flash (FOUC).
  - Sanitized `<` characters to `\u003c` in `JSON.stringify` serialization to prevent HTML `<script>` tag closing breakout vulnerabilities.

---

## 4. ThemeProvider & useTheme SSR / Hydration Symmetry (`packages/ui/src/theme/`)
- **Files**:
  - `packages/ui/src/theme/theme-provider.tsx`
  - `packages/ui/src/theme/use-theme.ts`
- **Changes**:
  - Added `"use client";` to `use-theme.ts` for React Server Component (RSC) boundary compatibility, resolving `React.createContext` undefined errors in Next.js.
  - Added `mounted: boolean` to `ThemeContextValue` and `ThemeProvider` to provide consumers with mounting state tracking.
  - Initialized `theme` state with safe validation guarding against `SecurityError`, maintaining consistency during SSR and client mounts.

---

## 5. Application Root Layout Integration (`apps/*/src/app/layout.tsx`)
- **Files**:
  - `apps/web/src/app/layout.tsx`
  - `apps/console/src/app/layout.tsx`
  - `apps/admin/src/app/layout.tsx`
- **Changes**:
  - Added `suppressHydrationWarning` to `<html lang="en">` across all three applications as required by `PROJECT.md` Section 1.
  - Added `<ThemeScript defaultTheme="system" />` inside `<head>` to ensure pre-first-paint theme resolution and prevent FOUC.
  - Wrapped root layout application contents with `<ThemeProvider defaultTheme="system">`.

---

## 6. ThemeToggle WAI-ARIA Keyboard Navigation & Semantics (`packages/ui/src/theme/theme-toggle.tsx`)
- **File**: `packages/ui/src/theme/theme-toggle.tsx`
- **Changes**:
  - Implemented complete WAI-ARIA APG Menu Button directional keyboard navigation: `ArrowDown` and `ArrowUp` to open and navigate items with wrapping, `Home` to jump to first option, `End` to jump to last option, `Escape` to close and return focus to trigger, and `Tab` to dismiss without intercepting native tab order.
  - Updated dropdown items to use `role="menuitemradio"` with `aria-checked={isSelected}`, roving `tabIndex` (`0` on active, `-1` on inactive), and container `role="menu"` with `aria-orientation="vertical"`.
  - Added focus ring outline styling: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:bg-muted/70`.

---

## 7. Test Suite Reconciliation & Harmonization
- **Files**:
  - `tests/e2e/tier1-feature-coverage.test.ts`: Aligned `@source` expectation to 4 parent hops (`../../../../packages/ui/src`); added light mode destructive button text WCAG AA contrast check (`4.67:1 >= 4.5:1`).
  - `tests/unit/theme.test.ts`: Added unit test verifying WAI-ARIA attributes (`role="menuitemradio"`, `aria-checked`, `role="menu"`), keyboard navigation keys, and focus-visible rings in `ThemeToggle`.
  - `tests/adversarial-theme-challenge.test.ts`: Inverted expectations from bug assertions to verification assertions for SecurityError fallback, corrupt storage fallback, Zero-FOUC pre/post hydration match, XSS breakout escaping, and calibrated destructive contrast ratio (`4.67:1`).
  - `tests/e2e/challenger2-empirical.test.ts`: Inverted assertions in tests 1.3, 1.4, 2.2, 2.3, 2.4, 3.2, 3.4 to assert compliant behavior (`toBeTrue()`).
- **File**: `PROJECT.md`
  - Updated architectural note in Section 1 to document the 4-hop `@source` path.
