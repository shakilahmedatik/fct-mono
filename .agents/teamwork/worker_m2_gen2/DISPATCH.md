## 2026-10-14T11:44:47Z
You are Worker 2 Generation 2 (worker_m2_gen2), implementing Milestone 2 remediations for the Reusable Component Suite in `@repo/ui`.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m2_gen2/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Explorer 1 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_fix1/fix_strategy.md`
- Explorer 2 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_fix2/fix_strategy.md`
- Explorer 3 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_fix3/fix_strategy.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `packages/ui/src/components/dialog.tsx`
- `packages/ui/src/components/navbar.tsx`
- `packages/ui/src/components/switch.tsx`
- `packages/ui/src/components/input.tsx`
- `packages/ui/src/components/textarea.tsx`
- `packages/ui/src/components/select.tsx`
- `tests/adversarial-components-challenge.test.ts`
- `tests/unit/components.test.ts`

Tasks:
1. Apply the copy-pasteable Dialog focus trap implementation in `packages/ui/src/components/dialog.tsx` from Explorer 1 fix strategy (autofocus first element/container, Tab/Shift+Tab cycling, focus restoration to trigger on unmount, context memoization).
2. Apply the copy-pasteable Navbar implementation in `packages/ui/src/components/navbar.tsx` from Explorer 2 fix strategy (align drawer to `md:hidden`, add `inDrawer` context to render `NavbarNav` links as `flex flex-col space-y-3` inside the drawer, suppress duplicate brand/toggle inside drawer).
3. Apply the copy-pasteable Switch implementation in `packages/ui/src/components/switch.tsx` from Explorer 3 fix strategy (accessible name `<label htmlFor={switchId}>`, `aria-labelledby`, click toggle on label text, `aria-describedby`).
4. Apply the copy-pasteable Form error messaging in `packages/ui/src/components/input.tsx`, `textarea.tsx`, `select.tsx` from Explorer 3 fix strategy (render `<p role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>` when `typeof error === "string"` and non-empty, linked with `aria-describedby`).
5. Align test assertions in `tests/adversarial-components-challenge.test.ts`:
   - Test 2.4: Invert audit checks to assert that `hasTabIntercept`, `hasFocusCall`, and `hasFocusTrap` are all `toBeTrue()`.
   - Test 2.8: Invert breakpoint test to assert `md:hidden` is present on the drawer and `sm:hidden` is absent.
   - Test 2.9: Invert drawer links test to assert that `NavbarNav` inside the drawer renders navigation links cleanly.
   - Tests 1.3, 1.4, 1.9: Update expectations to verify that string error messages and switch labels are rendered and accessible.
6. Run full verification suite:
   - `bun run --cwd packages/ui typecheck`
   - `./node_modules/.bin/biome check packages/ui/src tests/`
   - `bun test`
   - `bun tests/e2e/run-all.ts`
   - `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/console/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/admin/tsconfig.json`
7. Record all changes in `changes.md` and complete a 5-section `handoff.md`. Send completion message to orchestrator.
