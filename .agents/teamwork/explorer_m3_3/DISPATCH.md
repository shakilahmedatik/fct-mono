## 2026-10-14T12:48:43Z
[Message] timestamp=2026-10-14T12:48:43Z sender=2d94057c-60a1-4b0c-9f22-cfd82486a9ea priority=MESSAGE_PRIORITY_HIGH content=You are Explorer 3 for Milestone 3 (explorer_m3_3), investigating the overhaul of the Web App Shell, Layout, Navbar, and Footer in `apps/web`.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_3/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Existing layout: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/web/src/app/layout.tsx`
- Existing globals CSS: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/web/src/app/globals.css`
- Existing components in `apps/web/src/components/*`
- Available UI components in `@repo/ui`: check `packages/ui/src/index.ts` and `packages/ui/src/components/*`.

Tasks:
1. Inspect `apps/web/src/app/layout.tsx` and existing header/footer components in `apps/web/src/components/`.
2. Design a cohesive, production-grade Web Shell Architecture:
   - Header Component (`apps/web/src/components/header.tsx` or `site-header.tsx`):
     - Uses `@repo/ui` `Navbar`, `NavbarBrand`, `NavbarNav`, `NavbarLink`, `NavbarActions`, `NavbarMobileToggle`.
     - Brand logo: Coffee cup icon (`Coffee` from `lucide-react`) + "FirstCup" brand typography.
     - Navigation links: "Features", "Pricing", "Blog", "Contact".
     - Actions: `@repo/ui` `ThemeToggle`, "Sign In" button (link to Console login: `http://localhost:3001/login` or relative), "Get Started" button.
     - Responsive mobile drawer: fully functional across all viewports (0px to 767px), unsuppressing links, with action buttons stacked vertically.
   - Footer Component (`apps/web/src/components/footer.tsx` or `site-footer.tsx`):
     - Multi-column layout:
       - Col 1: Brand description, social links (`Github`, `Twitter`, `Linkedin`).
       - Col 2: Product links ("Features", "Audio Briefs", "Pricing", "Changelog").
       - Col 3: Resources links ("Blog", "Documentation", "Community", "Status").
       - Col 4: Company links ("About", "Careers", "Contact", "Privacy", "Terms").
     - Newsletter signup row with `@repo/ui` `Input` and `Button`.
     - Copyright row: "© 2026 FirstCup, Inc. All rights reserved." + system theme indicator.
   - Root Layout (`apps/web/src/app/layout.tsx`):
     - Wraps children in `<ThemeScript />`, `<ThemeProvider>`, site header, main content wrapper (`min-h-screen flex flex-col`), and site footer.
     - `suppressHydrationWarning` on `<html>`.
3. Verify Tailwind v4 `@source` setup in `apps/web/src/app/globals.css`.
4. Provide exact, copy-pasteable component code recommendations for the Worker. Do NOT modify source files yourself.
5. Write your recommendations to `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_3/redesign_plan.md` and complete `handoff.md`. Send completion message to orchestrator.
