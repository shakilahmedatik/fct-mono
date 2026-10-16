# Project: FirstCup Design System & Applications Overhaul

## Architecture
- **Monorepo Structure**: Turborepo + Bun workspaces (`packages/*`, `apps/*`).
  - `packages/ui` (`@repo/ui`): Shared design system, Tailwind v4 theme, zero-FOUC theme provider, accessible UI primitive components.
  - `packages/config-ts`: Shared TypeScript configurations.
  - `packages/config-biome`: Shared Biome linter and formatter configuration.
  - `apps/web`: Next.js 16 public marketing site (Landing, Pricing, Blog, Blog Posts, Contact).
  - `apps/console`: Next.js 16 subscriber intelligence console (Auth, Dashboard, Preferences, Billing).
  - `apps/admin`: Next.js 16 administrative command center (Admin Shell, Dashboard KPIs, User Directory, Digest Curation, AI Playground).
- **Styling & Token Architecture**:
  - Tailwind CSS v4 (`tailwindcss@^4.3.3`, `@tailwindcss/postcss@^4.3.3`).
  - `@repo/ui/src/styles.css`: Centralized CSS variables (HSL) under `:root` and `.dark`, bridged to Tailwind v4 via `@theme` color definitions and `@variant dark`.
  - App CSS (`apps/*/src/app/globals.css`): `@import "tailwindcss"; @import "@repo/ui/styles.css"; @source "../../../../packages/ui/src";`.
- **Theme Mechanics (Zero-FOUC)**:
  - `<ThemeScript />`: Inline render-blocking `<script>` placed in `<head>` of root layouts that reads `localStorage.getItem("fc-theme")` or queries `window.matchMedia("(prefers-color-scheme: dark)")` and injects `.dark` class onto `document.documentElement` before first paint.
  - `suppressHydrationWarning`: Set on `<html lang="en">` across all applications.
  - `<ThemeProvider />`: React Context provider in `@repo/ui` managing `'light' | 'dark' | 'system'` state, syncing with `localStorage` and `storage` cross-tab events.
  - `<ThemeToggle />`: Accessible dropdown/toggle button with Sun/Moon/Monitor icons.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Tailwind v4 Theme Tokens | Semantic HSL variables mapped via `@theme` in `packages/ui/src/styles.css` (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring) | M1 | Survey Infra |
| F02 | WCAG AA Color Compliance | High-contrast palette in both light and dark modes (4.5:1 text, 3:1 UI borders/controls) | M1 | Survey Infra |
| F03 | Zero-FOUC ThemeScript | Inline script preventing flash of unstyled theme on page load | M1 | Survey Infra |
| F04 | Dynamic ThemeProvider | React Context provider managing theme (`light`, `dark`, `system`) with localStorage & cross-tab sync | M1 | Survey Infra |
| F05 | ThemeToggle Component | Accessible UI component for user theme switching | M1 | Survey Infra |
| F06 | Tailwind Content Discovery | App `globals.css` configuration with `@source` for UI package token synthesis | M1 | Survey Infra |
| F07 | Button & IconButton | Variant-driven button (`primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`) with active, focus-visible, disabled states | M2 | Survey UI |
| F08 | Badge Component | Semantic status badges (`default`, `secondary`, `outline`, `success`, `warning`, `destructive`) | M2 | Survey UI |
| F09 | Card Primitive Suite | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` with hover and elevation support | M2 | Survey UI |
| F10 | Form Controls Suite | `Input`, `Textarea`, `Label`, `Select` / `Dropdown`, `Switch` / `Toggle` with accessible labels, errors, and focus rings | M2 | Survey UI |
| F11 | Dialog / Modal Suite | Accessible modal overlay (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`) | M2 | Survey UI |
| F12 | Alert & Callout | Accessible contextual banner (`Alert`, `AlertTitle`, `AlertDescription`) with variants (`default`, `info`, `warning`, `destructive`, `success`) | M2 | Survey UI |
| F13 | Table Component Suite | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` | M2 | Survey UI |
| F14 | StatCard / KPI Tile | Metric tile with title, value, icon, trend indicator (`positive`, `negative`, `neutral`), and subtitle | M2 | Survey UI |
| F15 | Tabs Suite | Tab navigation (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) with keyboard navigation | M2 | Survey UI |
| F16 | Tooltip Primitive | Accessible tooltip with hover/focus disclosure | M2 | Survey UI |
| F17 | Navigation Suite | `Navbar`, `Sidebar`, `NavItem`, and mobile drawer primitives | M2 | Survey UI |
| F18 | EmptyState & Skeleton | Feedback states for empty data and loading skeletons | M2 | Survey UI |
| F19 | `apps/web` Landing Page | Hero with high-converting CTA, social proof, feature grid, audio digest preview card, newsletter form | M3 | Survey Apps |
| F20 | `apps/web` Pricing Page | Cohesive pricing cards, tier highlights, monthly/annual toggle, feature comparison matrix | M3 | Survey Apps |
| F21 | `apps/web` Blog & Blog Posts | Polished blog index, tag filtering, article card grids, readable typography, article detail layout | M3 | Survey Apps |
| F22 | `apps/web` Contact Page | Clean inquiry form using `@repo/ui` form controls, FAQ accordion/callout, contact channels | M3 | Survey Apps |
| F23 | `apps/web` Layout & Header | Global header with responsive mobile drawer, theme toggle, and unified footer | M3 | Survey Apps |
| F24 | `apps/console` Auth Layout Isolation | Separate unauthenticated `/login` route from authenticated console shell (fix sidebar leak) | M4 | Survey Apps |
| F25 | `apps/console` Shell & Navigation | Sidebar with dynamic active route indicator, mobile drawer, user profile, theme toggle | M4 | Survey Apps |
| F26 | `apps/console` Dashboard | Subscriber feed, daily audio digest player card, saved articles, topic chips, quick actions | M4 | Survey Apps |
| F27 | `apps/console` Preferences | Topic subscriptions, delivery time/cadence, audio voice preferences, email notifications | M4 | Survey Apps |
| F28 | `apps/console` Billing Page | Current plan card, usage meters, invoice history table, plan upgrade modal trigger | M4 | Survey Apps |
| F29 | `apps/console` Login / Auth Page | Clean, centered authentication card using `@repo/ui` form primitives and brand header | M4 | Survey Apps |
| F30 | `apps/admin` Shell & Navigation | Admin sidebar with active link styling, mobile toggle, operational status badge, theme toggle | M5 | Survey Apps |
| F31 | `apps/admin` Dashboard | Platform health metrics (`StatCard`), digest generation queue, user signups chart/metrics | M5 | Survey Apps |
| F32 | `apps/admin` User Directory | User table using `@repo/ui` `Table`, search/filter bar, role/status badges, action modal | M5 | Survey Apps |
| F33 | `apps/admin` Digest Curation | Digest pipeline review, audio script editor, status toggles, publication control | M5 | Survey Apps |
| F34 | `apps/admin` AI Playground | Interactive test workbench overhauled: replace window.prompt/alert with Dialog, use Select/Tabs, Lucide icons | M5 | Survey Apps |
| F35 | E2E Test Suite | Automated test harness verifying tokens, theme switching, component accessibility, and app rendering | M-E2E | Requirements |
| F36 | Monorepo Quality & Verification | Full workspace `turbo typecheck`, `biome check`, and Next.js builds passing with zero errors | M6 | Requirements |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Theme Foundations | Token system, CSS variables, `@theme` block, `<ThemeScript />`, `<ThemeProvider />`, `<ThemeToggle />`, WCAG AA verification | none | DONE (Verified: Gate PASS, 133 tests pass, Next.js builds clean) |
| M2 | Reusable Component Suite | Comprehensive primitives (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `Label`, `Select`, `Switch`, `Dialog`, `Alert`, `Table`, `StatCard`, `Tabs`, `Tooltip`, `Navbar`, `Sidebar`, `EmptyState`, `Skeleton`) in `@repo/ui` | M1 | DONE (Verified: Gate PASS Round 3, 231 tests pass, 62/62 E2E pass, 0 diagnostics, Auditor CLEAN) |
| M3 | Web App Revamp (`apps/web`) | Marketing site overhaul: landing, pricing, blog, blog posts, contact, layout, responsive navbar, theme toggle | M1, M2 | DONE (Verified: Gate PASS, Reviewers 1 & 2 APPROVE, Challengers 1 & 2 APPROVE, Auditor CLEAN, 314+ tests passing, 0 typecheck/lint errors) |
| M4 | Console App Revamp (`apps/console`) | Shell overhaul, auth isolation, dashboard, preferences, billing, login, theme toggle | M1, M2 | DONE (Verified: Gate PASS, Reviewers 1 & 2 APPROVE, Challengers 1 & 2 APPROVE, Auditor CLEAN, 62/62 E2E pass) |
| M5 | Admin App Revamp (`apps/admin`) | Command center overhaul, dashboard KPIs, user directory table, digest curation, AI playground | M1, M2 | DONE (Verified: Gate PASS, Reviewers 1 & 2 APPROVE, Challengers 1 & 2 APPROVE, Auditor CLEAN, 62/62 E2E pass) |
| M-E2E | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4) published as `TEST_READY.md` | none (Parallel) | DONE (62 tests across Tiers 1-4 passing) |
| M6 | Final Integration & Integrity Verification | Full monorepo typecheck, Biome lint, Next.js builds for all 3 apps, E2E test pass, forensic audit | M1, M2, M3, M4, M5, M-E2E | DONE (Verified: Gate PASS, Reviewers 1 & 2 APPROVE, Challenger APPROVE, Auditor CLEAN, 100% 62/62 E2E pass, 399 total tests pass) |

---

## Interface Contracts

### 1. Design Tokens & Theme Contract (`@repo/ui` ↔ All Apps)
- **Token Classnames**:
  - Backgrounds: `bg-background`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`
  - Text: `text-foreground`, `text-card-foreground`, `text-primary-foreground`, `text-muted-foreground`, `text-accent-foreground`, `text-destructive`
  - Borders & Rings: `border-border`, `border-input`, `ring-ring`
- **Theme API (`@repo/ui`)**:
  ```tsx
  import { ThemeProvider, useTheme, ThemeScript, ThemeToggle } from "@repo/ui";
  // Props:
  interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: "light" | "dark" | "system";
    storageKey?: string;
  }
  // Hook:
  const { theme, setTheme, resolvedTheme } = useTheme();
  ```

### 2. UI Component Suite Contracts (`@repo/ui` ↔ All Apps)
- **Form Controls**:
  - `Input`: `React.ComponentProps<"input"> & { error?: boolean }`
  - `Textarea`: `React.ComponentProps<"textarea"> & { error?: boolean }`
  - `Label`: `React.ComponentProps<"label"> & { required?: boolean }`
  - `Select`: Accessible custom or native-backed styled select.
  - `Switch`: `checked`, `onCheckedChange`, `disabled`, ARIA `role="switch"`.
- **Overlays & Feedback**:
  - `Dialog`: Compound (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`).
  - `Alert`: `variant?: "default" | "info" | "warning" | "destructive" | "success"`.
  - `Tooltip`: `content: React.ReactNode, children: React.ReactNode`.
- **Data & Layout**:
  - `Table`: Compound (`Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`).
  - `StatCard`: `{ title: string; value: string | number; change?: string; trend?: "positive" | "negative" | "neutral"; icon?: React.ReactNode; description?: string }`.
  - `Tabs`: Compound (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`).
  - `Sidebar` & `Navbar`: Semantic, accessible shell navigation components.

---

## Code Layout
- `packages/ui/`
  - `src/styles.css`: Central CSS variables, `@theme`, `@variant dark`
  - `src/theme/`: `theme-provider.tsx`, `theme-script.tsx`, `theme-toggle.tsx`, `use-theme.ts`
  - `src/components/`:
    - `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`, `switch.tsx`
    - `dialog.tsx`, `alert.tsx`, `tooltip.tsx`, `table.tsx`, `stat-card.tsx`, `tabs.tsx`
    - `navbar.tsx`, `sidebar.tsx`, `empty-state.tsx`, `skeleton.tsx`
  - `src/lib/utils.ts`: `cn` helper (`clsx` + `tailwind-merge`)
  - `src/index.ts`: Public export surface
- `apps/web/`
  - `src/app/globals.css`: Imports `@repo/ui/styles.css` with `@source`
  - `src/app/layout.tsx`: Root layout with `ThemeScript` and `ThemeProvider`
  - `src/app/page.tsx`: Revamped marketing landing page
  - `src/app/pricing/page.tsx`: Revamped pricing tiers
  - `src/app/blog/page.tsx` & `[slug]/page.tsx`: Revamped blog index and post detail
  - `src/app/contact/page.tsx`: Revamped contact page
  - `src/components/`: App-specific composed sections (Hero, Features, Header, Footer)
- `apps/console/`
  - `src/app/globals.css`: Imports `@repo/ui/styles.css` with `@source`
  - `src/app/layout.tsx`: Root layout with `ThemeScript` and `ThemeProvider`
  - `src/app/(auth)/login/page.tsx`: Clean standalone login without console sidebar
  - `src/app/(dashboard)/layout.tsx`: Authenticated dashboard shell with dynamic sidebar
  - `src/app/(dashboard)/dashboard/page.tsx`: Subscriber daily intelligence feed
  - `src/app/(dashboard)/preferences/page.tsx`: User notification & topic preferences
  - `src/app/(dashboard)/billing/page.tsx`: Plan management & invoices
- `apps/admin/`
  - `src/app/globals.css`: Imports `@repo/ui/styles.css` with `@source`
  - `src/app/layout.tsx`: Root layout with `ThemeScript` and `ThemeProvider`
  - `src/app/dashboard/page.tsx`: Platform KPI stats & operations overview
  - `src/app/users/page.tsx`: User directory with data table and status chips
  - `src/app/digests/page.tsx`: Digest curation pipeline review
  - `src/app/playground/page.tsx`: Overhauled test playground using `@repo/ui` dialogs, selects, tabs
