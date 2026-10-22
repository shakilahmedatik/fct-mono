# Milestone 1 Remediation Strategy: Token Contrast & App Source Discovery

**Author**: Explorer 1 (`explorer_m1_fix1`)  
**Target**: Worker M1 (`worker_m1`)  
**Date**: October 14, 2026  
**Scope**: 
1. WCAG 2.1 AA Contrast Ratio calibration for light mode `--destructive` in `packages/ui/src/styles.css`
2. Tailwind CSS v4 `@source` directory hop resolution in `apps/{web,console,admin}/src/app/globals.css`
3. Test suite alignment and verification guide

---

## 1. Executive Summary

Empirical analysis confirmed two foundational defects identified by the Challenger reports:
1. **WCAG 2.1 AA Contrast Failure (Light Mode Destructive Text)**: Light mode `--destructive` (`0 84.2% 55%`) paired with `--destructive-foreground` (`0 0% 98%`) yields a contrast ratio of **`4.03:1`**, falling short of the mandatory **`4.50:1`** threshold for normal body copy and button labels. Changing `--destructive` to **`0 84.2% 48%`** lowers relative luminance from `0.1999` to `0.1652`, achieving a compliant **`4.67:1`** contrast against text (`--destructive-foreground`) and **`4.88:1`** contrast against canvas (`--background`), while preserving the brand's exact hue and saturation.
2. **`@source` Off-By-One Path Failure**: In `apps/web/src/app/globals.css`, `apps/console/src/app/globals.css`, and `apps/admin/src/app/globals.css`, `@source "../../../packages/ui/src";` attempts to traverse only 3 parent directories, resolving to `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/packages/ui/src` (which **does not exist**). Because the CSS files are nested 4 levels deep (`apps/<app>/src/app/`), reaching `packages/ui/src` requires exactly 4 parent hops: `"../../../../packages/ui/src"`. Consequently, PostCSS silently omits token utility classes used exclusively within `@repo/ui` (such as `.ring-ring`).

Below are complete mathematical proofs, empirical evidence, and copy-pasteable code fixes.

---

## 2. Issue 1: Light Mode `--destructive` Contrast Calibration

### 2.1 Root Cause & Mathematical Analysis

In `packages/ui/src/styles.css` (lines 81-82):
```css
--destructive: 0 84.2% 55%;
--destructive-foreground: 0 0% 98%;
```

#### Relative Luminance & Contrast Calculation
Per W3C WCAG 2.1 specification ($L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$, $CR = (L_1 + 0.05) / (L_2 + 0.05)$):

1. **`--destructive-foreground` (`0 0% 98%`)**:
   - sRGB: `rgb(250, 250, 250)` (`#fafafa`)
   - Linearized: $((250/255 + 0.055) / 1.055)^{2.4} = 0.95598$
   - Relative Luminance $L_{fg} = \mathbf{0.9560}$

2. **Current `--destructive` (`0 84.2% 55%`)**:
   - sRGB: `rgb(237, 44, 44)` (`#ed2c2c`)
   - Linearized channels: $R_{lin} = 0.8436$, $G_{lin} = 0.0248$, $B_{lin} = 0.0248$
   - Relative Luminance $L_{bg} = 0.2126(0.8436) + (0.7152 + 0.0722)(0.0248) = \mathbf{0.1999}$
   - Contrast Ratio vs FG:
     $$\text{CR} = \frac{0.9560 + 0.05}{0.1999 + 0.05} = \frac{1.0060}{0.2499} = \mathbf{4.03:1}$$
   - **Result**: **FAIL** (< 4.50:1 required for WCAG 2.1 AA body and button text).

### 2.2 Mathematical Calibration Across Lightness Candidates

Empirical evaluation holding $H=0$, $S=84.2\%$:

| Lightness | HSL Value | sRGB Hex | Rel. Luminance | Contrast vs FG (`0 0% 98%`) | Contrast vs BG (`0 0% 100%`) | WCAG Status |
|:---|:---|:---|:---|:---|:---|:---|
| 55% (Current) | `0 84.2% 55%` | `#ed2c2c` | 0.1999 | 4.03:1 | 4.20:1 | **FAIL (< 4.5:1)** |
| 52% | `0 84.2% 52%` | `#e71d1d` | 0.1887 | 4.22:1 | 4.40:1 | **FAIL (< 4.5:1)** |
| 50% | `0 84.2% 50%` | `#e41b1b` | 0.1823 | 4.33:1 | 4.52:1 | **FAIL (< 4.5:1)** |
| 49% | `0 84.2% 49%` | `#e21818` | 0.1736 | 4.50:1 | 4.69:1 | **MARGINAL (4.50:1)** |
| **48% (Optimal)** | **`0 84.2% 48%`** | **`#e11313`** | **0.1652** | **4.67:1** | **4.88:1** | **PASS (Optimal balance)** |
| 45% (Conservative) | `0 84.2% 45%` | `#d31212` | 0.1433 | 5.21:1 | 5.43:1 | **PASS (Higher contrast)** |

### 2.3 Multi-Surface Contrast Matrix for `0 84.2% 48%`

Testing the proposed `0 84.2% 48%` across all light-mode surfaces:
- **vs `--destructive-foreground` (`0 0% 98%`)**: **`4.67:1`** (Threshold: 4.50:1 — **PASS**)
- **vs `--background` (`0 0% 100%`)**: **`4.88:1`** (UI Threshold: 3.00:1 — **PASS**)
- **vs `--card` (`0 0% 100%`)**: **`4.88:1`** (UI Threshold: 3.00:1 — **PASS**)
- **vs `--popover` (`0 0% 100%`)**: **`4.88:1`** (UI Threshold: 3.00:1 — **PASS**)
- **vs `--muted` (`240 4.8% 95.9%`)**: **`4.44:1`** (UI Threshold: 3.00:1 — **PASS**)
- **vs `--sidebar-background` (`240 4.8% 97.5%`)**: **`4.60:1`** (UI Threshold: 3.00:1 — **PASS**)

### 2.4 Dark Mode Status
Dark mode `--destructive` in `packages/ui/src/styles.css` line 129 is `--destructive: 0 72% 51%;`.
- Contrast vs Dark FG (`0 0% 98%`): **`4.60:1`** (Threshold: 4.50:1 — **PASS**)
- Contrast vs Dark BG (`240 10% 3.9%`): **`4.15:1`** (UI Threshold: 3.00:1 — **PASS**)
- **Conclusion**: Dark mode tokens are already fully compliant and require no modification.

---

## 3. Issue 2: `@source` Path Resolution Across Applications

### 3.1 Root Cause & Directory Hop Arithmetic

The `@source` directive in Tailwind CSS v4 is evaluated relative to the stylesheet containing it.

Target directory: `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src`

Hierarchy analysis for all 3 applications:
```
/Users/shakilahmedatik/Projects/firstcup-monorepo/
  ├── packages/
  │    └── ui/
  │         └── src/          <-- TARGET DIRECTORY
  └── apps/
       ├── web/
       │    └── src/
       │         └── app/
       │              └── globals.css  <-- Level 0 (Directory: apps/web/src/app)
       ├── console/
       │    └── src/
       │         └── app/
       │              └── globals.css  <-- Level 0 (Directory: apps/console/src/app)
       └── admin/
            └── src/
                 └── app/
                      └── globals.css  <-- Level 0 (Directory: apps/admin/src/app)
```

Directory hops from `apps/*/src/app`:
- Hop 1 (`..`): `apps/*/src`
- Hop 2 (`../..`): `apps/*`
- Hop 3 (`../../..`): `apps`
- Hop 4 (`../../../..`): Monorepo Root (`/Users/shakilahmedatik/Projects/firstcup-monorepo`)

Evaluating the paths:
- **Current (3 hops)**: `path.resolve("apps/web/src/app", "../../../packages/ui/src")`
  $\rightarrow$ `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/packages/ui/src`
  `fs.existsSync(...) === false` (**DOES NOT EXIST**)
- **Corrected (4 hops)**: `path.resolve("apps/web/src/app", "../../../../packages/ui/src")`
  $\rightarrow$ `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src`
  `fs.existsSync(...) === true` (**EXISTS**)

### 3.2 Compilation & Build Impact
When Tailwind CSS v4 processes `globals.css` with only 3 hops:
- It fails to locate `@repo/ui` sources.
- Utility classes used only within `@repo/ui` components (e.g. `.ring-ring`, `focus-visible:ring-ring`, `.bg-sidebar-accent`) are completely omitted from the emitted Next.js CSS chunk.
- When updated to 4 hops (`"../../../../packages/ui/src"`), PostCSS immediately scans `@repo/ui/src` and emits `.ring-ring` and `focus-visible:ring-ring` into the application CSS.

---

## 4. Copy-Pasteable Implementation Guide for Worker M1

### 4.1 Update `packages/ui/src/styles.css`

**Target File**: `packages/ui/src/styles.css` (Line 81)

```diff
     /* Status Palettes */
-    --destructive: 0 84.2% 55%;
+    --destructive: 0 84.2% 48%;
     --destructive-foreground: 0 0% 98%;
```

### 4.2 Update `apps/web/src/app/globals.css`

**Target File**: `apps/web/src/app/globals.css` (Line 4)

```diff
 @import "tailwindcss";
 @import "@repo/ui/styles.css";
 
-@source "../../../packages/ui/src";
+@source "../../../../packages/ui/src";
```

### 4.3 Update `apps/console/src/app/globals.css`

**Target File**: `apps/console/src/app/globals.css` (Line 4)

```diff
 @import "tailwindcss";
 @import "@repo/ui/styles.css";
 
-@source "../../../packages/ui/src";
+@source "../../../../packages/ui/src";
```

### 4.4 Update `apps/admin/src/app/globals.css`

**Target File**: `apps/admin/src/app/globals.css` (Line 4)

```diff
 @import "tailwindcss";
 @import "@repo/ui/styles.css";
 
-@source "../../../packages/ui/src";
+@source "../../../../packages/ui/src";
```

### 4.5 Update `tests/e2e/tier1-feature-coverage.test.ts`

**Target File**: `tests/e2e/tier1-feature-coverage.test.ts` (Line 231)  
*Rationale*: The Tier 1 test previously verified the erroneous 3-hop string due to the original specification in `PROJECT.md`. It must be aligned with the 4-hop path.

```diff
     test("1.6 [F06] Tailwind Content Discovery: all apps configure @source for @repo/ui", () => {
       const appCssPaths = [
         path.join(APPS_PATH, "web/src/app/globals.css"),
         path.join(APPS_PATH, "console/src/app/globals.css"),
         path.join(APPS_PATH, "admin/src/app/globals.css"),
       ];
 
       for (const cssPath of appCssPaths) {
         expect(fs.existsSync(cssPath)).toBeTrue();
         const content = fs.readFileSync(cssPath, "utf8");
         expect(content).toContain('@import "@repo/ui/styles.css";');
-        expect(content).toContain('@source "../../../packages/ui/src";');
+        expect(content).toContain('@source "../../../../packages/ui/src";');
       }
     });
```

*Optional Enhancement in `tier1-feature-coverage.test.ts` (around line 178)*:  
Add explicit WCAG verification for destructive text in light mode:
```ts
      // Destructive foreground on destructive button (normal text >= 4.5:1)
      const destructiveOnButton = verifyWcagCompliance(
        rootVariables["--destructive-foreground"],
        rootVariables["--destructive"],
        "normal-text",
      );
      expect(destructiveOnButton.passed).toBeTrue();
      expect(destructiveOnButton.ratio).toBeGreaterThanOrEqual(4.5);
```

### 4.6 Update `PROJECT.md` Architecture Note

**Target File**: `PROJECT.md` (Line 14)

```diff
-  - App CSS (`apps/*/src/app/globals.css`): `@import "tailwindcss"; @import "@repo/ui/styles.css"; @source "../../../packages/ui/src";`.
+  - App CSS (`apps/*/src/app/globals.css`): `@import "tailwindcss"; @import "@repo/ui/styles.css"; @source "../../../../packages/ui/src";`.
```

---

## 5. Verification Commands for Worker M1

Worker M1 can independently verify the fixes by executing:

1. **Verify WCAG 2.1 AA Contrast Ratio**:
   ```bash
   bun -e '
   import { getContrastRatio } from "./tests/e2e/harness/color-contrast.ts";
   const fg = "0 0% 98%";
   const dest = "0 84.2% 48%";
   const bg = "0 0% 100%";
   console.log("Destructive Text Contrast:", getContrastRatio(fg, dest), ":1 (must be >= 4.5)");
   console.log("Destructive Surface Contrast:", getContrastRatio(dest, bg), ":1 (must be >= 3.0)");
   '
   ```
   *Expected output*: `Destructive Text Contrast: 4.67 :1` and `Destructive Surface Contrast: 4.88 :1`.

2. **Verify `@source` Existence**:
   ```bash
   bun -e '
   import * as fs from "node:fs";
   import * as path from "node:path";
   for (const app of ["web", "console", "admin"]) {
     const cssPath = path.resolve(`apps/${app}/src/app/globals.css`);
     const content = fs.readFileSync(cssPath, "utf8");
     const match = content.match(/@source\s+["\x27]([^"\x27]+)["\x27]/);
     const resolved = path.resolve(path.dirname(cssPath), match[1]);
     console.log(app, "->", match[1], "exists:", fs.existsSync(resolved));
   }
   '
   ```
   *Expected output*: All three apps show `exists: true`.

3. **Verify PostCSS Token Compilation from `apps/web`**:
   ```bash
   bun -e '
   import * as fs from "node:fs";
   import * as path from "node:path";
   const postcss = require("./node_modules/.bun/postcss@8.5.29/node_modules/postcss/lib/postcss.js");
   const tailwind = require("./node_modules/.bun/@tailwindcss+postcss@4.3.3/node_modules/@tailwindcss/postcss/dist/index.js");
   const css = fs.readFileSync("apps/web/src/app/globals.css", "utf8");
   process.chdir("apps/web");
   const res = await postcss([tailwind()]).process(css, { from: "src/app/globals.css" });
   console.log("Emits .ring-ring:", res.css.includes(".ring-ring"));
   '
   ```
   *Expected output*: `Emits .ring-ring: true`.

4. **Run E2E Test Suite**:
   ```bash
   bun test tests/e2e/tier1-feature-coverage.test.ts tests/e2e/tier2-boundary-corner.test.ts tests/e2e/tier3-cross-feature.test.ts tests/e2e/tier4-real-world.test.ts
   ```
   *Expected output*: 62 passed tests.
