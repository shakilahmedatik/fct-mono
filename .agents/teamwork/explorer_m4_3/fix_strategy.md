# Fix Strategy & Architecture: Milestone 4 Console App Revamp (`apps/console`)
**Agent**: `explorer_m4_3`  
**Scope**: Shell Navigation & Sidebar (F25), Preferences Page (F27), Billing Page (F28)  
**Date**: 2026-10-14  

---

## 1. Executive Summary

Milestone 4 revamps `apps/console` to provide a premier executive intelligence subscriber experience. This investigation analyzes the current state of `apps/console`, defines the exact target design utilizing `@repo/ui` primitives, and provides concrete component hierarchies, prop signatures, implementation blueprints, and verification procedures for:
1. **Shell Navigation & Sidebar (Feature F25)**: Responsive sidebar utilizing `@repo/ui` `Sidebar`, dynamic active route indication via `usePathname()`, accessible mobile drawer/toggle with backdrop, user profile footer with status badge, sign out action, and integrated `@repo/ui` `ThemeToggle`.
2. **Preferences Page (Feature F27)**: Comprehensive preference management utilizing `@repo/ui` primitives (`Card`, `Switch`, `Badge`, `Select`, `Input`, `Label`, `Button`, `Alert`) for topic subscriptions, delivery cadence/time, neural audio voice persona, email notifications, and save confirmation alerts.
3. **Billing Page (Feature F28)**: Complete subscription portal utilizing `@repo/ui` primitives (`Card`, `Badge`, `Button`, `Table`, `Dialog`) featuring active plan details with renewal date, monthly resource quota and consumption progress meters, Paddle invoice history table, and a multi-tier plan upgrade dialog.

---

## 2. Feature F25: Shell Navigation & Sidebar

### 2.1 Current State Analysis
- **File Location**: `apps/console/src/app/layout.tsx` (lines 21–81).
- **Problems Identified**:
  1. *Hardcoded Active Route*: The sidebar is embedded directly in a server component (`layout.tsx`). The link to `/dashboard` has hardcoded active classes (`bg-accent/15 text-accent font-semibold`), while `/preferences` and `/billing` are permanently inactive. Navigating between routes never updates the active indicator.
  2. *Missing Mobile Drawer / Toggle*: On mobile viewports (`<md`), the `<aside>` renders as a static full-width stacked block (`w-full border-b md:w-64`) that pushes page content down. There is no hamburger toggle button, no slide-in drawer, and no overlay backdrop.
  3. *Missing ThemeToggle*: There is no `@repo/ui` `ThemeToggle` component in `apps/console` at all, preventing users from changing themes within the console.
  4. *Bypasses `@repo/ui` Sidebar Primitives*: Uses raw `<aside>`, `<nav>`, and `<Link>` rather than the design system's `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarNav`, `SidebarItem`, `SidebarFooter`.
  5. *Navigation Leaks to Auth Routes*: Because the sidebar is rendered unconditionally in `src/app/layout.tsx`, visiting `/login` renders the sidebar on the unauthenticated authentication card.

### 2.2 Target Architecture & Component Hierarchy
Create a dedicated client component at `apps/console/src/components/console-sidebar.tsx` and integrate it into the console layout or shell:

```
<ConsoleShell> (client wrapper)
├── Mobile Top Header (hidden md:hidden)
│   ├── Brand Logo ("First Cup Console" + Coffee icon)
│   ├── ThemeToggle (variant="cycle")
│   └── Mobile Menu Toggle Button (Menu / X icon, aria-expanded, aria-controls="mobile-drawer")
├── Mobile Drawer Overlay & Panel (hidden md:hidden, conditional when mobileOpen=true)
│   ├── Backdrop (fixed inset-0 bg-background/80 backdrop-blur-sm)
│   └── Drawer Aside (fixed inset-y-0 left-0 w-72 bg-card border-r border-border p-4 shadow-2xl)
│       ├── Drawer Header with Brand & Close Button
│       ├── Nav Items (<SidebarItem> for /dashboard, /preferences, /billing)
│       └── Drawer Footer (User Profile, ThemeToggle, Sign Out)
├── Desktop Sidebar (hidden md:flex, sticky top-0 h-screen w-64)
│   └── <Sidebar> (@repo/ui)
│       ├── <SidebarHeader>
│       │   └── Brand Logo & Icon
│       ├── <SidebarContent>
│       │   └── <SidebarNav>
│       │       ├── <SidebarItem href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard />}>
│       │       │   Today's Digest
│       │       ├── <SidebarItem href="/preferences" active={pathname.startsWith("/preferences")} icon={<Sliders />}>
│       │       │   Preferences
│       │       └── <SidebarItem href="/billing" active={pathname.startsWith("/billing")} icon={<CreditCard />} badge={<Badge variant="success">PRO</Badge>}>
│       │           Subscription & Billing
│       └── <SidebarFooter>
│           ├── User Profile Card (FC avatar, "Engineering Lead", "Pro Member", PRO Badge)
│           ├── ThemeToggle (variant="segmented" or variant="dropdown")
│           ├── Marketing Site External Link (<ExternalLink />)
│           └── Sign Out Action (<Button variant="ghost" size="sm"><LogOut /> Sign Out</Button>)
└── <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">
    {children}
```

### 2.3 Proposed Implementation: `apps/console/src/components/console-sidebar.tsx`
```tsx
"use client";

import { authClient } from "@repo/api-client";
import {
  Badge,
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  ThemeToggle,
} from "@repo/ui";
import {
  Coffee,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Sliders,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

export function ConsoleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle Escape key for mobile drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const navLinks = [
    {
      href: "/dashboard",
      label: "Today's Digest",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      href: "/preferences",
      label: "Preferences",
      icon: <Sliders className="h-4 w-4" />,
      active: pathname.startsWith("/preferences"),
    },
    {
      href: "/billing",
      label: "Subscription",
      icon: <CreditCard className="h-4 w-4" />,
      active: pathname.startsWith("/billing"),
      badge: <Badge variant="success">PRO</Badge>,
    },
  ];

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Best-effort sign out
    } finally {
      router.push("/login");
    }
  };

  const BrandLogo = (
    <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-xs">
        <Coffee className="h-5 w-5" />
      </div>
      <span>
        First Cup <span className="text-accent">Console</span>
      </span>
    </div>
  );

  const UserProfile = (
    <div className="space-y-3 w-full">
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

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Theme</span>
        <ThemeToggle variant="segmented" />
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Marketing Site</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-3 w-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
        {BrandLogo}
        <div className="flex items-center gap-2">
          <ThemeToggle variant="cycle" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="p-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-card p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {BrandLogo}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <SidebarNav>
                {navLinks.map((item) => (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    active={item.active}
                    icon={item.icon}
                    badge={item.badge}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </SidebarItem>
                ))}
              </SidebarNav>
            </div>

            <div className="pt-6 border-t border-border">
              {UserProfile}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Responsive Sidebar */}
      <Sidebar className="hidden md:flex h-screen sticky top-0 w-64 shrink-0">
        <SidebarHeader className="px-6">
          {BrandLogo}
        </SidebarHeader>

        <SidebarContent className="px-4 py-6">
          <SidebarNav>
            {navLinks.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                active={item.active}
                icon={item.icon}
                badge={item.badge}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarNav>
        </SidebarContent>

        <SidebarFooter className="p-6">
          {UserProfile}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
```

### 2.4 Auth Isolation Wrapper (`apps/console/src/components/console-shell.tsx`)
To cleanly isolate the `/login` route from the console sidebar without breaking file path tests (`tests/e2e/tier1-feature-coverage.test.ts` line 443):
```tsx
"use client";

import { usePathname } from "next/navigation";
import { ConsoleSidebar } from "./console-sidebar";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/login");

  if (isAuthRoute) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full">
      <ConsoleSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>
    </div>
  );
}
```

---

## 3. Feature F27: Preferences Page Revamp

### 3.1 Current State Analysis
- **File Location**: `apps/console/src/app/preferences/page.tsx`.
- **Shortcomings Identified**:
  1. *Raw buttons for topics*: Topics use raw `<button>` with inline classes rather than `@repo/ui` `Switch` and `Badge`.
  2. *Missing Delivery Cadence*: Delivery hour is just a raw numeric input without cadence selection or timezone options.
  3. *No Audio Voice Selector*: Completely missing voice persona selector (e.g. "Neural Male (Alloy)", "Neural Female (Nova)").
  4. *No Email Notifications Switch*: Lacks a switch toggle for email delivery and critical security alerts.
  5. *Primitive Save Confirmation*: Renders a raw inline `<span className="text-xs text-accent...">` instead of `@repo/ui` `Alert` with `AlertTitle` and `AlertDescription`.
  6. *Missing Form Primitives*: Lacks `@repo/ui` `Label`, `Select`, `SelectOption`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.

### 3.2 Target Form Specification & Primitive Mapping
| UI Requirement | `@repo/ui` Primitive | Implementation Details |
|---|---|---|
| **Topic Subscriptions** | `Switch`, `Badge`, `Card` | Row items for each topic with category badge, title, description, and individual toggle switch. Header includes total active count badge (`<Badge variant="outline">`). |
| **Delivery Cadence & Time** | `Select`, `Input`, `Label` | `Select` for cadence ("Daily", "Weekdays", "Realtime", "Weekly"), `Input type="time"` for schedule dispatch, and `Select` for timezone. |
| **Audio Voice Selector** | `Select`, `SelectOption`, `Switch` | Master switch for audio briefs, plus `Select` with Neural Male, Neural Female, Neural Calm, and Neural Dynamic voice personas, and speed selector. |
| **Email Notifications** | `Switch`, `Label` | Toggles for "Daily Email Executive Digest" and "Critical Security & Outage Alerts". |
| **Save Confirmation** | `Alert`, `AlertTitle`, `AlertDescription` | Rich contextual banner (`variant="success"`) indicating synchronized preferences, or `variant="destructive"` on failure. |
| **Form Layout** | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button` | High-contrast cards with clear typographic hierarchy and primary action buttons. |

### 3.3 Data Structures & Prop Interfaces
```tsx
export interface TopicOption {
  id: string;
  label: string;
  category: string;
  description: string;
}

export const TOPIC_CATALOG: TopicOption[] = [
  {
    id: "ai",
    label: "Artificial Intelligence & LLMs",
    category: "AI & Models",
    description: "Frontier model releases, reasoning techniques, agent frameworks, and inference optimization.",
  },
  {
    id: "systems",
    label: "Distributed Systems & Rust",
    category: "Infrastructure",
    description: "Consensus algorithms, kernel architecture, memory safety, and high-throughput networking.",
  },
  {
    id: "backend",
    label: "Backend Architecture & Bun",
    category: "Runtimes",
    description: "Microservices design, API gateways, Bun/Node execution engines, and async streaming.",
  },
  {
    id: "frontend",
    label: "Frontend & Next.js",
    category: "Web & UI",
    description: "React Server Components, Next.js architecture, Tailwind v4, web performance, and edge rendering.",
  },
  {
    id: "database",
    label: "Postgres & Vector Databases",
    category: "Data",
    description: "pgvector embeddings, indexing algorithms, distributed SQL, and vector similarity search.",
  },
  {
    id: "devops",
    label: "Cloud & DevOps",
    category: "Cloud",
    description: "Kubernetes orchestration, container runtimes, GitOps pipelines, and multi-cloud resilience.",
  },
  {
    id: "security",
    label: "Cybersecurity & Auth",
    category: "Security",
    description: "Zero-trust architectures, OAuth2/OIDC, cryptographic protocols, and supply chain security.",
  },
];

export const VOICE_PERSONAS = [
  { value: "neural-male-executive", label: "Neural Male — Executive & Authoritative (Alloy)" },
  { value: "neural-female-anchor", label: "Neural Female — Tech Anchor & Crisp (Nova)" },
  { value: "neural-male-calm", label: "Neural Male — Calm & Analytical (Echo)" },
  { value: "neural-female-dynamic", label: "Neural Female — Dynamic & Engaging (Shimmer)" },
  { value: "neural-male-studio", label: "Neural Male — Studio Broadcaster (Onyx)" },
];

export const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST / EDT - UTC-5)" },
  { value: "America/Chicago", label: "America/Chicago (CST / CDT - UTC-6)" },
  { value: "America/Denver", label: "America/Denver (MST / MDT - UTC-7)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST / PDT - UTC-8)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST - UTC+0/+1)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET / CEST - UTC+1/+2)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - UTC+9)" },
];
```

### 3.4 Target Component Design: `apps/console/src/app/preferences/page.tsx`
```tsx
"use client";

import { createApiClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
  Switch,
} from "@repo/ui";
import {
  Bell,
  CheckCircle2,
  Headphones,
  Layers,
  Loader2,
  Radio,
  RotateCcw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import * as React from "react";
// ... (uses states: selectedTopics, deliveryCadence, deliveryTime, timezone, audioEnabled, voicePersona, audioSpeed, emailDigest, emailAlerts, telegramId, isSaving, saveStatus)
```
- **Topic Subscriptions Section**:
  Iterates `TOPIC_CATALOG`. Each row renders topic title, category badge, and description, with a `<Switch checked={selectedTopics.includes(topic.id)} onCheckedChange={(val) => handleToggle(topic.id, val)} />`.
- **Delivery Schedule & Channels**:
  Renders two-column grid with `<Label htmlFor="cadence-select">Delivery Cadence</Label>`, `<Select id="cadence-select">`, `<Label htmlFor="delivery-time">Dispatch Time</Label>`, `<Input id="delivery-time" type="time" />`, and `<Select id="timezone-select">`.
- **Audio Voice Synthesis**:
  Card with `<Switch checked={audioEnabled} label="Generate Daily Voice Briefing" />`, and when enabled, presents `<Select id="voice-persona">` with `VOICE_PERSONAS` and `<Select id="audio-speed">`.
- **Email & Alert Notifications**:
  Card with `<Switch checked={emailDigest} label="Daily Morning Intelligence Email" />` and `<Switch checked={emailAlerts} label="Critical Vulnerability & Zero-Day Alerts" />`.
- **Interactive Feedback**:
  `<Alert variant="success">` appears conditionally upon successful save with animation, and auto-dismisses after 6 seconds.
- **Save Actions**:
  `Button variant="primary"` with `<Save />` icon, `<Loader2 className="animate-spin" />` when saving, plus `Button variant="outline"` with `<RotateCcw />` to restore defaults.

---

## 4. Feature F28: Billing Page Revamp

### 4.1 Current State Analysis
- **File Location**: `apps/console/src/app/billing/page.tsx`.
- **Shortcomings Identified**:
  1. *No Usage Meters*: Completely missing monthly consumption progress bars for generated digests, audio minutes, and API webhook limits.
  2. *No Invoice History Table*: Completely missing `@repo/ui` `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`.
  3. *No Plan Upgrade Modal*: Missing `@repo/ui` `Dialog` (`DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, etc.).
  4. *Minimal Plan Card*: Lacks renewal date, payment method details, and clear billing status.

### 4.2 Target Billing Interface Specification
| Component | `@repo/ui` Primitive | Features & Content |
|---|---|---|
| **Current Plan Card** | `Card`, `Badge`, `Button` | Plan Name ("Executive Pro Plan"), status badges (`<Badge variant="success">Active</Badge>`, `<Badge variant="outline">Monthly</Badge>`), Price ($29/mo), Renewal Date ("November 14, 2026 via Paddle"), Payment Method ("Mastercard •••• 4242"), and Upgrade button trigger. |
| **Usage & Quotas Card** | `Card`, Progress Bars | 4 resource meters: Daily Briefings (26/30, 86%), Voice Audio Synthesis (78/100 mins, 78%), Instant Alerts & Webhooks (1,420/5,000, 28%), Saved Executive Briefings (45/500, 9%). |
| **Invoice History Table** | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `Badge`, `Button` | Complete invoice log: Invoice ID, Date, Description, Amount, Status Badge (`Paid` / `Settled`), and Download Receipt PDF action button. |
| **Plan Upgrade Dialog** | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | Accessible modal displaying tier comparison cards: Executive Pro ($29/mo, Current), Team Intelligence ($79/mo, 5 seats, Slack bot), Enterprise Command ($249/mo, dedicated crawler), checkout button. |

### 4.3 Proposed Implementation: `apps/console/src/app/billing/page.tsx`
```tsx
"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Flame,
  HardDrive,
  Headphones,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import * as React from "react";

const INVOICE_HISTORY = [
  {
    id: "INV-2026-004",
    date: "Oct 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-003",
    date: "Sep 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-002",
    date: "Aug 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-001",
    date: "Jul 14, 2026",
    description: "14-Day Executive Pro Trial (Verification)",
    amount: "$0.00",
    status: "Settled",
    statusVariant: "secondary" as const,
  },
];

const UPGRADE_TIERS = [
  {
    id: "pro",
    name: "Executive Pro",
    price: "$29",
    cadence: "per month",
    description: "Essential intelligence briefing for senior individual contributors and team leads.",
    isCurrent: true,
    features: [
      "Daily 3-minute executive voice brief",
      "7 custom tracked tech topics",
      "Telegram & Email morning delivery",
      "Personal intelligence archive",
    ],
  },
  {
    id: "team",
    name: "Team Intelligence",
    price: "$79",
    cadence: "per month",
    popular: true,
    description: "Collaborative synthesis across engineering leadership cohorts.",
    features: [
      "Up to 5 engineering lead seats",
      "All 5 Neural Voice personas",
      "25 customizable topic pipelines",
      "Slack & Microsoft Teams live bot sync",
      "Shared team bookmark repository",
      "Priority pipeline crawling",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Command",
    price: "$249",
    cadence: "per month",
    description: "Organization-wide autonomous research and bespoke crawler pipelines.",
    features: [
      "Unlimited team seats",
      "Dedicated crawler instances",
      "Private vector embedding models",
      "Custom voice synthesis fine-tuning",
      "SSO & SAML authentication",
      "99.9% uptime SLA & dedicated lead",
    ],
  },
];
```

#### Detailed Sections of Billing Page:
1. **Current Plan Card**:
   - Header: Flex container with plan name, `$29.00 / month`, `<Badge variant="success">Active Subscription</Badge>`, `<Badge variant="outline">Paddle Managed</Badge>`.
   - Content:
     - Renewal callout: "Your plan automatically renews on **November 14, 2026**. Billing managed through Paddle payment processor."
     - Payment details: "Mastercard ending in **•••• 4242** (Expires 12/28)."
   - Footer:
     - `<DialogTrigger asChild><Button variant="primary" className="gap-2"><Sparkles className="h-4 w-4" /> Upgrade / Change Plan</Button></DialogTrigger>`
     - `<Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" /> Manage via Paddle</Button>`
2. **Usage Meters Card**:
   - `CardHeader`: Title "Monthly Quota & Consumption", Description "Resource usage for current billing period (Oct 14 – Nov 14, 2026)."
   - `CardContent`: 4-meter grid:
     - *Digests Generated*: `26 / 30` (86.6% progress bar with `bg-primary`)
     - *Voice Audio Minutes*: `78 / 100 mins` (78% progress bar with `bg-accent`)
     - *Instant Alerts & Webhooks*: `1,420 / 5,000` (28.4% progress bar)
     - *Archived Bookmarks*: `45 / 500` (9% progress bar)
3. **Invoice History Table**:
   - `CardHeader`: Title "Billing & Invoice History", Description "Past receipts and tax invoices generated by Paddle."
   - `Table`:
     - `TableHeader`: `TableRow` with `TableHead`s: `Invoice #`, `Date`, `Description`, `Amount`, `Status`, `Receipt`.
     - `TableBody`: Maps `INVOICE_HISTORY` to `TableRow` and `TableCell`.
     - Status: `<Badge variant={inv.statusVariant}>{inv.status}</Badge>`.
     - Receipt column: `<Button variant="ghost" size="sm" className="gap-1.5 h-8"><Download className="h-3.5 w-3.5" /> PDF</Button>`.
4. **Plan Upgrade Modal (`Dialog`)**:
   - Triggered by "Upgrade / Change Plan" button.
   - `DialogContent className="max-w-3xl"`
   - `DialogHeader`: `DialogTitle` ("Upgrade Your First Cup Subscription") and `DialogDescription`.
   - Grid of 3 plans (`UPGRADE_TIERS`):
     - Executive Pro (Current Plan with disabled button)
     - Team Intelligence (Highlighted border `border-accent`, badge `Popular`, button `Select Team Plan`)
     - Enterprise Command (Button `Contact Enterprise Sales`)
   - `DialogFooter`:
     - `<DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>`
     - `<Button variant="primary">Proceed to Checkout</Button>`

---

## 5. Critical Technical Constraints & Edge Cases

### 5.1 Client Boundary Declaration (`"use client";`)
- **Discovery**: In `packages/ui`, components using `React.createContext` (`dialog.tsx`, `navbar.tsx`, `tabs.tsx`) do NOT declare `"use client";` at the file top.
- **Requirement**: All console components that import `Dialog`, `Select`, `Switch`, `Table`, or use React state/hooks (`useState`, `useEffect`, `usePathname`) MUST declare `"use client";` at line 1.

### 5.2 Preservation of File Routes
- **Constraint**: `tests/e2e/tier1-feature-coverage.test.ts` (lines 443–454) validates:
  - `apps/console/src/app/layout.tsx`
  - `apps/console/src/app/(auth)/login/page.tsx`
  - `apps/console/src/app/dashboard/page.tsx`
  - `apps/console/src/app/preferences/page.tsx`
  - `apps/console/src/app/billing/page.tsx`
- **Solution**: Keep the page files directly at their verified paths (`preferences/page.tsx`, `billing/page.tsx`, etc.). Use `ConsoleShell` to provide layout and auth isolation dynamically rather than moving files into a nested directory that breaks the test assertions.

### 5.3 Semantic Color Tokens (Zero Hardcoded Hex)
- **Constraint**: Challenger and Auditor test suites perform regex checks for `#` hex values and raw color classes.
- **Rules**:
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-accent/15`, `bg-primary`, `bg-destructive/10`.
  - Text: `text-foreground`, `text-muted-foreground`, `text-accent`, `text-primary`, `text-destructive`.
  - Borders: `border-border`, `border-border/60`, `border-accent/30`.
  - Rings: `ring-ring`.

---

## 6. Verification Plan

### 6.1 Unit & Feature Tests
1. **Navigation Highlighting**:
   - Mount `ConsoleSidebar` at `/dashboard` → verify `Today's Digest` has `active={true}` and `aria-current="page"`.
   - Mount at `/preferences` → verify `Preferences` has `active={true}` and `Today's Digest` has `active={false}`.
   - Mount at `/billing` → verify `Subscription` has `active={true}` and badge `PRO` is rendered.
2. **Mobile Drawer Toggle**:
   - Verify hamburger button toggles `mobileOpen` state.
   - Verify clicking backdrop or close button dismisses drawer.
   - Verify pressing Escape key closes drawer.
3. **Preferences Form Controls**:
   - Verify all 7 topics render with accessible `Switch` and `Badge`.
   - Verify Delivery Cadence and Timezone render with `Select` options.
   - Verify Voice Persona selector renders with all 5 neural options.
   - Verify Save triggers `@repo/ui` `Alert` (`variant="success"`).
4. **Billing Controls**:
   - Verify 4 usage meters render progress bars with correct percentage widths.
   - Verify Invoice history renders in `@repo/ui` `Table` with 4 rows and status badges.
   - Verify Plan Upgrade button opens `@repo/ui` `Dialog` with 3 tiers.

### 6.2 Monorepo Commands
- **Biome Check**: `bunx biome check apps/console/src` (must return 0 errors).
- **TypeScript**: `bun run typecheck` or `bunx tsc --noEmit -p apps/console/tsconfig.json` (0 errors).
- **E2E Suite**: `bun tests/e2e/run-all.ts` (all 62 tests across Tiers 1–4 must continue to PASS 100%).
