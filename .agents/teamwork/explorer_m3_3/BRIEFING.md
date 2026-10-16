# BRIEFING — 2026-10-14T12:58:30Z

## Mission
Investigate and design a production-grade Web App Shell, Layout, Navbar, and Footer overhaul for `apps/web` utilizing `@repo/ui` and Tailwind v4.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: /Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_3
- Original parent: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
- Milestone: Milestone 3 (explorer_m3_3)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source code.
- Provide exact, copy-pasteable component recommendations in `redesign_plan.md`.
- Produce 5-component `handoff.md` and notify parent via `send_message`.

## Current Parent
- Conversation ID: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `apps/web/src/app/layout.tsx` (monolithic shell)
  - `apps/web/src/app/globals.css` (Tailwind v4 `@source` setup)
  - `apps/web/package.json` & `apps/web/tsconfig.json`
  - `packages/ui/src/index.ts`
  - `packages/ui/src/components/navbar.tsx`
  - `packages/ui/src/components/button.tsx`
  - `packages/ui/src/components/input.tsx`
  - `packages/ui/src/theme/theme-toggle.tsx`, `theme-provider.tsx`, `theme-script.tsx`, `use-theme.ts`
  - `tests/unit/components.test.ts` & `tests/e2e/challenger-m2-empirical.test.ts` (test coverage for Navbar & blackout elimination)
- **Key findings**:
  1. `lucide-react` does not export `Github`, `Twitter`, `Linkedin`; accessible inline SVGs are required to prevent build failures.
  2. Current `layout.tsx` has no mobile navigation at all, and hides "Sign In" under 640px (`hidden sm:inline-flex`), causing a mobile dead-end.
  3. `@repo/ui` `Button` has no `asChild` prop; links must use `buttonVariants({ variant, size })` on `<a>`.
  4. Tailwind v4 `@source "../../../../packages/ui/src"` in `globals.css` is completely valid and verified consistent with console and admin apps.
  5. `apps/web` tsconfig has no path aliases; relative imports (`../components/*`) are required.
- **Unexplored areas**: None remaining for web shell scope.

## Key Decisions Made
- Designed `SiteHeader` (`apps/web/src/components/site-header.tsx`) with `@repo/ui` `Navbar` compound components, active route detection, mobile drawer unsuppressing all links, segmented theme toggle, and vertical action stack.
- Designed `SiteFooter` (`apps/web/src/components/site-footer.tsx`) with 4-column structured navigation, newsletter signup (`Input` + `Button` with state feedback), and copyright row with `useTheme` indicator.
- Designed clean `RootLayout` (`apps/web/src/app/layout.tsx`) modularizing shell into `SiteHeader`, `main`, and `SiteFooter`.
- Provided dual exports (`header.tsx` and `footer.tsx`) and `index.ts` for clean backward/cross compatibility.

## Artifact Index
- `DISPATCH.md` — Incoming dispatch instructions
- `BRIEFING.md` — Working state and memory
- `progress.md` — Liveness heartbeat
- `redesign_plan.md` — Complete architecture design and recommended copy-pasteable component code
- `handoff.md` — Self-contained 5-component handoff report
