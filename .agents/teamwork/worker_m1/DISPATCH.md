## 2026-10-14T08:50:19Z
You are Worker 1 (worker_m1), implementing Milestone 1: Design System & Theme Foundations (`@repo/ui`).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m1/`.
You MUST read `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md` and `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md` before starting work.
Also review the architectural survey reports at:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_survey_infra/survey_report.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_survey_infra/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `packages/ui/src/styles.css`
- `packages/ui/src/theme/theme-script.tsx`
- `packages/ui/src/theme/theme-provider.tsx`
- `packages/ui/src/theme/theme-toggle.tsx`
- `packages/ui/src/theme/use-theme.ts`
- `packages/ui/src/index.ts`
- `apps/web/src/app/globals.css`
- `apps/console/src/app/globals.css`
- `apps/admin/src/app/globals.css`

Tasks:
1. Note that node_modules may need to be installed: run `bun install` first so dependencies and toolchains are available.
2. In `packages/ui/src/styles.css`:
   - Implement the complete semantic token taxonomy in `@theme` and `@variant dark (&:where(.dark, .dark *));`.
   - Implement WCAG AA compliant HSL color variables for both `:root` (light) and `.dark` (dark mode) as specified in Explorer 1's report (background, foreground, card, popover, primary, secondary, muted, accent emerald brand, destructive, success, warning, info, border, input, ring, sidebar tokens).
3. In `packages/ui/src/theme/`:
   - `theme-script.tsx`: Implement `<ThemeScript />` inline render-blocking script that reads localStorage and OS color scheme to prevent FOUC before hydration.
   - `use-theme.ts`: Implement `useTheme()` hook returning `{ theme, setTheme, resolvedTheme }`.
   - `theme-provider.tsx`: Implement `<ThemeProvider />` client component managing `'light' | 'dark' | 'system'`, listening to `storage` cross-tab events and `window.matchMedia` OS changes.
   - `theme-toggle.tsx`: Implement accessible, interactive `<ThemeToggle />` component with Lucide icons (Sun, Moon, Laptop) and accessible labels.
4. Export theme items from `packages/ui/src/index.ts`.
5. Update `apps/{web,console,admin}/src/app/globals.css` to include `@source "../../../packages/ui/src";`.
6. Run verification commands:
   - `bun run --cwd packages/ui typecheck` (or `bun x tsc --noEmit` in packages/ui)
   - `bunx biome check packages/ui/src`
   Ensure zero errors.
7. Record all changes, verification output, and commands in `changes.md` and complete a structured 5-section `handoff.md` in your working directory. Send a message to orchestrator upon completion.
