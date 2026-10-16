# Dispatch for Auditor M4
Task: Forensic integrity audit for Milestone 4 (apps/console)
Output: .agents/teamwork/auditor_m4/handoff.md
## 2026-10-14T16:18:49Z
You are auditor_m4 (Forensic Integrity Auditor).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/auditor_m4/`.
Your project root is `/Users/shakilahmedatik/Projects/firstcup-monorepo`.

MANDATORY READING:
1. `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
3. `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m4/handoff.md`

SCOPE OF AUDIT:
Conduct a rigorous forensic integrity audit on Milestone 4 (`apps/console` Revamp) and modified files:
- `apps/console/src/app/layout.tsx`
- `apps/console/src/app/page.tsx`
- `apps/console/src/app/(auth)/login/page.tsx`
- `apps/console/src/app/dashboard/page.tsx`
- `apps/console/src/app/preferences/page.tsx`
- `apps/console/src/app/billing/page.tsx`
- `apps/console/src/components/console-shell.tsx`
- `apps/console/src/components/console-sidebar.tsx`
- `packages/ui/src/components/{dialog.tsx,tabs.tsx,navbar.tsx,tooltip.tsx,switch.tsx}`

INTEGRITY CHECKS TO EXECUTE:
1. Hardcoded output check: Ensure components calculate, filter, and render dynamically rather than hardcoding static mock assertions or strings tailored solely to pass tests.
2. Dummy/Facade implementation check: Verify all form controls, buttons, toggles, and modal triggers have authentic state management and event handlers.
3. Test evasion check: Verify no tests in `tests/` were altered, disabled, commented out, or circumvented.
4. Static analysis & diagnostics: Inspect all modified files with `git diff HEAD~1` or inspecting recent git changes, verify genuine design-system consumption.

OUTPUT:
Write your forensic report and definitive verdict (`CLEAN` or `INTEGRITY VIOLATION`) to `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/auditor_m4/handoff.md`.
Send a completion message back to caller with your verdict and path to handoff.md.
