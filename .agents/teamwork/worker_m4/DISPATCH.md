## 2026-10-14T15:59:43Z

You are worker_m4 (versatile implementation and QA worker).
Your working directory is `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/worker_m4/`.
Your project root is `/Users/shakilahmedatik/Projects/firstcup-monorepo`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
1. `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/shakilahmedatik/Projects/firstcup-monorepo/PROJECT.md`
3. Explorer Strategies:
   - `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m4_1/fix_strategy.md` (Shell, Layout, Auth Isolation, Login)
   - `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m4_2/fix_strategy.md` (Dashboard & Subscriber Feed)
   - `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m4_3/fix_strategy.md` (Navigation, Preferences, Billing)

FILES YOU OWN EXCLUSIVELY:
- `apps/console/src/app/layout.tsx`
- `apps/console/src/app/page.tsx`
- `apps/console/src/app/(auth)/login/page.tsx`
- `apps/console/src/app/dashboard/page.tsx`
- `apps/console/src/app/preferences/page.tsx`
- `apps/console/src/app/billing/page.tsx`
- `apps/console/src/components/console-shell.tsx`
- `apps/console/src/components/console-sidebar.tsx`
- `packages/ui/src/components/{dialog.tsx,tabs.tsx,navbar.tsx,tooltip.tsx,switch.tsx}` (ensure "use client"; directive is at the very top of each if missing, so Next.js build and Turbopack succeed)

DETAILED IMPLEMENTATION REQUIREMENTS FOR MILESTONE 4:

1. `@repo/ui` Client Directives:
   Check `packages/ui/src/components/dialog.tsx`, `tabs.tsx`, `navbar.tsx`, `tooltip.tsx`, `switch.tsx`.
   Ensure each starts with `"use client";` so Next.js Turbopack does not fail during server-side evaluation.

2. Auth Isolation (Feature F24) & Layout (Feature F25):
   CRITICAL: Do NOT move `dashboard/page.tsx`, `preferences/page.tsx`, or `billing/page.tsx` into a `(dashboard)` subfolder! Existing E2E tests (`tests/e2e/tier1-feature-coverage.test.ts` and `tests/e2e/tier4-real-world.test.ts`) require these exact file paths.
   Instead, implement layout partitioning via `ConsoleShell`:
   - `apps/console/src/app/layout.tsx`: Root layout with `<ThemeScript defaultTheme="system" />` in `<head>`, `suppressHydrationWarning` on `<html>`, and `<body>` with `<ThemeProvider defaultTheme="system"><ConsoleShell>{children}</ConsoleShell></ThemeProvider>`.
   - `apps/console/src/components/console-shell.tsx` ("use client"): Uses `usePathname()`. If `pathname.startsWith("/login")`, renders `{children}` without sidebar or console chrome. Otherwise, renders `ConsoleSidebar` + `<main className="flex-1 min-h-screen overflow-y-auto ...">{children}</main>`.
   - `apps/console/src/components/console-sidebar.tsx` ("use client"): Built using `@repo/ui` primitives (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarNav`, `SidebarItem`, `SidebarFooter`, and `ThemeToggle`). Uses `usePathname()` for dynamic active route indication (`/dashboard`, `/preferences`, `/billing`). Includes responsive mobile drawer with hamburger toggle. User profile footer includes FC initials, user title, `PRO` badge, `ThemeToggle`, external link, and Sign Out.
   - `apps/console/src/app/page.tsx`: Redirects `/` to `/dashboard`.

3. Login / Auth Page (Feature F29):
   `apps/console/src/app/(auth)/login/page.tsx` ("use client"):
   Centered login card using `@repo/ui` primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Input`, `Label`, `Button` (with `isLoading` support), `Alert` (for errors), `ThemeToggle`, and link back to marketing home. Ensure mock auth works with `@repo/api-client` `authClient.signIn.email` / `signUp.email` fallback.

4. Dashboard & Subscriber Intelligence Feed (Feature F26):
   `apps/console/src/app/dashboard/page.tsx` ("use client"):
   - Header with greeting ("Good morning, Alex"), current formatted date (client-mounted to avoid hydration mismatch), search `Input` with search icon, and quick action buttons.
   - Daily Audio Digest Player Card using `@repo/ui` `Card`, `Badge variant="success"`, Play/Pause/Skip buttons, audio speed toggle cycling through 1.0x/1.25x/1.5x/2.0x, seekable progress bar, animated soundwave visualizer, and collapsible transcript.
   - 4 Metric Tiles using `@repo/ui` `StatCard` in a responsive 4-column grid (Streak, Saved Briefings, Audio Listening Time, Topics Followed).
   - Topic/Intelligence Feed using `@repo/ui` `Tabs` ("All", "AI", "Systems", "Databases", "Saved") and real-time search filtering. Article cards using `@repo/ui` `Card` (`interactive`), `Badge` topic chips, "Why it matters" callouts, source link, bookmark toggle, and feedback buttons.
   - Fallbacks: `@repo/ui` `Skeleton` for loading and `EmptyState` for zero search/empty saved.

5. Preferences Page (Feature F27):
   `apps/console/src/app/preferences/page.tsx` ("use client"):
   - Topic subscriptions using `@repo/ui` `Card`, row items with topic `Badge`, description, and `@repo/ui` `Switch`.
   - Delivery cadence (`Select`) and dispatch time (`Input type="time"`), plus timezone (`Select`).
   - Executive Voice Briefing master toggle (`Switch`) + Neural Voice Persona selector (`Select` with Alloy, Nova, Echo, Shimmer, Onyx) + playback speed (`Select`).
   - Email notifications master toggle (`Switch`) + critical security alerts toggle (`Switch`).
   - Telegram Chat ID / Username `Input` with "Test Connection" button.
   - Save confirmation alert using `@repo/ui` `Alert` (`variant="success"`).

6. Billing Page (Feature F28):
   `apps/console/src/app/billing/page.tsx` ("use client"):
   - Current plan card using `@repo/ui` `Card`, `Badge variant="success"` "Active Trial", renewal date, "Manage via Paddle" button.
   - Resource quota meters card with 4 progress bars: Daily Briefings (26/30), Voice Audio Minutes (78/100m), Instant Alerts/Webhooks (1,420/5,000), Archived Briefings (45/500).
   - Invoice history using `@repo/ui` `Table` (`TableHeader`, `TableBody`, `TableRow`, `TableCell`) with past invoices and status `Badge` (Paid / Settled).
   - Plan upgrade modal using `@repo/ui` `Dialog` (`DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`) displaying upgrade tiers.

VERIFICATION REQUIRED:
You MUST execute and verify all of the following commands:
1. `bun run --filter @repo/console typecheck` (or `bun x tsc --project apps/console/tsconfig.json --noEmit`)
2. `bun x @biomejs/biome check apps/console/src`
3. `bun run --filter @repo/console build`
4. `bun test tests/e2e/tier1-feature-coverage.test.ts`
5. `bun test tests/e2e/tier4-real-world.test.ts`
