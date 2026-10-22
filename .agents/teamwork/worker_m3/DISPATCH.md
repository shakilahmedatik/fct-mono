## 2026-10-14T12:59:39Z
From: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
Priority: MESSAGE_PRIORITY_HIGH

You are Worker 3 (worker_m3), implementing Milestone 3: Web App Revamp (`apps/web`).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m3/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Explorer 1 redesign plan: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_1/redesign_plan.md`
- Explorer 2 redesign plan: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_2/redesign_plan.md`
- Explorer 3 redesign plan: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_3/redesign_plan.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/blog/page.tsx`
- `apps/web/src/app/blog/blog-index-client.tsx`
- `apps/web/src/app/blog/[slug]/page.tsx`
- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/components/*`

Tasks & Deliverables:
1. Shell & Navigation (from Explorer 3 plan):
   - Implement `apps/web/src/components/site-header.tsx` & `header.tsx`: fixed/sticky header with `@repo/ui` `Navbar`, brand coffee cup icon + FirstCup typography, dynamic `usePathname` active route highlighting, desktop `ThemeToggle`, and responsive mobile drawer unsuppressing links with stacked action buttons.
   - Implement `apps/web/src/components/site-footer.tsx` & `footer.tsx`: 4-column links layout, custom inline SVGs for GitHub/Twitter/LinkedIn (to prevent Lucide brand icon import errors), newsletter signup row with `@repo/ui` `Input` and `Button`, copyright row, and live `useTheme` indicator.
   - Update `apps/web/src/components/index.ts` barrel export.
   - Update `apps/web/src/app/layout.tsx`: wrap children with `ThemeScript`, `ThemeProvider`, `SiteHeader`, main wrapper (`min-h-screen flex flex-col`), and `SiteFooter`.
2. Landing Page & Pricing Page (from Explorer 1 plan):
   - Implement `apps/web/src/components/audio-digest-preview.tsx`: interactive mock player with play/pause state and animated soundwave bars.
   - Overhaul `apps/web/src/app/page.tsx`: Hero with badge, headline, subtitle, primary/secondary CTAs, 4 `@repo/ui` `StatCard` KPI metrics, interactive audio preview card, 6-card Feature Grid with Lucide icons (`Card`), executive testimonials section, FAQ accordion/grid (`Card`), final CTA banner.
   - Overhaul `apps/web/src/app/pricing/page.tsx`: Billing cadence toggle with `@repo/ui` `Switch` (Monthly vs Annual - Save 20%), 3 structured tier cards (Starter $0, Pro $9/mo or $7/mo annual with "Most Popular" badge & `border-primary`, Team $29/mo or $23/mo annual), feature checklists with Lucide `Check` and `Minus`, tier buttons, enterprise banner, and pricing FAQ.
3. Blog Suite & Contact Page (from Explorer 2 plan):
   - Implement `apps/web/src/app/blog/page.tsx` (SSR metadata) and `apps/web/src/app/blog/blog-index-client.tsx` (interactive client component with featured article hero card, category filter tabs using `@repo/ui` `Tabs`, search input, 6-card article grid, and newsletter callout).
   - Implement `apps/web/src/app/blog/[slug]/page.tsx`: back navigation link, article header with category badge, Executive Summary callout box (`Alert`), rich typography, author bio card, and related posts.
   - Implement `apps/web/src/app/contact/page.tsx`: two-column layout with contact form using `@repo/ui` `Label`, `Input`, `Textarea`, `Select`, `Button`, inquiry reason dropdown, interactive `@repo/ui` `Alert` submission banner, and support info sidebar card.
4. Clean code & Token hygiene:
   - All styling must strictly consume `@repo/ui` components and semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, etc.). No hardcoded hex codes.
5. Verification:
   - `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`
   - `./node_modules/.bin/biome check apps/web/src`
   - `./node_modules/.bin/tsc --noEmit -p apps/console/tsconfig.json && ./node_modules/.bin/tsc --noEmit -p apps/admin/tsconfig.json`
   - `bun test`
   - `bun tests/e2e/run-all.ts`
6. Record all changes in `changes.md` and complete a 5-section `handoff.md`. Send completion message to orchestrator when finished.
