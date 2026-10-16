# Handoff Report: Infrastructure & Styling Survey

**From**: Explorer 1 (`survey_infra`)  
**To**: Orchestrator & Implementation Team  
**Date**: October 14, 2026  
**Type**: Hard Handoff  

---

## 1. Observation

1. **Workspace Tooling**:
   - `package.json:8` defines `"packageManager": "bun@1.3.13"`.
   - `package.json:4-7` defines `"workspaces": ["apps/*", "packages/*"]`.
   - `bun.lock` exists at root (104,228 bytes). No `pnpm-workspace.yaml` or `pnpm-lock.yaml` exists.
   - Root `turbo.json:5-12` defines the `build` task with `"dependsOn": ["^build"]`. `turbo.json:20-22` specifies that `typecheck` depends on `^build`.
   - `biome.json:1-38` configures Biome 2.5.15 covering `apps/**` and `packages/**`.
   - Running `bun --version` returned `1.3.13`. Running `node --version` returned `v24.18.0`. Running `pnpm` failed with sandbox EPERM: `[ERROR] EPERM: operation not permitted, open '/Users/shakilahmedatik/Library/Preferences/pnpm/config.yaml'`.

2. **Tailwind CSS v4 Configuration**:
   - Root `package.json:27-28` defines `"@tailwindcss/postcss": "^4.3.3"` and `"tailwindcss": "^4.3.3"`.
   - Each app (`apps/web/package.json:22,26`, `apps/console/package.json:22,26`, `apps/admin/package.json:22,26`) includes `@tailwindcss/postcss: ^4.3.3` and `tailwindcss: ^4.3.3`.
   - Each app has `postcss.config.mjs` exporting `{ plugins: { "@tailwindcss/postcss": {} } }`.
   - There are zero `tailwind.config.*` files anywhere in the workspace (`find_by_name` returned 0 matches for `*tailwind.config*`).
   - `apps/{web,console,admin}/src/app/globals.css` only contains:
     ```css
     @import "tailwindcss";
     @import "@repo/ui/styles.css";
     ```
   - Neither `apps/web`, `apps/console`, nor `apps/admin` `globals.css` includes an `@source` directive pointing to `packages/ui/src`.

3. **Current CSS Variables and Theme Definition**:
   - `packages/ui/src/styles.css:1-46` defines raw HSL channel values (`--background: 0 0% 100%`, `--foreground: 240 10% 3.9%`) inside an `@layer base` block.
   - `packages/ui/src/styles.css` has **no `@theme` block**. Searching for `@theme` across the codebase with `grep_search` yielded 0 results.
   - `packages/ui/src/styles.css` has **no `@variant dark`** definition.

4. **Hardcoded Dark Mode & Absence of Theme Switching**:
   - `apps/web/src/app/layout.tsx:14` hardcodes: `<html lang="en" className="dark">`.
   - `apps/console/src/app/layout.tsx:14` hardcodes: `<html lang="en" className="dark">`.
   - `apps/admin/src/app/layout.tsx:14` hardcodes: `<html lang="en" className="dark">`.
   - There is no `ThemeProvider`, `useTheme`, `ThemeToggle`, or `next-themes` anywhere in `packages/ui` or the apps (`grep_search` returned 0 results for `ThemeProvider`, `useTheme`, and `next-themes`).

5. **Missing Workspace Node Modules**:
   - `find_by_name` for `node_modules` at depth 2 and 4 returned 0 results.
   - Running `bun run --cwd packages/ui typecheck` failed with TS errors such as:
     `tsconfig.json:2:14 - error TS6053: File '@repo/config-ts/base.json' not found.`
     `src/components/card.tsx:1:24 - error TS2307: Cannot find module 'react' or its corresponding type declarations.`
   - This occurs because `bun install` has not yet been executed in this repository clone.

6. **Biome Linter Execution**:
   - Running `bunx biome check .` checked 200 files in 166ms and reported 10 errors (mostly React hook exhaustive dependencies in `apps/admin/src/app/playground/lib/usePipeline.ts` and `apps/admin/src/app/users/page.tsx`, plus 1 `noDangerouslySetInnerHtml` in `apps/web/src/app/blog/[slug]/page.tsx`).

---

## 2. Logic Chain

1. **Step 1 (Package Manager & Workspace)**:
   Observation (1) shows `bun.lock` exists and `packageManager` is set to `bun@1.3.13`. `pnpm` fails due to user config permission restrictions in the macOS sandbox environment. Therefore, all workspace scripting, installing, and building should standardize on `bun` (`bun install`, `bun run build`, `bun run check`, `bun run typecheck`).

2. **Step 2 (Prerequisite for TypeScript / Build Verification)**:
   Observation (5) shows `node_modules` is currently absent, causing `@repo/config-ts` and `react` module resolution failures during `tsc`. Therefore, the first step for any implementer before running builds or typechecks must be `bun install`.

3. **Step 3 (Tailwind CSS v4 Token Integration)**:
   Observations (2) and (3) establish that the workspace uses Tailwind CSS v4.3.3 without legacy configuration files, and `packages/ui/src/styles.css` defines CSS variables without an `@theme` block. In Tailwind v4, utilities like `bg-background`, `text-foreground`, `border-border`, `bg-card`, `bg-accent`, `ring-ring` are generated solely if mapped in `@theme { --color-background: hsl(var(--background)); ... }`. Without this block, these utility classes do not exist in the Tailwind runtime.
   Additionally, because `@source` is omitted from app `globals.css`, Tailwind v4 does not scan `packages/ui/src` for classes used solely within UI library components.

4. **Step 4 (Zero-FOUC Theme Architecture)**:
   Observation (4) shows that all three apps hardcode `className="dark"`, completely lacking theme toggling.
   Next.js App Router (16.4.0) pre-renders on the server. If theme toggling relies solely on React client state (`useEffect`), users visiting in light mode or with system light preference will experience a severe flash of unstyled/incorrect theme (FOUC).
   To eliminate FOUC:
   - An inline blocking script (`<ThemeScript />`) must execute in `<head>` before body rendering, reading `localStorage` (defaulting to system preference via `window.matchMedia`) and applying or removing `.dark` directly on `document.documentElement`.
   - `<html lang="en" suppressHydrationWarning>` must be set on `RootLayout` in all three apps to prevent React hydration mismatch warnings.
   - `@repo/ui` must provide `<ThemeProvider>`, `useTheme`, and `<ThemeToggle>` to manage reactive state, cross-tab sync via `storage` events, and OS preference changes.

---

## 3. Caveats

1. **Local Node Modules Not Installed**: Verification commands that rely on resolved dependencies (such as `tsc --noEmit` and `next build`) cannot pass until `bun install` is run in the root workspace.
2. **Mac Sandbox Permissions**: Running `pnpm` failed with `EPERM` accessing `~/Library/Preferences/pnpm`. When running commands through Antigravity agents, `bun` or `bunx` with `BypassSandbox: true` should be used.
3. **Existing Biome Violations**: Biome reported 10 pre-existing lint issues in `apps/admin` and `apps/web`. The implementers must address or format these during component and app refactoring to meet the acceptance criterion of zero Biome errors.

---

## 4. Conclusion

1. **Foundations Specification**:
   - Update `packages/ui/src/styles.css` to declare the complete Tailwind CSS v4 `@theme` block, the `@variant dark (&:where(.dark, .dark *));` directive, and WCAG AA-compliant semantic tokens for surfaces, text, borders, accents, status colors, and sidebar shells.
   - Update `apps/{web,console,admin}/src/app/globals.css` to import `@repo/ui/styles.css` and specify `@source "../../../packages/ui/src";`.
2. **Theme Infrastructure Specification**:
   - Implement `<ThemeScript />`, `<ThemeProvider />`, `useTheme()`, and `<ThemeToggle />` inside `packages/ui/src/components/theme/` and export them from `@repo/ui`.
   - Refactor `apps/{web,console,admin}/src/app/layout.tsx` to include `suppressHydrationWarning`, `<ThemeScript />`, `<ThemeProvider>`, and integrate `<ThemeToggle />` into headers and sidebars.
3. Detailed architectural recommendations and full CSS/TypeScript blueprints are delivered in `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_survey_infra/survey_report.md`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   Read `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_survey_infra/survey_report.md` for complete token maps, CSS variables, and implementation code snippets.

2. **Verify Tooling & Biome Check**:
   ```bash
   bun --version
   bunx biome check .
   ```

3. **Verify Prerequisite & Workspace Installation**:
   ```bash
   bun install
   ```

4. **Verify Typecheck After Installation & Implementation**:
   ```bash
   bun run --cwd packages/ui typecheck
   bun run --cwd apps/web typecheck
   bun run --cwd apps/console typecheck
   bun run --cwd apps/admin typecheck
   ```

5. **Verify Zero-FOUC Theme Switcher**:
   - Inspect `document.documentElement.className` upon loading `http://localhost:3000`, `3001`, and `3002`.
   - Set preference to `light` via `ThemeToggle`; reload page; verify that page loads immediately with light background without white-to-dark or dark-to-white flashing.
   - Set preference to `system`; change OS appearance between light and dark; verify immediate real-time synchronization.
