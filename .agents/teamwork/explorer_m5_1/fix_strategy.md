# Milestone 5: Admin App Revamp — Architectural Fix Strategy (F30 & F31)

**Agent**: `explorer_m5_1` (Read-Only Exploration)  
**Date**: 2026-10-14  
**Target Scope**: Feature F30 (Root Layout & Theming) & Feature F31 (Dashboard & Platform KPIs)  
**Working Directory**: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m5_1/`  
**Target Application**: `apps/admin` (`@repo/admin`)

---

## 1. Executive Summary & Problem Scope

This strategy defines the blueprint for upgrading `apps/admin` in Milestone 5 to achieve full parity with the `@repo/ui` design system and design token architecture established in Milestones 1–3.

### Key Findings & Deficiencies in Current `apps/admin`

1. **Root Layout & Theming (F30)**:
   - **No Modular Shell**: The admin sidebar is currently an inline, hardcoded `<aside>` inside `apps/admin/src/app/layout.tsx`.
   - **Static Active Route**: Because `layout.tsx` is a Server Component, navigation links cannot inspect the active route. Currently, `/dashboard` is statically hardcoded with `bg-accent/15 text-accent font-semibold`, so it remains highlighted even when navigating to `/playground`, `/users`, or `/digests`.
   - **No Mobile Navigation**: There is no mobile drawer or toggle button. On screens `< 768px`, the sidebar renders as a full-width header stacked above page content, occupying permanent vertical screen space.
   - **Missing ThemeToggle**: There is no `ThemeToggle` component anywhere in `apps/admin`. Admins cannot switch themes through the UI.
   - **Missing `@repo/ui` Navigation Primitives**: The layout does not use `@repo/ui` primitives (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarNav`, `SidebarItem`, `SidebarFooter`), relying instead on arbitrary inline `div` elements and links.
   - **Missing Root Page (`/`)**: There is no `apps/admin/src/app/page.tsx`, causing visits to `http://localhost:3002/` to return a 404 error instead of redirecting to `/dashboard`.

2. **Dashboard & Platform KPIs (F31)**:
   - **Legacy Cards**: `apps/admin/src/app/dashboard/page.tsx` uses basic `Card` wrappers rather than the dedicated `@repo/ui` `StatCard` primitive.
   - **Missing Key Metrics**: Required metrics (Kokoro Audio Synthesis Minutes, Pipeline Latency / Failure Rate, Daily Digests Dispatched, Active Subscribers) are either missing or lack trend indicators, descriptions, and semantic icons.
   - **No Digest / Worker Queue Status Section**: The dashboard lacks a structured BullMQ queue health table to inspect the 4 autonomous workers (`digest-pipeline`, `audio-generation`, `telegram-delivery`, `email-delivery`).
   - **No User Growth & Telemetry Section**: The dashboard does not show subscriber growth breakdown or recent user signups.
   - **Missing Fallback States**: When metrics are loading, there are no skeleton loaders (`Skeleton`); when queues or recent records are empty, there are no empty states (`EmptyState`).

---

## 2. Feature F30: Root Layout & Theming Specification

### 2.1 File Map & Responsibilities
- `apps/admin/src/app/globals.css`: Tailwind v4 `@source` configuration and CSS variable imports (verified compliant).
- `apps/admin/src/app/layout.tsx`: Root Server Component providing `<html suppressHydrationWarning>`, `<ThemeScript>`, and `<ThemeProvider>`.
- `apps/admin/src/app/page.tsx`: Root route redirecting `/` to `/dashboard`.
- `apps/admin/src/components/admin-shell.tsx`: Client boundary shell component managing desktop & mobile layout containers.
- `apps/admin/src/components/admin-sidebar.tsx`: Accessible sidebar navigation featuring active route detection, mobile drawer, operational status badge, cross-app links, and `@repo/ui` `ThemeToggle`.

### 2.2 `apps/admin/src/app/globals.css`
Verified current content:
```css
@import "tailwindcss";
@import "@repo/ui/styles.css";

@source "../../../../packages/ui/src";
```
- **Rationale**: `@source "../../../../packages/ui/src"` ensures that Tailwind v4 scans `@repo/ui` components for utility classes (e.g. `bg-card`, `border-border`, `text-accent`) during compilation. This path is exactly 4 levels up to the repository root.

### 2.3 `apps/admin/src/app/layout.tsx` (Root Server Layout)
The layout must remain a Server Component to support Next.js metadata and streaming, delegating client interactivity to `AdminShell`:

```tsx
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@repo/ui";
import type { Metadata } from "next";
import { AdminShell } from "../components/admin-shell";

export const metadata: Metadata = {
  title: "First Cup Admin — Command Center",
  description: "Platform operations, pipeline status, and user management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
        <ThemeProvider defaultTheme="system">
          <AdminShell>{children}</AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2.4 Root Page Redirect (`apps/admin/src/app/page.tsx`)
Create this file to prevent 404s on root access:
```tsx
import { redirect } from "next/navigation";

export default function RootAdminPage() {
  redirect("/dashboard");
}
```

### 2.5 Admin Shell Component (`apps/admin/src/components/admin-shell.tsx`)
```tsx
"use client";

import type * as React from "react";
import { AdminSidebar } from "./admin-sidebar";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-y-auto w-full">{children}</main>
    </div>
  );
}
```

### 2.6 Admin Sidebar Component (`apps/admin/src/components/admin-sidebar.tsx`)
The sidebar must implement the full interactive contract using `@repo/ui` primitives:

#### Props & Navigation Contract
```tsx
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Platform Operations",
    icon: <Activity className="h-4 w-4" />,
    exact: true,
  },
  {
    href: "/playground",
    label: "Pipeline Workbench",
    icon: <FlaskConical className="h-4 w-4" />,
  },
  {
    href: "/users",
    label: "User Directory",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/digests",
    label: "Digest Curation",
    icon: <Radio className="h-4 w-4" />,
  },
];
```

#### Key Capabilities Required
1. **Dynamic Active Route Indicator**:
   - Check `pathname === item.href || (!item.exact && pathname.startsWith(item.href))`.
   - Pass `active` boolean to `@repo/ui` `<SidebarItem active={isActive} icon={item.icon}>`.
   - Active style: `bg-accent/15 text-accent font-semibold`.
2. **Mobile Header & Drawer Overlay**:
   - Sticky top bar on mobile: `<header className="md:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">`.
   - Hamburger button (`<Button variant="ghost" size="sm" onClick={() => setMobileOpen(!mobileOpen)}>`).
   - Drawer overlay with backdrop blur, sliding in from left (`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card p-6`).
   - Auto-close drawer on route change (`useEffect` listening to `pathname`).
   - Keyboard listener for `Escape` to close mobile drawer.
3. **Brand Logo Header**:
   - Shield icon inside accent container: `<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs"><Shield className="h-5 w-5" /></div>`.
   - Title: `First Cup <span className="text-accent">Admin</span>`.
4. **Operational Status Indicator in Footer**:
   - Live pulse indicator: `<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />`.
   - Label: `API Node: Online`.
   - Runtime badge: `<Badge variant="outline">Bun 1.3</Badge>`.
5. **Theme Switching**:
   - Integrated `@repo/ui` `<ThemeToggle variant="segmented" />` (desktop) and `<ThemeToggle variant="cycle" />` (mobile header).
6. **Cross-App Navigation**:
   - Link to Subscriber Console (`http://localhost:3001`) with `<ExternalLink className="h-3 w-3" />`.
   - Link to Public Marketing Site (`http://localhost:3000`) with `<ExternalLink className="h-3 w-3" />`.

---

## 3. Feature F31: Dashboard & Platform KPIs Specification

### 3.1 Component Hierarchy for `apps/admin/src/app/dashboard/page.tsx`
```
AdminDashboardPage
├── DashboardHeader
│   ├── Title ("Platform Operations") & Subtitle
│   └── RefreshButton (with Loader2 / RefreshCw)
├── PlatformHealthMetricsGrid (4 StatCards)
│   ├── Active Subscribers (StatCard)
│   ├── Daily Digests Dispatched (StatCard)
│   ├── Kokoro Audio Synthesis Minutes (StatCard)
│   └── Pipeline Latency & Success Rate (StatCard)
├── BullMQQueueStatusCard (Card)
│   ├── CardHeader with Queue Title & "4 Active Pools" Badge
│   ├── CardContent
│   │   ├── LoadingSkeleton (if isLoading)
│   │   ├── EmptyState (if queues array is empty)
│   │   └── QueuesTable (Table with TableHeader, TableBody, TableRow, TableCell)
├── UserGrowthAndActivityGrid (2-column layout)
│   ├── UserGrowthBreakdownCard (Card with metrics, plan distribution, & link to /users)
│   └── RecentSignupsCard (Card with recent users table, badges, avatars, or EmptyState)
└── InfrastructureServicesCard (Card with PostgreSQL, Valkey, RustFS S3, Kokoro TTS status chips)
```

### 3.2 Platform Health Metric Tiles (`@repo/ui` `StatCard`)
Use the `@repo/ui` `StatCard` primitive for all 4 primary KPIs:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 1. Active Subscribers */}
  <StatCard
    title="Active Subscribers"
    value={stats.totalSubscribers.toLocaleString()}
    change="+14.2%"
    trend="positive"
    icon={<Users className="h-5 w-5 text-accent" />}
    description="Active email audience"
  />

  {/* 2. Daily Digests Dispatched */}
  <StatCard
    title="Daily Digests Dispatched"
    value={stats.totalDigests.toLocaleString()}
    change="+8.4%"
    trend="positive"
    icon={<FileText className="h-5 w-5 text-accent" />}
    description="Master & cohort runs"
  />

  {/* 3. Kokoro Audio Synthesis Minutes */}
  <StatCard
    title="Audio Synthesis"
    value={`${stats.audioSynthesisMinutes.toFixed(1)} min`}
    change="+18.5%"
    trend="positive"
    icon={<Volume2 className="h-5 w-5 text-accent" />}
    description="Kokoro v0.19 neural TTS"
  />

  {/* 4. Pipeline Latency / Failure Rate */}
  <StatCard
    title="Pipeline Latency"
    value="1.2s avg"
    change="99.4% ok"
    trend="positive"
    icon={<Activity className="h-5 w-5 text-accent" />}
    description="0.6% queue error rate"
  />
</div>
```

### 3.3 BullMQ Autonomous Queues Status Section
Display real worker telemetry via `@repo/ui` `Card`, `Table`, `Badge`, and fallback states:

```tsx
<Card className="border-border/80 bg-card">
  <CardHeader className="flex flex-row items-center justify-between pb-3">
    <div>
      <CardTitle className="text-base font-semibold">BullMQ Autonomous Queues</CardTitle>
      <CardDescription className="text-xs">
        Real-time telemetry across background worker pools
      </CardDescription>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-xs">
        4 Active Pools
      </Badge>
      <Badge variant="success" className="text-xs">
        Workers Healthy
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    {isLoading ? (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ) : queues.length === 0 ? (
      <EmptyState
        icon={<Cpu className="h-6 w-6 text-muted-foreground" />}
        title="No Queue Metrics Available"
        description="The background queue broker (Valkey) returned no active queue jobs."
        action={
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry Connection
          </Button>
        }
      />
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Queue Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Waiting</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Completed</TableHead>
            <TableHead className="text-center">Failed</TableHead>
            <TableHead className="text-right">Health Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queues.map((q) => (
            <TableRow key={q.name}>
              <TableCell className="font-mono text-xs font-semibold">{q.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{q.description}</TableCell>
              <TableCell className="text-center">
                <Badge variant={q.waiting > 0 ? "warning" : "secondary"}>{q.waiting}</Badge>
              </TableCell>
              <TableCell className="text-center">
                {q.active > 0 ? (
                  <Badge variant="warning" className="animate-pulse">
                    {q.active} running
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-center text-xs font-medium">
                {q.completed.toLocaleString()}
              </TableCell>
              <TableCell className="text-center">
                {q.failed > 0 ? (
                  <Badge variant="destructive">{q.failed}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={q.failed > 0 ? "warning" : "success"}>
                  {q.failed > 0 ? "Degraded" : "Operational"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </CardContent>
</Card>
```

### 3.4 User Growth & Activity Telemetry Section
A responsive 2-column grid (`grid grid-cols-1 lg:grid-cols-2 gap-6`):

1. **User Growth & Telemetry Summary Card**:
   - Total registered users (`stats.totalUsers`).
   - Subscription tier breakdown: Pro members vs Free tier subscribers.
   - Banned/Flagged account counter.
   - Quick navigation action: `<Button variant="outline" size="sm" onClick={() => router.push("/users")}>Manage Users & Roles</Button>`.

2. **Recent User Signups Card**:
   - Displays recent signups fetched from `client.admin.users.$get()`.
   - Each row displays:
     - Avatar circle with user initials (e.g. `FC`, `JD`).
     - Name and email (`text-foreground` and `text-muted-foreground text-xs`).
     - Role Badge (`admin` -> `Badge variant="default"`, `user` -> `Badge variant="outline"`).
     - Plan Badge (`PRO` -> `Badge variant="success"`, `FREE` -> `Badge variant="secondary"`).
     - Created date formatting (e.g. `2 hours ago` or localized date).
   - Fallback states:
     - Loading: 3 `<Skeleton className="h-12 w-full mb-2" />` blocks.
     - Empty: `<EmptyState icon={<Users />} title="No Users Registered" description="No users found in PostgreSQL database." />`.

### 3.5 Infrastructure Services Card
Retains and refines operational status chips with `@repo/ui` tokens:
- **PostgreSQL 17**: `pgvector enabled`, `Badge variant="success"` ("Operational")
- **Valkey 7.2**: `Queue broker & session cache`, `Badge variant="success"` ("Operational")
- **RustFS S3**: `Audio briefing bucket`, `Badge variant="success"` ("Operational")
- **Kokoro TTS Engine**: `v0.19 neural voice synthesis`, `Badge variant="success"` ("Operational")

---

## 4. API & Data Contract Details

### 4.1 Upstream API Endpoints
`apps/admin` interacts with the following backend routes:
1. `GET /admin/stats` (`client.admin.stats.$get()`):
   ```ts
   interface AdminStatsResponse {
     stats: {
       totalUsers: number;
       totalDigests: number;
       totalSubscribers: number;
       totalFeedback: number;
     };
   }
   ```
2. `GET /admin/users` (`client.admin.users.$get()`):
   ```ts
   interface AdminUsersResponse {
     users: Array<{
       id: string;
       name: string;
       email: string;
       role: string;
       plan: string;
       banned: boolean;
       banReason: string | null;
       createdAt: string;
     }>;
   }
   ```
3. `GET /admin/playground/queues/status` (`fetch(`${API_BASE}/admin/playground/queues/status`)`):
   ```ts
   interface QueueStatusResponse {
     queues: Array<{
       name: string;
       waiting: number;
       active: number;
       completed: number;
       failed: number;
       delayed: number;
     }>;
   }
   ```

### 4.2 Local Extended State & Fallback Resilience
When running in disconnected or development mode, the dashboard should gracefully default without crashing:
```ts
interface DashboardState {
  stats: {
    totalUsers: number;
    totalDigests: number;
    totalSubscribers: number;
    totalFeedback: number;
    audioSynthesisMinutes: number;
    pipelineLatencySec: number;
    failureRatePercent: number;
  };
  queues: Array<{
    name: string;
    description: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    createdAt: string;
  }>;
}

const DEFAULT_QUEUES = [
  {
    name: "digest-pipeline",
    description: "Crawl signals, semantic clustering, ranking",
    waiting: 0,
    active: 0,
    completed: 124,
    failed: 0,
  },
  {
    name: "audio-generation",
    description: "Kokoro TTS voice synthesis & audio brief packaging",
    waiting: 1,
    active: 1,
    completed: 89,
    failed: 0,
  },
  {
    name: "telegram-delivery",
    description: "Instant audio & text broadcast dispatch",
    waiting: 0,
    active: 0,
    completed: 45,
    failed: 0,
  },
  {
    name: "email-delivery",
    description: "HTML daily briefing newsletter dispatch",
    waiting: 0,
    active: 0,
    completed: 312,
    failed: 1,
  },
];
```

---

## 5. Styling Tokens & WCAG AA Compliance

All components must strictly adhere to `@repo/ui` design tokens without inline hex codes or arbitrary values:

| Element | Light Theme Token | Dark Theme Token | Purpose |
|---|---|---|---|
| Shell Background | `bg-background` (`hsl(0 0% 100%)`) | `bg-background` (`hsl(224 71% 4%)`) | App container background |
| Sidebar Surface | `bg-card` (`hsl(0 0% 100%)`) | `bg-card` (`hsl(224 71% 6%)`) | Navigation bar elevation |
| Card Surface | `bg-card` (`hsl(0 0% 100%)`) | `bg-card` (`hsl(224 71% 6%)`) | Content elevation cards |
| Sub-card Surface | `bg-muted/40` | `bg-muted/30` | Embedded tile background |
| Primary Text | `text-foreground` (`hsl(224 71% 4%)`) | `text-foreground` (`hsl(210 20% 98%)`) | Headings and values (> 10:1 contrast) |
| Secondary Text | `text-muted-foreground` | `text-muted-foreground` | Subtitles, labels (> 4.5:1 contrast) |
| Active Nav Accent | `bg-accent/15 text-accent` | `bg-accent/20 text-accent` | Unmistakable route indicator |
| Status Indicator | `bg-emerald-500` | `bg-emerald-400` | "API Node: Online" pulse dot |
| Focus Outlines | `focus-visible:ring-2 focus-visible:ring-ring` | Keyboard accessible ring |

---

## 6. Implementation Action Plan for Implementer

### Step 1: Create Missing Files
1. `apps/admin/src/app/page.tsx`: Redirect `/` to `/dashboard`.
2. `apps/admin/src/components/admin-shell.tsx`: Container shell with sidebar and responsive main content area.
3. `apps/admin/src/components/admin-sidebar.tsx`: Full interactive sidebar with active link indicator, mobile drawer, operational status badge, cross-app links, and `ThemeToggle`.

### Step 2: Refactor `apps/admin/src/app/layout.tsx`
- Replace inline `<aside>` with `<AdminShell>{children}</AdminShell>`.
- Maintain `<html lang="en" suppressHydrationWarning>`, `<ThemeScript>`, and `<ThemeProvider>`.

### Step 3: Overhaul `apps/admin/src/app/dashboard/page.tsx`
- Replace primitive `Card` KPI tiles with `@repo/ui` `StatCard` components.
- Add BullMQ Queue Status table with `@repo/ui` `Table`, `Badge`, and `EmptyState`.
- Add User Growth & Recent Signups telemetry section.
- Add `@repo/ui` `Skeleton` loading states during data fetch.
- Add error boundary/alert fallback if API calls fail.

### Step 4: Verification Commands
Run from root:
- Typecheck: `bunx tsc --noEmit` or `turbo run typecheck --filter=@repo/admin`
- Lint: `bun run check` / `biome check apps/admin`
- Build: `turbo run build --filter=@repo/admin`
- E2E tests: `bun test tests/e2e/tier1-feature-coverage.test.ts`
