## 2026-10-14T09:48:44Z
You are Worker 1 Generation 2 (worker_m1_gen2), implementing Milestone 1 remediation for Design System & Theme Foundations (`@repo/ui`).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m1_gen2/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Explorer 1 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m1_fix1/fix_strategy.md`
- Explorer 2 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m1_fix2/fix_strategy.md`
- Explorer 3 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m1_fix3/fix_strategy.md`

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
- `apps/web/src/app/layout.tsx`
- `apps/console/src/app/layout.tsx`
- `apps/admin/src/app/layout.tsx`
- `tests/adversarial-theme-challenge.test.ts`
- `tests/e2e/challenger2-empirical.test.ts`
- `tests/e2e/tier1-feature-coverage.test.ts`
- `tests/unit/theme.test.ts`

Tasks:
1. Apply the copy-pasteable remediation from Explorer 1 in `packages/ui/src/styles.css`:
   - Calibrate `--destructive: 0 84.2% 48%;` for light mode to achieve 4.67:1 contrast on `--destructive-foreground`.
   - Update `apps/{web,console,admin}/src/app/globals.css` to use 4 parent hops: `@source "../../../../packages/ui/src";`.
   - Update `tests/e2e/tier1-feature-coverage.test.ts:231` assertion for the 4-hop path.
2. Apply the copy-pasteable remediation from Explorer 2:
   - In `packages/ui/src/theme/theme-script.tsx`: Inner try/catch for `localStorage.getItem` to preserve `matchMedia` fallback on `SecurityError`, align validation `(s === 'light' || s === 'dark' || s === 'system') ? s : d`, and sanitize `<` to `\u003c`.
   - In `packages/ui/src/theme/theme-provider.tsx` & `use-theme.ts`: SSR/hydration symmetry, client mounting sync, and expose `mounted: boolean`.
   - In `apps/{web,console,admin}/src/app/layout.tsx`: Add `suppressHydrationWarning` to `<html>`, include `<ThemeScript />` in `<head>`, and wrap children in `<ThemeProvider>`.
3. Apply the copy-pasteable remediation from Explorer 3:
   - In `packages/ui/src/theme/theme-toggle.tsx`: Implement full WAI-ARIA keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`, `Escape`, `Tab`), `role="menuitemradio"`, `aria-checked`, and focus-visible rings.
4. Align the challenge test suites:
   - In `tests/adversarial-theme-challenge.test.ts`: Invert failing expectations so they assert the corrected, hardened behaviors.
   - In `tests/e2e/challenger2-empirical.test.ts`: Update bug demonstration checks to assert that the defects are now resolved (asserting `toBeTrue()` for correct hop, correct ARIA, correct SecurityError handling).
5. Run full verification suite:
   - `bun run --cwd packages/ui typecheck`
   - `bunx biome check packages/ui/src`
   - `bun test` (all unit and e2e tests)
   - Verify Next.js builds for `apps/web`, `apps/console`, `apps/admin` succeed.
6. Record all changes in `changes.md` and complete a 5-section `handoff.md`. Send completion message to orchestrator.


## 2026-10-14T10:10:43Z
**Context**: Milestone 1 Remediation Execution
**Content**: Please provide a status update on your verification tasks (typecheck, biome check, test suites, Next.js builds) and handoff report.
**Action**: If tests have finished running, please record your changes in changes.md, write handoff.md, and send your completion report to the orchestrator.
