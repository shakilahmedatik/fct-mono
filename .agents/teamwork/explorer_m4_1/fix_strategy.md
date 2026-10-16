# Milestone 4 Exploration & Fix Strategy: Console App Revamp (`apps/console`)

**Author**: `explorer_m4_1` (Read-Only Exploration Agent)  
**Date**: 2026-10-14  
**Scope**: Milestone 4 (`apps/console` revamp), focusing on Root Layout & Theming, Route Architecture & Auth Isolation (F24), Login / Auth Page (F29), and Monorepo Build Integrity.

---

## 1. Executive Summary

`apps/console` is the subscriber intelligence dashboard application for FirstCup, providing executive tech briefs, audio briefings, topic preferences, and billing management. In its current pre-M4 state:
1. **Sidebar Leakage on Unauthenticated Route (`/login`)**: The dashboard shell (`<aside>`) is hardcoded directly inside `apps/console/src/app/layout.tsx`. Because `RootLayout` wraps every page, visiting `/login` renders the console navigation sidebar alongside the login form, violating Feature F24 ("Auth Layout Isolation").
2. **Static Navigation & Missing Theming Controls**: The sidebar in `RootLayout` has hardcoded active classes (`Today's Digest` is always active regardless of route), lacks dynamic `usePathname()` highlighting, lacks mobile drawer capability, and has NO `ThemeToggle` component.
3. **Primitive Gaps on Login Screen (`/login`)**: The current login page at `apps/console/src/app/(auth)/login/page.tsx` uses raw HTML `<label>`, manual error `<div>` tags, manual `<Loader2>` spinners in buttons, and does not leverage `@repo/ui` primitives (`Label`, `Alert`, `CardDescription`, `CardFooter`, `ThemeToggle`, and `Button.isLoading`).
4. **Critical Build Blocker Discovered**: Attempting to run `next build` on `apps/console` fails with `TypeError: l.createContext is not a function at module evaluation (packages/ui/src/components/dialog.tsx:10:23)` because `@repo/ui` barrel-exports `dialog.tsx` (and other stateful components) which are missing the `"use client";` directive, crashing Turbopack during Server Component evaluation.

This strategy document provides the architectural analysis, concrete file paths, component hierarchies, prop types, implementation details, and verification steps required to execute Milestone 4 cleanly.

---

## 2. Issue 1: Root Layout & Theming

### 2.1 Current State Analysis
- **File**: `apps/console/src/app/layout.tsx`
  - Defines `RootLayout({ children })`.
  - In `<head>`: `<ThemeScript defaultTheme="system" />` is rendered.
  - In `<html>`: `suppressHydrationWarning` is present.
  - In `<body>`: `className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row"`.
    - **Defect**: Setting `flex flex-col md:flex-row` on `<body>` forces every page (including `/login`) into a horizontal multi-column flex layout.
  - Directly inside `ThemeProvider`:
    - Renders `<aside className="w-full md:w-64 ...">` (the console sidebar).
    - Renders `<main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>`.
    - **Defect**: Any route loaded by Next.js (including `/login`) gets wrapped in the sidebar and bounded main container.
- **File**: `apps/console/src/app/globals.css`
  - Current content:
    ```css
    @import "tailwindcss";
    @import "@repo/ui/styles.css";

    @source "../../../../packages/ui/src";
    ```
  - **Assessment**: Correct. Follows Tailwind v4 guidelines and imports `@repo/ui` CSS variables and `@theme` tokens.

### 2.2 Target State: Decoupled Root Layout
The `RootLayout` must be lean and unopinionated about page layout, serving only as the root document provider:
1. Retain zero-FOUC `<ThemeScript defaultTheme="system" />` in `<head>`.
2. Retain `<html lang="en" suppressHydrationWarning>`.
3. Clean `<body>` classes:
   ```tsx
   <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
   ```
4. Wrap `{children}` in `<ThemeProvider defaultTheme="system">`.
5. Delegate shell orchestration to route-level layout or an interactive shell controller.

### 2.3 Proposed Root Layout Code (`apps/console/src/app/layout.tsx`)
```tsx
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@repo/ui";
import type { Metadata } from "next";
import { ConsoleShell } from "../components/console-shell";

export const metadata: Metadata = {
  title: "First Cup Console — Executive Dashboard",
  description: "Personalized intelligence feed, audio briefings, and preferences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
        <ThemeProvider defaultTheme="system">
          <ConsoleShell>{children}</ConsoleShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 3. Issue 2: Route Architecture & Auth Isolation (Feature F24)

### 3.1 Problem Statement & Requirements
- **Feature F24 Requirement**: Isolate the unauthenticated `/login` route from the dashboard shell so that the console sidebar/navigation is NOT rendered on the login screen.
- Current routing tree:
  ```
  apps/console/src/app/
  ├── layout.tsx                     <-- Contains hardcoded <aside> sidebar
  ├── (auth)/
  │   └── login/
  │       └── page.tsx               <-- Rendered inside RootLayout sidebar!
  ├── dashboard/
  │   └── page.tsx
  ├── preferences/
  │   └── page.tsx
  └── billing/
      └── page.tsx
  ```

### 3.2 Evaluation of Architectural Approaches

#### Approach A: Route Group Partitioning (`(auth)` vs `(dashboard)`)
- Structure:
  - `src/app/layout.tsx`: Root document without sidebar.
  - `src/app/(auth)/login/page.tsx`: Free-standing login page.
  - `src/app/(dashboard)/layout.tsx`: Authenticated layout containing `<aside>` sidebar + `<main>`.
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `src/app/(dashboard)/preferences/page.tsx`
  - `src/app/(dashboard)/billing/page.tsx`
- **Critical Risk Identified**:
  - `tests/e2e/tier1-feature-coverage.test.ts` (lines 444-450) and `tests/e2e/tier4-real-world.test.ts` (lines 127, 133, 134) perform explicit filesystem assertions:
    ```typescript
    const routes = [
      path.join(APPS_PATH, "console/src/app/layout.tsx"),
      path.join(APPS_PATH, "console/src/app/(auth)/login/page.tsx"),
      path.join(APPS_PATH, "console/src/app/dashboard/page.tsx"),
      path.join(APPS_PATH, "console/src/app/preferences/page.tsx"),
      path.join(APPS_PATH, "console/src/app/billing/page.tsx"),
    ];
    for (const route of routes) {
      expect(fs.existsSync(route)).toBeTrue();
    }
    ```
  - Moving `dashboard`, `preferences`, and `billing` inside `(dashboard)/` immediately causes `fs.existsSync("console/src/app/dashboard/page.tsx")` to return `false`, breaking the test suite.
  - In Next.js, defining both `src/app/dashboard/page.tsx` and `src/app/(dashboard)/dashboard/page.tsx` causes a hard route conflict error during build.

#### Approach B: Layout Partitioning via Interactive Shell Controller (`ConsoleShell`) — **RECOMMENDED**
- Structure:
  - Retain `src/app/(auth)/login/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/preferences/page.tsx`, `src/app/billing/page.tsx` at their exact, verified filesystem paths.
  - Extract the console shell into a dedicated client component: `apps/console/src/components/console-shell.tsx`.
  - `ConsoleShell` inspects the active pathname using `usePathname()`:
    - If `pathname` is `"/login"` (or starts with `/login`): Render `{children}` directly in a clean full-viewport container without any sidebar.
    - If `pathname` is `/dashboard`, `/preferences`, `/billing`: Render the responsive authenticated dashboard shell (`ConsoleSidebar` + `<main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>`).
- **Benefits**:
  - 100% fixes F24 auth isolation: `/login` screen has zero sidebar elements or leaks.
  - 100% backward-compatible with all existing E2E tests (`tier1-feature-coverage.test.ts` and `tier4-real-world.test.ts`).
  - Seamless client transitions between auth and console states.
  - Enables clean mobile drawer and dynamic active navigation indicator inside `ConsoleSidebar`.

### 3.3 Component Specification: `ConsoleShell` & `ConsoleSidebar`

#### 1. `apps/console/src/components/console-shell.tsx`
```tsx
"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { ConsoleSidebar } from "./console-sidebar";

export interface ConsoleShellProps {
  children: React.ReactNode;
}

export function ConsoleShell({ children }: ConsoleShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname?.startsWith("/login");

  if (isAuthRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
      <ConsoleSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

#### 2. `apps/console/src/components/console-sidebar.tsx` (F25 Navigation Shell)
Uses `@repo/ui` sidebar primitives, dynamic `usePathname()` active indicator, mobile drawer toggle, user profile badge, and `ThemeToggle`:
```tsx
"use client";

import { Badge, ThemeToggle } from "@repo/ui";
import {
  Coffee,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Sliders,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today's Digest", icon: LayoutDashboard },
  { href: "/preferences", label: "Preferences", icon: Sliders },
  { href: "/billing", label: "Subscription", icon: CreditCard },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="flex md:hidden items-center justify-between p-4 border-b border-border/40 bg-card/60 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
            <Coffee className="h-4 w-4" />
          </div>
          <span>First Cup <span className="text-accent">Console</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="cycle" />
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Container (Desktop & Mobile Drawer) */}
      <aside
        className={`w-full md:w-64 border-b md:border-b-0 md:border-r border-border/40 bg-card/50 backdrop-blur-md p-6 flex flex-col justify-between shrink-0 ${
          mobileOpen ? "flex" : "hidden md:flex"
        }`}
      >
        <div>
          {/* Brand Header (Desktop) */}
          <div className="hidden md:flex items-center gap-2.5 font-bold tracking-tight text-lg mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-xs">
              <Coffee className="h-5 w-5" />
            </div>
            <span>
              First Cup <span className="text-accent">Console</span>
            </span>
          </div>

          {/* Dynamic Navigation */}
          <nav className="space-y-1.5 text-sm font-medium" aria-label="Console navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors select-none ${
                    isActive
                      ? "bg-accent/15 text-accent font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Profile, Marketing Link, ThemeToggle */}
        <div className="pt-6 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs border border-accent/30">
                FC
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground">Engineering Lead</div>
                <div className="text-muted-foreground">Pro Member</div>
              </div>
            </div>
            <Badge variant="success">PRO</Badge>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Marketing Site</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <ThemeToggle variant="cycle" />
          </div>
        </div>
      </aside>
    </>
  );
}
```

---

## 4. Issue 3: Login / Auth Page Revamp (Feature F29)

### 4.1 Current State Analysis (`apps/console/src/app/(auth)/login/page.tsx`)
1. **Container**: `<div className="min-h-[80vh] flex items-center justify-center">` inside an active sidebar.
2. **Missing Components**:
   - Uses `<p className="text-xs text-muted-foreground mt-1">` instead of `CardDescription`.
   - Uses raw `<label>` tags with custom uppercase styling instead of `@repo/ui` `Label`.
   - Uses raw `<div className="rounded-lg bg-destructive/15...">` instead of `@repo/ui` `Alert` + `AlertDescription`.
   - Uses `<Loader2 className="animate-spin" />` inside `<Button>` instead of `Button.isLoading`.
   - Does not have a `CardFooter`.
   - Does not have a `ThemeToggle`.
   - Does not have a back link to marketing site.

### 4.2 Target State Architecture
- **Layout**: Centered authentication viewport (`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground relative`).
- **Corner Controls**:
  - Top-Left: Navigation back link `<Link href="http://localhost:3000">` ("Back to First Cup").
  - Top-Right: `<ThemeToggle variant="dropdown" />` allowing theme switching prior to authentication.
- **Card Primitives Hierarchy**:
  ```
  Card (max-w-md w-full border-border shadow-xl backdrop-blur-md bg-card)
  ├── CardHeader (text-center pb-4)
  │   ├── Brand Icon (Coffee in accent container)
  │   ├── CardTitle ("Sign In to First Cup" / "Create Your Account")
  │   └── CardDescription ("Access your personalized executive tech intelligence console.")
  ├── CardContent
  │   └── Form (space-y-4)
  │       ├── Alert (variant="destructive", role="alert") [if errorMsg]
  │       │   └── AlertDescription
  │       ├── Full Name Field (if isRegister)
  │       │   ├── Label (htmlFor="auth-name", required)
  │       │   └── Input (id="auth-name", autoComplete="name", required)
  │       ├── Email Field
  │       │   ├── Label (htmlFor="auth-email", required)
  │       │   └── Input (id="auth-email", type="email", autoComplete="email", required)
  │       ├── Password Field
  │       │   ├── Label (htmlFor="auth-password", required)
  │       │   └── Input (id="auth-password", type="password", autoComplete=..., required)
  │       └── Button (variant="primary", type="submit", isLoading={isLoading})
  └── CardFooter (flex flex-col gap-3 pt-2)
      ├── Toggle Mode Button ("Need an account? Start 14-day trial" / "Already have an account? Sign in")
      └── Legal Micro-copy ("By signing in, you agree to First Cup's Terms of Service and Privacy Policy.")
  ```

### 4.3 Proposed Implementation (`apps/console/src/app/(auth)/login/page.tsx`)
```tsx
"use client";

import { authClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ThemeToggle,
} from "@repo/ui";
import { ArrowLeft, Coffee } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || "Engineering Lead",
        });
        if (res.error) {
          setErrorMsg(res.error.message || "Failed to create account.");
          setIsLoading(false);
          return;
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });
        if (res.error) {
          setErrorMsg(res.error.message || "Invalid credentials.");
          setIsLoading(false);
          return;
        }
      }

      router.push("/dashboard");
    } catch {
      setErrorMsg("An unexpected connection error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground relative selection:bg-accent/20 selection:text-accent">
      {/* Top Bar Utilities */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8">
        <a
          href="http://localhost:3000"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to First Cup</span>
        </a>
      </div>
      <div className="absolute top-4 sm:top-8 right-4 sm:right-8">
        <ThemeToggle variant="dropdown" />
      </div>

      {/* Centered Authentication Card */}
      <Card className="w-full max-w-md border-border shadow-xl backdrop-blur-md bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
              <Coffee className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRegister ? "Create Your Account" : "Sign In to First Cup"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1.5">
            {isRegister
              ? "Start your 14-day trial of executive intelligence briefs."
              : "Access your personalized executive tech intelligence console."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name" required>
                  Full Name
                </Label>
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email" required>
                Email
              </Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="alex@techcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password" required>
                  Password
                </Label>
                {!isRegister && (
                  <span className="text-xs text-muted-foreground">Min 8 characters</span>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              className="w-full font-semibold shadow-sm mt-2"
            >
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-accent hover:underline font-medium cursor-pointer transition-colors"
          >
            {isRegister
              ? "Already have an account? Sign in instead"
              : "Need an account? Start 14-day trial"}
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            By continuing, you agree to First Cup&apos;s Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

---

## 5. Critical Monorepo Finding: Turbopack Server Component Evaluation

### 5.1 Defect Description
When executing `next build` on `apps/console`, Turbopack encounters the following error during page compilation:
```
Error: Failed to collect configuration for /preferences
  [cause]: TypeError: l.createContext is not a function
      at module evaluation (../../packages/ui/src/components/dialog.tsx:10:23)
      at module evaluation (src/app/layout.tsx:2:1)
     8 | }
     9 |
  > 10 | const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);
```

### 5.2 Root Cause Analysis
1. `apps/console/src/app/layout.tsx` is a Server Component.
2. It imports `{ ThemeProvider, ThemeScript } from "@repo/ui"`.
3. `@repo/ui` has a single entry point `packages/ui/src/index.ts` which exports all components, including `dialog.tsx`, `tabs.tsx`, `navbar.tsx`, `tooltip.tsx`, and `switch.tsx`.
4. Several interactive `@repo/ui` components use React state and context (`React.createContext`, `React.useState`, `React.useEffect`) at the top level, but **do not include `"use client";`** at the top of the file:
   - `packages/ui/src/components/dialog.tsx` (Line 10: `React.createContext`)
   - `packages/ui/src/components/tabs.tsx` (Line 10: `React.createContext`)
   - `packages/ui/src/components/navbar.tsx` (Line 12: `React.createContext`)
   - `packages/ui/src/components/tooltip.tsx` (Line 44: `React.useState`)
   - `packages/ui/src/components/switch.tsx` (Line 31: `React.useState`)
5. In Next.js App Router (Turbopack), when a Server Component imports from a package without subpath exports or `"use client"` boundaries, Turbopack attempts to execute the code in the Server Component environment. In this environment, `React.createContext` is `undefined`, triggering an unrecoverable `TypeError`.

### 5.3 Solution for Implementation Phase
Before or during Milestone 4 implementation, the implementer must:
1. Prepend `"use client";` to:
   - `packages/ui/src/components/dialog.tsx`
   - `packages/ui/src/components/tabs.tsx`
   - `packages/ui/src/components/navbar.tsx`
   - `packages/ui/src/components/tooltip.tsx`
   - `packages/ui/src/components/switch.tsx`
2. Alternatively/additionally in `apps/console`:
   - Keep `apps/console/src/app/layout.tsx` minimal and ensure all client wrappers like `ConsoleShell` are marked with `"use client";`.

---

## 6. Implementation Action Plan for Milestone 4

| Step | Action | Files Affected | Target Status |
|:---:|:---|:---|:---|
| **1** | Add `"use client";` to interactive `@repo/ui` primitives to unblock Next.js RSC compilation | `packages/ui/src/components/{dialog,tabs,navbar,tooltip,switch}.tsx` | Fixes Turbopack `createContext` crash across all apps |
| **2** | Create `ConsoleSidebar` component with dynamic `usePathname()`, mobile drawer, profile, and `ThemeToggle` | `apps/console/src/components/console-sidebar.tsx` | Implements Feature F25 |
| **3** | Create `ConsoleShell` component isolating `/login` from authenticated dashboard layout | `apps/console/src/components/console-shell.tsx` | Implements Feature F24 |
| **4** | Refactor `RootLayout` to use `ConsoleShell`, clean `<body>` classes, and ensure zero-FOUC | `apps/console/src/app/layout.tsx` | Clean root layout, zero FOUC |
| **5** | Overhaul `/login` with full `@repo/ui` suite (`Card`, `Input`, `Label`, `Button`, `Alert`, `ThemeToggle`) | `apps/console/src/app/(auth)/login/page.tsx` | Implements Feature F29 |
| **6** | Verify E2E suite passes (`tier1` through `tier4`) and typecheck passes with 0 errors | Monorepo root | All 277+ unit & E2E tests PASS |

---

## 7. Verification Method

To verify the completed implementation:
1. **TypeScript Typecheck**:
   ```bash
   ./node_modules/.bin/tsc --project apps/console/tsconfig.json --noEmit
   ```
   *Expected: Zero errors.*
2. **Biome Lint & Format Check**:
   ```bash
   bun biome check apps/console/src
   ```
   *Expected: Zero lint or formatting errors.*
3. **E2E Test Suite Run**:
   ```bash
   bun test tests/
   ```
   *Expected: All 277 tests pass, including test 1.21 (Console routes existence) and test 4.2 (Console subscriber journey).*
4. **Next.js Production Build**:
   ```bash
   (cd apps/console && bun run build)
   ```
   *Expected: Clean build with all routes (`/login`, `/dashboard`, `/preferences`, `/billing`) compiled without crashes.*
