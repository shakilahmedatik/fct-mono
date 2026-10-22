## 2026-10-14T12:23:18Z

You are Worker 2 Generation 3 (worker_m2_gen3), implementing Milestone 2 Round 3 remediations in `@repo/ui`.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m2_gen3/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Explorer 1 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_1/fix_strategy.md`
- Explorer 2 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_2/fix_strategy.md`
- Explorer 3 fix strategy: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_3/fix_strategy.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `packages/ui/src/components/input.tsx`
- `packages/ui/src/components/textarea.tsx`
- `packages/ui/src/components/select.tsx`
- `packages/ui/src/components/tooltip.tsx`
- `packages/ui/src/components/tabs.tsx`

Tasks:
1. In `packages/ui/src/components/input.tsx`, `packages/ui/src/components/textarea.tsx`, and `packages/ui/src/components/select.tsx`:
   Apply Explorer 1's copy-pasteable fix: place `{...props}` FIRST on `<input>`, `<textarea>`, and `<select>` before derived attributes (`id`, `type`, `className`, `aria-invalid`, `aria-describedby`), or use the extracted `ariaDescribedBy` variable. This ensures caller-provided `aria-describedby` does not clobber the derived `${props["aria-describedby"]} ${errorId}`.
2. In `packages/ui/src/components/tooltip.tsx`:
   Apply Explorer 2's copy-pasteable enhancements: support `open?: boolean`, `defaultOpen?: boolean`, `onOpenChange?: (open: boolean) => void`, `forceMount?: boolean`, auto-generated `tooltipId`, trigger child clone with `aria-describedby={describedBy}`, Escape key dismissal, and `data-side` / `data-state`.
3. In `packages/ui/src/components/tabs.tsx`:
   Apply Explorer 3's copy-pasteable enhancements: add `forceMount?: boolean` on `TabsProps` (cascading via `TabsContext`) and `TabsContentProps`. Default `forceMount = false` (preserving backward compatibility). When `forceMount={true}` or `hidden` is passed, render inactive panels with `role="tabpanel"`, `data-state="inactive"`, `hidden={true}`, and `className="... hidden"`.
4. Run full verification suite:
   - `bun run --cwd packages/ui typecheck`
   - `./node_modules/.bin/biome check packages/ui/src`
   - `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/console/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/admin/tsconfig.json`
   - `bun test`
   - `bun tests/e2e/run-all.ts`
5. Record all changes in `changes.md` and complete a 5-section `handoff.md`. Send completion message to orchestrator when finished.
