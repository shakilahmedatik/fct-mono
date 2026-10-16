# BRIEFING — 2026-10-14T12:21:50Z

## Mission
Investigate Milestone 2 TabsContent behavior regarding SSR HTML persistence, inactive tab unmounting vs forceMount/hidden attribute, and produce a backward-compatible fix strategy for the Worker.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigator, synthesis
- Working directory: /Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_3/
- Original parent: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
- Milestone: Milestone 2 TabsContent behavior

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files yourself
- Working directory is /Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_3/
- Provide exact, copy-pasteable code recommendations for the Worker in fix_strategy.md and complete handoff.md

## Current Parent
- Conversation ID: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `packages/ui/src/components/tabs.tsx`
  - `.agents/teamwork/challenger_m2_r2_2/test_output.log`
  - `.agents/teamwork/reviewer_m2_r2_1/review_report.md`
  - `tests/adversarial-components-challenge.test.ts`
  - `tests/e2e/challenger-m2-empirical.test.ts`
  - `tests/unit/components.test.ts`
- **Key findings**:
  - Challenger 2 Round 2 Test 6.1 expected inactive tabs content to appear in static SSR HTML, but `TabsContent` unconditionally returns `null` when `!isSelected`.
  - Defaulting to mounting inactive tabs would break existing test `adversarial-components-challenge.test.ts` (line 520) which asserts `expect(inspector.contains("First content")).toBeFalse()`.
  - The solution is an optional `forceMount?: boolean` prop on both `Tabs` (cascading via `TabsContext`) and `TabsContent`, with `hidden` attribute support.
  - Inactive panels when force-mounted render `<div role="tabpanel" data-state="inactive" hidden ...>` and apply Tailwind's `hidden` class (`cn(..., !isSelected && "hidden")`), removing them from the accessibility tree and visual rendering while persisting them in the DOM and SSR HTML.
- **Unexplored areas**: none (all areas investigated and verified).

## Key Decisions Made
- Confirmed `forceMount` MUST default to `false` to maintain 100% backward compatibility.
- Designed dual-level `forceMount` support (root cascade + per-tab override).
- Destructured `forceMount` and `hidden` out of props to prevent `{...props}` clobbering.
- Positioned `!isSelected && "hidden"` after `className` in `cn()` so Tailwind-merge overrides any caller display class (e.g. `flex`, `grid`) when unselected.
- Authored `fix_strategy.md` with copy-pasteable code and `handoff.md`.

## Artifact Index
- DISPATCH.md — record of incoming dispatch
- fix_strategy.md — copy-pasteable implementation strategy for Worker
- handoff.md — 5-component handoff report
- progress.md — liveness heartbeat and milestone checklist
