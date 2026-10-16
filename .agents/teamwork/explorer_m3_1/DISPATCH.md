## 2026-10-14T12:48:43Z
From: 2d94057c-60a1-4b0c-9f22-cfd82486a9ea
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer 1 for Milestone 3 (explorer_m3_1), investigating the overhaul of the Marketing Landing Page and Pricing Page in `apps/web`.
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_1/`.
You MUST read:
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
- Existing landing page: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/web/src/app/page.tsx`
- Existing pricing page: `/Users/shakilahmedatik/Projects/firstcup-monorepo/apps/web/src/app/pricing/page.tsx`
- Available UI components in `@repo/ui`: check `packages/ui/src/index.ts` and `packages/ui/src/components/*`.

Tasks:
1. Analyze the current `page.tsx` and `pricing/page.tsx`. Identify outdated styles, missing sections, and hardcoded styling.
2. Design a comprehensive, production-grade redesign for `apps/web/src/app/page.tsx`:
   - Hero section with badge ("New: AI-curated audio briefs"), high-impact headline, subtitle, primary CTA button ("Get Started Free"), secondary CTA button ("Listen to Sample"), and social proof KPI cards using `@repo/ui` `StatCard`.
   - Audio Digest Interactive Preview card: mock player with play/pause button, audio wave indicator, title, and topic badges (`Badge`).
   - Feature Grid: 4-6 feature cards using `@repo/ui` `Card`, `CardHeader`, `CardTitle`, `CardDescription`, and Lucide icons (`Clock`, `Headphones`, `Sparkles`, `Shield`, `Zap`, `TrendingUp`).
   - Social proof / Testimonials section with user quotes, company names, and rating stars.
   - FAQ Accordion / Grid using `@repo/ui` `Card` or collapsible sections.
   - Final CTA banner card prompting user signup.
3. Design a comprehensive, production-grade redesign for `apps/web/src/app/pricing/page.tsx`:
   - Billing cadence toggle using `@repo/ui` `Switch` with "Monthly" and "Annual (Save 20%)" labels.
   - 3 structured pricing tier cards using `@repo/ui` `Card` (Free / Starter at $0, Pro / Individual at $9/mo or $7/mo annual, Team / Business at $29/mo or $23/mo annual).
   - Prominent badge on Pro tier ("Most Popular"), highlighted border with `border-primary` and elevation.
   - Feature checklists with Lucide `Check` and `Minus` icons.
   - Tier action buttons using `@repo/ui` `Button` variants (`default`, `outline`).
   - Enterprise inquiry callout banner and Pricing FAQ section.
4. Ensure all designed markup strictly consumes `@repo/ui` components and semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, etc.). No hardcoded hex codes.
5. Provide exact, copy-pasteable component code recommendations for the Worker. Do NOT modify source files yourself.
6. Write your recommendations to `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_1/redesign_plan.md` and complete `handoff.md`. Send completion message to orchestrator.
