## 2026-10-14T12:10:24Z

Sender: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
Content:
You are Explorer 1 Round 3 (explorer_m2_r3_1) investigating Milestone 2 remediation for Form Controls.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_1/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Reviewer 1 r2 handoff: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/reviewer_m2_r2_1/handoff.md`
- Target files: `packages/ui/src/components/input.tsx`, `packages/ui/src/components/textarea.tsx`, `packages/ui/src/components/select.tsx`

Focus:
1. Examine why spreading `{...props}` AFTER `aria-describedby` causes caller-provided `aria-describedby` (e.g. `aria-describedby="username-help"`) to clobber the derived `${props["aria-describedby"]} ${errorId}`.
2. Design a clean, bulletproof solution for `input.tsx`, `textarea.tsx`, and `select.tsx` where `{...props}` is placed BEFORE derived attributes (`id`, `type`, `className`, `aria-invalid`, `aria-describedby`), or where `aria-describedby` is properly computed from `props["aria-describedby"]` and `hasErrorText ? errorId : null`.
3. Ensure custom caller props (`data-*`, `disabled`, `value`, `onChange`, `placeholder`, etc.) remain fully supported.
4. Verify tests 2.1 and 2.2 in `tests/e2e/challenger-m2-r2-empirical.test.ts`.
5. Provide exact, copy-pasteable code recommendations for the Worker. Do NOT modify source code files yourself.
6. Write your recommendations to `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m2_r3_1/fix_strategy.md` and complete `handoff.md`. Send completion message to orchestrator.
