# Web App Shell, Layout, Navbar & Footer Redesign Plan

**Milestone**: Milestone 3 (`explorer_m3_3`)  
**Target Package**: `apps/web` (`@repo/web`)  
**Working Directory**: `/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m3_3/`  
**Date**: 2026-10-14  

---

## 1. Executive Summary

This document presents the complete architectural specification and copy-pasteable component implementation code for the **Web App Shell, Root Layout, Header (Navbar), and Footer** of `apps/web`.

Currently, `apps/web/src/app/layout.tsx` suffers from several critical architectural limitations:
1. **Monolithic Inlining**: Header and footer markup are hardcoded inside `layout.tsx` without modular component encapsulation.
2. **Missing Mobile Navigation & 640px Blackout**: On viewports below 768px (`< md`), navigation links are simply hidden (`hidden md:flex`) with no hamburger toggle or mobile drawer. Furthermore, the Sign In button is hidden below 640px (`hidden sm:inline-flex`), creating a dead navigation experience on mobile screens.
3. **No `@repo/ui` Navbar Integration**: It uses raw HTML `<header>` tags rather than the design system's tested compound primitives (`Navbar`, `NavbarBrand`, `NavbarNav`, `NavbarLink`, `NavbarActions`, `NavbarMobileToggle`).
4. **Missing Theme Switching in Shell**: The header does not include `@repo/ui`'s `ThemeToggle`, preventing users from toggling between light, dark, and system themes.
5. **Minimal Footer**: The current footer has only three basic links and lacks the required 4-column structured navigation, newsletter signup with `@repo/ui` form controls, and theme status indicator.

---

## 2. Tailwind CSS v4 & Styling Verification

### Current File: `apps/web/src/app/globals.css`
```css
@import "tailwindcss";
@import "@repo/ui/styles.css";

@source "../../../../packages/ui/src";
```

### Verification Findings:
1. **Source Path**: `apps/web/src/app/globals.css` is located 4 levels deep relative to the monorepo root:
   - `apps/web/src/app/` (level 0)
   - `..` → `apps/web/src` (level 1)
   - `../..` → `apps/web` (level 2)
   - `../../..` → `apps` (level 3)
   - `../../../..` → `/Users/shakilahmedatik/Projects/firstcup-monorepo` (level 4, workspace root)
   - Therefore, `@source "../../../../packages/ui/src";` accurately resolves to `/Users/shakilahmedatik/Projects/firstcup-monorepo/packages/ui/src`.
2. **Consistency Across Monorepo**: `apps/console/src/app/globals.css` and `apps/admin/src/app/globals.css` use the exact same `@source "../../../../packages/ui/src";` path.
3. **Token Compatibility**: `@repo/ui/styles.css` defines `@theme` mapping `--color-background`, `--color-foreground`, `--color-card`, `--color-primary`, `--color-accent` (emerald brand), `--color-muted`, `--color-border`, and `--color-ring`. All components in this plan strictly consume these semantic utility tokens. No raw hex codes are permitted.
4. **Recommendation**: Leave `apps/web/src/app/globals.css` as-is; it is already configured correctly for Tailwind v4 token synthesis.

---

## 3. Critical Dependency & Library Findings

1. **Brand Icons in `lucide-react`**:
   - `lucide-react@^1.53.0` does **NOT** export brand logos (`Github`, `Twitter`, `Linkedin`). In modern Lucide releases, brand icons are intentionally excluded.
   - Attempting `import { Github, Twitter, Linkedin } from "lucide-react"` causes build-time compilation errors (`export 'Github' was not found in 'lucide-react'`).
   - **Solution**: Provide clean, accessible SVG components with `fill="currentColor"`, `aria-hidden="true"`, and `<span className="sr-only">...</span>` for screen readers.
2. **`@repo/ui` Button `asChild` Support**:
   - `@repo/ui` `Button` does **not** implement Radix UI `Slot` / `asChild`. It renders a standard `<button>` tag.
   - For links styled as buttons, `@repo/ui` exports `buttonVariants({ variant, size })`. We use `buttonVariants({ variant: "primary", size: "sm" })` directly on `<a>` or `<Link>` elements.
3. **TypeScript Path Aliases**:
   - `apps/web/tsconfig.json` extends `@repo/config-ts/nextjs.json` without custom path mappings.
   - To guarantee zero compilation errors across any bundler or test harness, all local component imports in `apps/web` must use relative paths (e.g. `../components/site-header`).
4. **Dual Export Strategy**:
   - Create `apps/web/src/components/site-header.tsx` and provide `apps/web/src/components/header.tsx` (re-exporting `SiteHeader` as `Header`).
   - Create `apps/web/src/components/site-footer.tsx` and provide `apps/web/src/components/footer.tsx` (re-exporting `SiteFooter` as `Footer`).
   - Create `apps/web/src/components/index.ts` exporting both.

---

## 4. Production-Grade Component Specifications & Code

### 4.1. Header Component (`apps/web/src/components/site-header.tsx`)

#### Features:
- Marked `"use client";` to support interactive state, drawer toggling, and route detection.
- Uses `@repo/ui` compound components: `Navbar`, `NavbarBrand`, `NavbarNav`, `NavbarLink`, `NavbarActions`, `NavbarMobileToggle`.
- Brand Logo: Coffee cup icon (`Coffee` from `lucide-react`) inside emerald badge + "FirstCup" brand typography (`First<span className="text-accent">Cup</span>`).
- Navigation links:
  - "Features" (`/#features`)
  - "Pricing" (`/pricing`)
  - "Blog" (`/blog`)
  - "Contact" (`/contact`)
- Active link detection using `usePathname()`.
- Top-bar actions: `@repo/ui` `ThemeToggle` (dropdown variant, end aligned), "Sign In" link (Console login: `http://localhost:3001/login`), "Get Started" link (`http://localhost:3001`).
- Responsive Mobile Drawer:
  - Mobile toggle button (`NavbarMobileToggle`) rendered on `< md` screens.
  - Custom `mobileContent` passed to `Navbar` with full viewport responsiveness (0px to 767px).
  - Unsuppressed links with generous touch targets (`py-2.5 px-3 rounded-lg hover:bg-muted`).
  - Vertically stacked full-width action buttons: "Get Started" (primary) and "Sign In" (outline).
  - Mobile appearance selector row featuring `@repo/ui` segmented `ThemeToggle`.
  - Automatic drawer dismissal upon clicking any navigation link or action.

#### Implementation Code:
```tsx
"use client";

import {
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarMobileToggle,
  NavbarNav,
  ThemeToggle,
  buttonVariants,
  cn,
} from "@repo/ui";
import { ArrowRight, Coffee } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile drawer on route transition
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/#features", label: "Features", active: false },
    { href: "/pricing", label: "Pricing", active: pathname === "/pricing" },
    { href: "/blog", label: "Blog", active: pathname?.startsWith("/blog") ?? false },
    { href: "/contact", label: "Contact", active: pathname === "/contact" },
  ];

  return (
    <Navbar
      sticky
      className="border-b border-border/50 bg-background/80 backdrop-blur-md"
      mobileContent={
        <div className="flex flex-col space-y-4 py-2">
          {/* Mobile Navigation Links */}
          <nav className="flex flex-col space-y-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                  link.active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile Actions Stack */}
          <div className="flex flex-col gap-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
              <span>Appearance</span>
              <ThemeToggle variant="segmented" />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href="http://localhost:3001"
                className={cn(
                  buttonVariants({ variant: "primary", size: "md" }),
                  "w-full justify-center gap-1.5 shadow-xs font-semibold",
                )}
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="http://localhost:3001/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "md" }),
                  "w-full justify-center font-medium",
                )}
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      }
    >
      {/* Brand Logo */}
      <NavbarBrand>
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
            <Coffee className="h-5 w-5" />
          </div>
          <span className="text-foreground">
            First<span className="text-accent">Cup</span>
          </span>
        </Link>
      </NavbarBrand>

      {/* Desktop Main Navigation */}
      <NavbarNav>
        {navLinks.map((link) => (
          <NavbarLink
            key={link.href}
            href={link.href}
            active={link.active}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </NavbarLink>
        ))}
      </NavbarNav>

      {/* Header Actions */}
      <NavbarActions>
        <ThemeToggle variant="dropdown" align="end" />
        <a
          href="http://localhost:3001/login"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "hidden sm:inline-flex text-muted-foreground hover:text-foreground font-medium",
          )}
        >
          Sign In
        </a>
        <a
          href="http://localhost:3001"
          className={cn(
            buttonVariants({ variant: "primary", size: "sm" }),
            "gap-1.5 shadow-xs font-semibold",
          )}
        >
          <span>Get Started</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </NavbarActions>

      {/* Mobile Drawer Hamburger Toggle */}
      <NavbarMobileToggle />
    </Navbar>
  );
}
```

---

### 4.2. Header Re-export (`apps/web/src/components/header.tsx`)

```tsx
export { SiteHeader as Header, SiteHeader } from "./site-header";
```

---

### 4.3. Footer Component (`apps/web/src/components/site-footer.tsx`)

#### Features:
- Multi-column responsive layout (4 columns):
  - **Col 1 (Brand & Social)**: Brand icon and typography, mission description, and accessible social links with custom SVGs for GitHub, Twitter / X, and LinkedIn.
  - **Col 2 (Product)**: Features (`/#features`), Audio Briefs (`/#audio-preview`), Pricing (`/pricing`), Changelog (`/blog`).
  - **Col 3 (Resources)**: Blog (`/blog`), Documentation (`http://localhost:3001`), Community (`/contact`), Status (`https://status.firstcup.tech`).
  - **Col 4 (Company)**: About (`/#features`), Careers (`/contact`), Contact (`/contact`), Privacy (`/privacy`), Terms (`/terms`).
- **Newsletter Signup Row**:
  - Full-width modern banner with gradient styling (`from-card via-card to-accent/5`).
  - Uses `@repo/ui` `Input` and `Button` (`variant="primary"`).
  - Handles client-side submission feedback state with immediate visual confirmation.
- **Copyright Row**:
  - Copyright: `© 2026 FirstCup, Inc. All rights reserved.`
  - Operational status badge with pulsing emerald indicator ("All systems normal").
  - Dynamic System Theme indicator powered by `@repo/ui` `useTheme()` with SSR safe mounting.

#### Implementation Code:
```tsx
"use client";

import { Button, Input, useTheme } from "@repo/ui";
import { ArrowRight, CheckCircle2, Coffee, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function TwitterIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function SystemThemeIndicator() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="text-muted-foreground">Theme: System</span>;
  }

  return (
    <span className="capitalize text-muted-foreground transition-colors hover:text-foreground">
      Theme: {theme} ({resolvedTheme})
    </span>
  );
}

export function SiteFooter() {
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="border-t border-border/50 bg-card/60 backdrop-blur-sm text-sm text-muted-foreground transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Newsletter Signup Row */}
        <div className="border-b border-border/60 pb-12 mb-12">
          <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-accent/5 p-6 sm:p-8 md:p-10 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent border border-accent/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Daily Executive Briefing</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Synthesized tech intelligence before your first sip
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Join 45,000+ tech leaders receiving our 3-minute personalized audio digest and concise briefing every weekday at 7:00 AM.
                </p>
              </div>

              <div className="w-full lg:w-auto shrink-0">
                {subscribed ? (
                  <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>You are subscribed! Watch your inbox tomorrow at 7:00 AM.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md w-full">
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-label="Work email address"
                      className="h-10 bg-background"
                    />
                    <Button type="submit" variant="primary" size="md" className="shrink-0 gap-1.5 font-medium">
                      <span>Subscribe</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                )}
                <p className="mt-2 text-xs text-muted-foreground/80">
                  Zero spam. Unsubscribe in one click anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Navigation Layout */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Column 1: Brand & Social */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
                <Coffee className="h-5 w-5" />
              </div>
              <span className="text-foreground">
                First<span className="text-accent">Cup</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              AI-synthesized executive briefings and audio digests delivered before your morning coffee. Built for tech leaders, architects, and engineering executives.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="FirstCup on GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50 transition-colors"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="FirstCup on Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50 transition-colors"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="FirstCup on LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50 transition-colors"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">Product</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#audio-preview" className="hover:text-foreground transition-colors">
                  Audio Briefs
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">Resources</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <a href="http://localhost:3001" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <a href="https://status.firstcup.tech" className="hover:text-foreground transition-colors">
                  Status
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">Company</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Theme Indicator Row */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-accent" />
            <span>© 2026 FirstCup, Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-foreground/80">All systems normal</span>
            </div>
            <span className="text-border">|</span>
            <SystemThemeIndicator />
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### 4.4. Footer Re-export (`apps/web/src/components/footer.tsx`)

```tsx
export { SiteFooter as Footer, SiteFooter } from "./site-footer";
```

---

### 4.5. Barrel Export (`apps/web/src/components/index.ts`)

```tsx
export * from "./site-header";
export * from "./site-footer";
export * from "./header";
export * from "./footer";
```

---

### 4.6. Overhauled Root Layout (`apps/web/src/app/layout.tsx`)

#### Features:
- Preserves `ThemeScript defaultTheme="system"` inside `<head>`.
- Preserves `suppressHydrationWarning` on `<html lang="en">`.
- Wraps application tree in `<ThemeProvider defaultTheme="system">`.
- Body styles: `min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-accent/20 selection:text-accent`.
- Header: `<SiteHeader />`.
- Main content: `<main className="flex-1">{children}</main>`.
- Footer: `<SiteFooter />`.

#### Implementation Code:
```tsx
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@repo/ui";
import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "FirstCup — AI Executive Briefings for Tech Leaders",
  description:
    "Your daily 3-minute personalized audio briefing and concise tech intelligence synthesized before your first sip of coffee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-accent/20 selection:text-accent">
        <ThemeProvider defaultTheme="system">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 5. Verification Checklist for the Worker

After applying these files:
1. **Directory Creation**:
   Ensure `apps/web/src/components` directory is created.
2. **File Generation**:
   - `apps/web/src/components/site-header.tsx`
   - `apps/web/src/components/header.tsx`
   - `apps/web/src/components/site-footer.tsx`
   - `apps/web/src/components/footer.tsx`
   - `apps/web/src/components/index.ts`
   - `apps/web/src/app/layout.tsx` (overwritten with clean modular architecture)
3. **Responsive Testing**:
   - Verify on mobile viewports (360px, 390px, 640px, 767px): Hamburger icon appears, clicking opens drawer, links are unsuppressed, action buttons stack vertically with full width, theme switcher works.
   - Verify on desktop viewports (768px, 1024px, 1280px, 1440px): Main nav links display inline, hamburger disappears, theme toggle appears as dropdown.
4. **Theme Testing**:
   - Toggle between Light, Dark, and System using both the header dropdown and mobile segmented control. Confirm zero FOUC on reload.
5. **Lint and Typecheck**:
   - Run `turbo typecheck` or `bun run --filter @repo/web typecheck`.
   - Run `biome check apps/web`.
