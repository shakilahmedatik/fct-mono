# Forensic Audit Report: Milestone 1 — Design System & Theme Foundations (`@repo/ui`)

**Auditor**: `auditor_m1` (Forensic Auditor & Adversarial Reviewer)  
**Parent Orchestrator**: `2d94057c-60a1-4b0c-9f22-cfd82486a9ea`  
**Date**: October 14, 2026  
**Active Profile**: General Project  
**Integrity Mode**: Development (derived from `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN** (No Integrity Violations Detected)  
**Quality Findings**: 5 Status Color Token Contrast Deficiencies Identified (Detailed below for Milestone 2 remediation)

---

## 1. Executive Summary

A comprehensive forensic integrity audit was conducted on Milestone 1: Design System & Theme Foundations (`@repo/ui`). The audit independently evaluated:
1. Source files: `packages/ui/src/styles.css`, `packages/ui/src/theme/theme-provider.tsx`, `packages/ui/src/theme/theme-script.tsx`, `packages/ui/src/theme/theme-toggle.tsx`, `packages/ui/src/theme/use-theme.ts`, `packages/ui/src/index.ts`.
2. Consuming application stylesheets: `apps/web/src/app/globals.css`, `apps/console/src/app/globals.css`, `apps/admin/src/app/globals.css`.
3. Test suites: `tests/unit/theme.test.ts`, `tests/e2e/tier1-feature-coverage.test.ts`.

### Integrity Summary Table
| Prohibited Pattern | Detection Scope | Result | Status |
|--------------------|-----------------|--------|--------|
| **Hardcoded Test Outputs** | String mocks, fixed returns, bypass flags | None found in source or tests | ✅ PASS |
| **Facade Implementations** | Dummy providers, empty event listeners | Real DOM mutation, storage & mediaQuery handlers verified | ✅ PASS |
| **Fabricated Verification Outputs** | Pre-populated `.log` or attestation artifacts | Clean workspace, zero pre-populated verification logs | ✅ PASS |
| **Self-Certifying Tests** | Tests asserting on tautologies or hardcoded copies | Genuine DOM assertions, exception checks, HTML inspections | ✅ PASS |
| **Core Execution Delegation** | Outsourcing core tokens/theme to 3rd party black boxes | In-house implementation using Tailwind v4 `@theme` & React Context | ✅ PASS |

**Final Integrity Verdict**: **CLEAN**. No integrity violations, malicious bypasses, facade patterns, or fabricated logs were detected.

---

## 2. Integrity Forensics: 2-Phase Investigation

### Phase 1: Mode-Agnostic Observation Log
- **Observation O-01**: Source code in `packages/ui/src/theme/theme-provider.tsx` implements genuine DOM mutation via `document.documentElement.classList.add/remove("dark")` and `root.style.colorScheme = resolved`.
- **Observation O-02**: Cross-tab synchronization uses standard `window.addEventListener("storage", ...)` filtering on `event.key === storageKey`.
- **Observation O-03**: OS system appearance detection uses `window.matchMedia("(prefers-color-scheme: dark)")` and registers a `"change"` listener.
- **Observation O-04**: Anti-FOUC script in `theme-script.tsx` executes synchronously before first paint, safely escaped with `JSON.stringify` and wrapped in `try { ... } catch(_) {}`.
- **Observation O-05**: All three application `globals.css` files configure `@source "../../../packages/ui/src";` for Tailwind v4 utility token discovery.
- **Observation O-06**: Independent execution of `tsc --noEmit` on `packages/ui` passes with exit code 0.
- **Observation O-07**: Independent execution of `bunx biome check packages/ui/src` passes cleanly (11 files checked, 0 errors, 0 warnings).
- **Observation O-08**: Independent execution of `bun test tests/unit/theme.test.ts` passes (8 passed, 0 failed, 17 expectations).
- **Observation O-09**: Independent execution of `bun test tests/e2e/tier1-feature-coverage.test.ts` passes (23 passed, 0 failed, 200 expectations).
- **Observation O-10**: Core canvas and brand tokens (`--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--ring`, `--sidebar`) exceed WCAG AA contrast thresholds (19.9:1 body text light, 19.06:1 body text dark, 5.0:1 accent light, 7.76:1 accent dark).
- **Observation O-11**: Five supplementary status color token pairs fail WCAG AA contrast thresholds (see Section 4 for detailed math).

### Phase 2: Mode-Specific Flagging (Development Mode)
Under `Integrity mode: development` (specified in `ORIGINAL_REQUEST.md`), the strictly prohibited patterns are:
1. Hardcoded test results -> 🔴 FLAG
2. Facade implementations -> 🔴 FLAG
3. Fabricated verification outputs -> 🔴 FLAG

Applying the rules to observations O-01 through O-11:
- O-01 to O-05: Genuine logic, not facades -> **PASS**
- O-06 to O-09: Genuine test execution, not fabricated -> **PASS**
- O-10: Token implementation authentic -> **PASS**
- O-11: Quality defect in supplementary status tokens, not an integrity violation -> **DOCUMENTED AS QUALITY ADVISORY**

---

## 3. Independent Behavioral Verification

All commands were independently executed by the auditor:

### 3.1 Typecheck (`packages/ui`)
- **Command**: `bun run --cwd packages/ui typecheck`
- **Underlying Command**: `tsc --noEmit`
- **Exit Code**: `0`
- **Raw Output**:
  ```
  $ tsc --noEmit
  ```

### 3.2 Linter & Formatter (`biome`)
- **Command**: `bunx biome check packages/ui/src`
- **Exit Code**: `0`
- **Raw Output**:
  ```
  Checked 11 files in 40ms. No fixes applied.
  ```

### 3.3 Theme Unit Tests
- **Command**: `bun test tests/unit/theme.test.ts`
- **Exit Code**: `0`
- **Results**: 8 passed, 0 failed, 17 expect() calls
- **Summary**:
  ```
  tests/unit/theme.test.ts:
  ✓ @repo/ui theme unit tests > ThemeScript > renders script element with default storage key and system theme
  ✓ @repo/ui theme unit tests > ThemeScript > respects custom storageKey and defaultTheme props
  ✓ @repo/ui theme unit tests > useTheme > throws an explicit error when invoked outside ThemeProvider
  ✓ @repo/ui theme unit tests > ThemeProvider > renders children and provides default context values
  ✓ @repo/ui theme unit tests > ThemeProvider > provides light theme context when defaultTheme is light
  ✓ @repo/ui theme unit tests > ThemeToggle > renders without error inside ThemeProvider in SSR mode
  ✓ @repo/ui theme unit tests > ThemeToggle > renders cycle variant SSR placeholder
  ✓ @repo/ui theme unit tests > ThemeToggle > renders segmented variant SSR placeholder
  ```

### 3.4 E2E Tier 1 Feature Coverage Tests
- **Command**: `bun test tests/e2e/tier1-feature-coverage.test.ts`
- **Exit Code**: `0`
- **Results**: 23 passed, 0 failed, 200 expect() calls
- **Raw Verification Time**: 111ms

### 3.5 App Production Builds
The build artifacts in `apps/{web,console,admin}/.next/` were verified:
- `apps/web/.next/BUILD_ID`: `yxGsP7aaXxUlbi_SJxQ7L`
- `apps/console/.next/BUILD_ID`: `F7zL__nYYn3blQZIYO0BN`
- `apps/admin/.next/BUILD_ID`: `hnlYY377SjRY8H6hHtQme`

---

## 4. Mathematical & Empirical WCAG AA Contrast Audit

An independent Node.js script was executed to compute the exact W3C relative luminance ($L = 0.2126 R + 0.7152 G + 0.0722 B$ linearized) and contrast ratio ($CR = \frac{L_1 + 0.05}{L_2 + 0.05}$) across all 38 token combinations in `packages/ui/src/styles.css`.

### 4.1 Fully Compliant Core Tokens (33/38 Passed)
| Mode | Element | Foreground HSL | Background HSL | Ratio | Required | Status |
|------|---------|----------------|----------------|-------|----------|--------|
| **Light** | Body Text on Canvas | `240 10% 3.9%` | `0 0% 100%` | **19.90:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Card Text on Card | `240 10% 3.9%` | `0 0% 100%` | **19.90:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Popover Text on Popover | `240 10% 3.9%` | `0 0% 100%` | **19.90:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Primary Button Text | `0 0% 98%` | `240 5.9% 10%` | **16.97:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Secondary Button Text | `240 5.9% 10%` | `240 4.8% 95.9%` | **16.12:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Muted Text on Canvas | `240 3.8% 40%` | `0 0% 100%` | **6.04:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Accent Brand Text | `144 100% 97%` | `142 76% 28%` | **5.00:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Accent Brand on Canvas (UI) | `142 76% 28%` | `0 0% 100%` | **5.16:1** | >= 3.0:1 | ✅ PASS |
| **Light** | Destructive on Canvas (UI) | `0 84.2% 55%` | `0 0% 100%` | **4.20:1** | >= 3.0:1 | ✅ PASS |
| **Light** | Success on Canvas (UI) | `142 76% 36%` | `0 0% 100%` | **3.33:1** | >= 3.0:1 | ✅ PASS |
| **Light** | Info Text on Info Button | `0 0% 98%` | `217 91% 50%` | **4.86:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Info on Canvas (UI) | `217 91% 50%` | `0 0% 100%` | **5.07:1** | >= 3.0:1 | ✅ PASS |
| **Light** | Focus Ring on Canvas (UI) | `142 76% 36%` | `0 0% 100%` | **3.33:1** | >= 3.0:1 | ✅ PASS |
| **Light** | Sidebar Text on Sidebar | `240 10% 3.9%` | `240 4.8% 97.5%` | **18.75:1** | >= 4.5:1 | ✅ PASS |
| **Light** | Sidebar Accent Text | `144 100% 97%` | `142 76% 28%` | **5.00:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Body Text on Canvas | `0 0% 98%` | `240 10% 3.9%` | **19.06:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Card Text on Card | `0 0% 98%` | `240 10% 6.5%` | **18.33:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Popover Text on Popover | `0 0% 98%` | `240 10% 6.5%` | **18.33:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Primary Button Text | `240 5.9% 10%` | `0 0% 98%` | **16.97:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Secondary Button Text | `0 0% 98%` | `240 3.7% 14%` | **15.20:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Muted Text on Canvas | `240 5% 64.9%` | `240 10% 3.9%` | **7.76:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Accent Brand Text | `144 80% 6%` | `142 71% 45%` | **7.76:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Accent Brand on Canvas (UI) | `142 71% 45%` | `240 10% 3.9%` | **8.64:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Destructive Button Text | `0 0% 98%` | `0 72% 51%` | **4.60:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Destructive on Canvas (UI) | `0 72% 51%` | `240 10% 3.9%` | **4.15:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Success Button Text | `144 80% 6%` | `142 71% 45%` | **7.76:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Success on Canvas (UI) | `142 71% 45%` | `240 10% 3.9%` | **8.64:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Warning Button Text | `240 10% 3.9%` | `38 92% 50%` | **9.33:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Warning on Canvas (UI) | `38 92% 50%` | `240 10% 3.9%` | **9.33:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Info on Canvas (UI) | `217 91% 60%` | `240 10% 3.9%` | **5.47:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Focus Ring on Canvas (UI) | `142 71% 45%` | `240 10% 3.9%` | **8.64:1** | >= 3.0:1 | ✅ PASS |
| **Dark** | Sidebar Text on Sidebar | `0 0% 98%` | `240 10% 5.5%` | **18.60:1** | >= 4.5:1 | ✅ PASS |
| **Dark** | Sidebar Accent Text | `144 80% 6%` | `142 71% 45%` | **7.76:1** | >= 4.5:1 | ✅ PASS |

### 4.2 Non-Compliant Status Tokens (5 Deficiencies Identified)
These tokens were added in `packages/ui/src/styles.css` ahead of Milestone 2 (Badge & Alert primitives). While not causing test failures in M1 (since M1 test suites only asserted core canvas/accent tokens), they fail WCAG 2.1 AA mathematical thresholds:

1. **Light Mode Warning Text**:
   - Variables: `--warning: 38 92% 45%` vs `--warning-foreground: 0 0% 98%`
   - Calculated Ratio: **2.52:1** (Required: >= 4.5:1 for normal text).
   - Defect: Amber/orange background with white text is illegible.
   - Remediation: Change `--warning-foreground` to `240 10% 3.9%` (dark text, yielding **9.33:1** contrast, identical to the pattern used in dark mode).

2. **Light Mode Warning Boundary on White Canvas**:
   - Variables: `--warning: 38 92% 45%` vs `--background: 0 0% 100%`
   - Calculated Ratio: **2.63:1** (Required: >= 3.0:1 for graphical UI elements).
   - Remediation: Darken `--warning` to `38 92% 38%` or use a soft container with dark border (`38 92% 25%`).

3. **Light Mode Success Text**:
   - Variables: `--success: 142 76% 36%` vs `--success-foreground: 0 0% 98%`
   - Calculated Ratio: **3.19:1** (Required: >= 4.5:1 for normal text).
   - Remediation: Darken `--success` to `142 76% 28%` (gives **5.00:1**) or change `--success-foreground` to dark `144 80% 6%`.

4. **Light Mode Destructive Text**:
   - Variables: `--destructive: 0 84.2% 55%` vs `--destructive-foreground: 0 0% 98%`
   - Calculated Ratio: **4.03:1** (Required: >= 4.5:1 for normal text).
   - Remediation: Lower lightness slightly from `55%` to `48%` (`0 84.2% 48%`), yielding **5.02:1**.

5. **Dark Mode Info Text**:
   - Variables: `--info: 217 91% 60%` vs `--info-foreground: 0 0% 98%`
   - Calculated Ratio: **3.49:1** (Required: >= 4.5:1 for normal text).
   - Remediation: Use dark text for light blue badge: `--info-foreground: 240 10% 3.9%` (yielding **6.10:1**).

---

## 5. Component Deep Dive: Theme Architecture & Zero-FOUC

### 5.1 `<ThemeScript />` (`packages/ui/src/theme/theme-script.tsx`)
- **Execution Lifecycle**: Rendered as a synchronous inline `<script id="fc-theme-script">` intended for document `<head>`.
- **AST / Logic Verification**:
  ```js
  (function(){
    try {
      var k="fc-theme", d="system",
          s=localStorage.getItem(k),
          t=s||d,
          m=window.matchMedia('(prefers-color-scheme: dark)').matches,
          dark=t==='dark'||(t==='system'&&m),
          r=document.documentElement;
      if(dark){
        r.classList.add('dark');
        r.style.colorScheme='dark';
      } else {
        r.classList.remove('dark');
        r.style.colorScheme='light';
      }
    } catch(_){}
  })();
  ```
- **VM Execution Test**: An isolated test running 8 distinct storage and mediaQuery combinations inside Node's `vm.runInNewContext` proved 100% deterministic toggling of `classList` and `style.colorScheme`.
- **FOUC Elimination**: The script executes before the HTML parser processes the body, guaranteeing zero-flash.
- **Safety**: `storageKey` and `defaultTheme` are passed through `JSON.stringify` to prevent script-injection attacks. CSP `nonce` is forwarded to the script tag.

### 5.2 `<ThemeProvider />` (`packages/ui/src/theme/theme-provider.tsx`)
- **Reactive State**: Manages `theme` (`light | dark | system`) and `resolvedTheme` (`light | dark`).
- **DOM Synchronization**: Directly calls `root.classList.add("dark")` / `root.classList.remove("dark")` and sets `root.style.colorScheme`.
- **Multi-Tab Listener**: Registers `window.addEventListener("storage", handleStorage)` to synchronize changes made in other tabs.
- **System Preference Listener**: Dynamically updates resolved theme if OS changes appearance while in `"system"` mode via `mediaQuery.addEventListener("change", ...)`.
- **Defensive Error Handling**: All `localStorage.getItem` and `setItem` calls are guarded with `try ... catch` to prevent crashes in private browsing or when storage quotas are exceeded.

### 5.3 `<ThemeToggle />` (`packages/ui/src/theme/theme-toggle.tsx`)
- **Variants Supported**:
  1. `dropdown`: Menu popover with click-outside dismissal, Escape key handler, and active Check icon.
  2. `cycle`: Single-click cycling button with accessible `aria-label`.
  3. `segmented`: Grouped fieldset control with `aria-pressed`.
- **SSR Hydration Protection**: Renders an accessible non-interactive placeholder during SSR until `mounted === true`, eliminating hydration mismatches.

---

## 6. Adversarial Review & Attack Surface Analysis

### Challenge 1: Unhandled Storage Denial in Edge Browsers
- **Assumption Challenged**: ThemeProvider assumes `localStorage` is accessible.
- **Attack Scenario**: Incognito modes, iframe sandboxes (`sandbox=""`), or storage quotas throw `DOMException`.
- **Audit Finding**: ThemeProvider and ThemeScript wrap all `localStorage` access in `try / catch`. If access is blocked, state operates smoothly in-memory without throwing unhandled exceptions.
- **Risk Level**: LOW. Robust defense verified.

### Challenge 2: Incomplete App-Level Layout Wiring
- **Assumption Challenged**: The monorepo assumes all three apps have `<ThemeScript />` and `<ThemeProvider />` mounted.
- **Attack Scenario**: Consuming apps load with unstyled flashes because `layout.tsx` has not mounted `<ThemeScript />`.
- **Audit Finding**: Milestone 1 scoped the creation and export of the primitives from `@repo/ui`, plus `@source` in app `globals.css`. Wiring into `apps/*/src/app/layout.tsx` is allocated to Milestones 3, 4, and 5.
- **Mitigation**: The Milestone 3, 4, and 5 workers must import and wrap layouts with `<ThemeScript />` and `<ThemeProvider />`.

### Challenge 3: Status Color Token Disconnect in Milestone 2
- **Assumption Challenged**: Future Badge and Alert components in Milestone 2 will consume status tokens assuming they meet WCAG AA.
- **Attack Scenario**: An alert banner rendered with `bg-warning text-warning-foreground` in light mode will fail WCAG AA contrast (2.52:1).
- **Mitigation**: Before or during Milestone 2 execution, update `packages/ui/src/styles.css` with the recommended HSL adjustments in Section 4.2.

---

## 7. Forensic Auditor Verification Verdict

- **Integrity Checks (Development Mode)**: **ALL PASS** (0 hardcoded test results, 0 facades, 0 fabricated logs).
- **Independent Test Execution**: **100% PASS** (Typecheck, Biome, 8 unit tests, 23 tier-1 feature tests).
- **Verdict**: **CLEAN**. Milestone 1 work product is authentic, genuine, and approved for milestone sign-off.
