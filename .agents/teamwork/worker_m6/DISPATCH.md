## 2026-10-14T17:44:36Z
You are worker_m6 (Monorepo Integration & Verification Worker).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m6/`.
Your project root is `/Users/shakilahmedatik/Projects/firstcup-monorepo`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
1. `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
3. `/Users/shakilahmedatik/Projects/firstcup-monorepo/TEST_INFRA.md` & `TEST_READY.md`

SCOPE OF WORK FOR MILESTONE 6:
You are responsible for executing the comprehensive monorepo integration verification across all packages and apps:
1. Workspace-wide Typecheck:
   Run TypeScript compiler checks on all monorepo apps and packages:
   - `packages/ui`: `./node_modules/.bin/tsc -p packages/ui/tsconfig.json --noEmit`
   - `apps/web`: `./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit`
   - `apps/console`: `./node_modules/.bin/tsc -p apps/console/tsconfig.json --noEmit`
   - `apps/admin`: `./node_modules/.bin/tsc -p apps/admin/tsconfig.json --noEmit`
   - Or workspace-wide `tsc -b --noEmit` or `bun run typecheck`.
   Verify that all exit with code 0 (zero TypeScript errors). If any minor type mismatch is found, fix it genuinely.

2. Workspace-wide Biome Linting & Formatting:
   Run Biome check across all source code:
   - `./node_modules/.bin/biome check packages/ui/src apps/web/src apps/console/src apps/admin/src tests`
   Verify 0 errors and 0 warnings. If any formatting or import order lint diagnostic appears, fix it cleanly using Biome or manual genuine correction.

3. Next.js Production Builds (All 3 Apps):
   Execute and verify optimized production builds for:
   - `apps/web`: `./apps/web/node_modules/.bin/next build apps/web --webpack` (or `node ./node_modules/.bin/next build apps/web --webpack`)
   - `apps/console`: `./apps/console/node_modules/.bin/next build apps/console --webpack`
   - `apps/admin`: `./apps/admin/node_modules/.bin/next build apps/admin --webpack`
   Verify that all static pages and route groups compile cleanly without missing imports, hydration errors, or build failures.

4. 100% E2E Test Suite Verification (All 4 Tiers):
   Run the master E2E test runner:
   - `bun ./tests/e2e/run-all.ts`
   Verify that all 62 tests across Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-Feature Pairwise), and Tier 4 (Real-World Scenarios) pass with 100% pass rate.

5. Unit & Adversarial Test Suites:
   Run all unit tests and empirical challenger suites:
   - `bun test tests/unit`
   - `bun test tests/e2e/challenger*`
   Verify that all pass cleanly.

6. Monorepo Quality & Standards Checklist:
   - Confirm zero-FOUC `<ThemeScript />` is in `<head>` and `suppressHydrationWarning` is on `<html>` across `apps/{web,console,admin}/src/app/layout.tsx`.
   - Confirm zero active calls to `window.prompt` or `window.alert` anywhere in `apps/admin/src/app/playground`.
   - Confirm WCAG AA contrast compliance and design-system token consumption.

OUTPUT:
Write your comprehensive monorepo verification report to `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m6/handoff.md`. Include all executed commands, verbatim outputs, and status matrices.
When finished, send a message to caller with the summary and path to your handoff.md.
