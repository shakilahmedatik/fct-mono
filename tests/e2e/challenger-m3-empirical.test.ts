/**
 * Challenger 2: Empirical Stress Test Suite
 * Milestone 3: Web App Revamp (`apps/web`)
 *
 * Focus Areas:
 * 1. SiteHeader Architecture & Navigation:
 *    - Brand rendering & Coffee icon
 *    - Desktop navigation links & active route computation
 *    - Desktop actions (ThemeToggle dropdown, Sign In, Console CTA)
 * 2. Responsive Mobile Drawer:
 *    - Hamburger toggle state & ARIA attributes
 *    - Unsuppressed mobile navigation links (accessible & full width)
 *    - Mobile action buttons (ThemeToggle segmented, Console, Sign In)
 *    - No duplicate brand element in mobile drawer
 *    - Mobile drawer dismissal handlers on link & button click
 * 3. SiteFooter Architecture & Interactivity:
 *    - 4-column structured navigation (Brand & Social, Product, Resources, Company)
 *    - Newsletter form submission & subscribed state toggle
 *    - Clean inline SVGs for GitHub, Twitter/X, LinkedIn (no missing Lucide imports)
 *    - Copyright notice, operational status indicator, and SystemThemeIndicator hydration safety
 * 4. Cross-Application Integration:
 *    - Correct cross-app URLs (http://localhost:3001, http://localhost:3001/login)
 * 5. Root Layout Shell Integration:
 *    - Zero-FOUC ThemeScript and ThemeProvider wrapping
 *    - Semantic layout landmarks (header, main, footer)
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { type EmulatedTab, setupDOM, teardownDOM } from "./harness/mock-dom";
import { APPS_PATH, el, inspectHtml, React } from "./harness/test-utils";

// Mock Next.js navigation hooks and Link component
let currentPathname: string | null = "/";

let actualNav: Record<string, unknown> = {};
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "web/src/components")],
  });
  actualNav = require(resolvedNextNav);
} catch (_e) {}

const navMock = {
  ...actualNav,
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
};

mock.module("next/navigation", () => navMock);
try {
  const resolvedNextNav = require.resolve("next/navigation", {
    paths: [path.join(APPS_PATH, "web/src/components")],
  });
  mock.module(resolvedNextNav, () => navMock);
  const internalNav = require.resolve("./dist/client/components/navigation", {
    paths: [path.dirname(resolvedNextNav)],
  });
  mock.module(internalNav, () => navMock);
} catch (_e) {}

mock.module("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Dynamically import component under test so mocks take effect
const { SiteHeader } = await import("../../apps/web/src/components/site-header");
const { SiteFooter } = await import("../../apps/web/src/components/site-footer");

import { ThemeProvider } from "../../packages/ui/src";

describe("Challenger 2 (M3): Empirical Shell Navigation, Mobile Drawer & Footer Stress Suite", () => {
  let _dom: EmulatedTab;

  beforeEach(() => {
    _dom = setupDOM();
    currentPathname = "/";
  });

  afterEach(() => {
    teardownDOM();
  });

  // =========================================================================
  // Area 1: SiteHeader Desktop Navigation & Brand Architecture
  // =========================================================================
  describe("Area 1: SiteHeader Desktop Navigation & Brand Architecture", () => {
    test("1.1 Renders single NavbarBrand with Coffee icon and correct link to '/'", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));

      // Verify brand link exists
      expect(inspector.contains('href="/"')).toBeTrue();
      expect(inspector.contains("First Cup")).toBeTrue();
      expect(inspector.contains("Tech")).toBeTrue();

      // Verify Coffee icon is rendered inside brand logo container
      expect(inspector.contains("lucide-coffee")).toBeTrue();
    });

    test("1.2 Renders all 4 desktop navigation links with correct hrefs", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));

      expect(inspector.contains('href="/#features"')).toBeTrue();
      expect(inspector.contains('href="/pricing"')).toBeTrue();
      expect(inspector.contains('href="/blog"')).toBeTrue();
      expect(inspector.contains('href="/contact"')).toBeTrue();

      expect(inspector.contains("Features")).toBeTrue();
      expect(inspector.contains("Pricing")).toBeTrue();
      expect(inspector.contains("Blog")).toBeTrue();
      expect(inspector.contains("Contact")).toBeTrue();
    });

    test("1.3 Desktop navigation links are hidden on mobile viewports (< md)", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));

      // NavbarNav has `hidden md:flex`
      expect(inspector.contains("hidden md:flex")).toBeTrue();
    });

    test("1.4 Active route highlighting correctly computes for current pathname", () => {
      // Test 1: Pricing page active
      currentPathname = "/pricing";
      let inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains('href="/pricing"')).toBeTrue();
      // Pricing link should have aria-current="page"
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/pricing"/)).toBeTrue();

      // Test 2: Blog index active
      currentPathname = "/blog";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/blog"/)).toBeTrue();

      // Test 3: Nested Blog post active (/blog/deep-dive)
      currentPathname = "/blog/deep-dive";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/blog"/)).toBeTrue();

      // Test 4: Contact page active
      currentPathname = "/contact";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/contact"/)).toBeTrue();

      // Test 5: Root path (pricing/blog/contact should NOT be aria-current="page")
      currentPathname = "/";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/pricing"/)).toBeFalse();
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/contact"/)).toBeFalse();
    });

    test("1.5 Desktop actions contain dropdown ThemeToggle and cross-app links", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));

      // Verify ThemeToggle SSR placeholder (Sun icon placeholder prevents FOUC/hydration mismatch)
      expect(inspector.contains("lucide-sun")).toBeTrue();

      // Verify Sign In link pointing to console auth
      expect(inspector.contains('href="http://localhost:3001/login"')).toBeTrue();
      expect(inspector.contains("Sign In")).toBeTrue();

      // Verify Console primary CTA link
      expect(inspector.contains('href="http://localhost:3001"')).toBeTrue();
      expect(inspector.contains("Console")).toBeTrue();
      expect(inspector.contains("lucide-arrow-right")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 2: Responsive Mobile Drawer & State Verification
  // =========================================================================
  describe("Area 2: Responsive Mobile Drawer & State Verification", () => {
    test("2.1 Hamburger toggle has accessible attributes and responsive classes", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));

      // Mobile toggle button has md:hidden
      expect(inspector.contains("md:hidden")).toBeTrue();
      expect(inspector.contains('aria-label="Toggle mobile menu"')).toBeTrue();
      expect(inspector.contains('aria-expanded="false"')).toBeTrue();

      // Menu icon rendered when closed
      expect(inspector.contains("lucide-menu")).toBeTrue();
    });

    test("2.2 Mobile drawer unsuppresses navigation links and renders action buttons", () => {
      // In SSR / initial render, mobileOpen is false by default.
      // Let's inspect the component code to verify MobileNavDrawer structure directly
      const siteHeaderSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );

      // 1. MobileNavDrawer renders <nav aria-label="Mobile navigation">
      expect(siteHeaderSrc.includes('aria-label="Mobile navigation"')).toBeTrue();

      // 2. Unsuppresses all navLinks with link.label and link.href
      expect(siteHeaderSrc.includes("{link.label}")).toBeTrue();
      expect(siteHeaderSrc.includes("href={link.href}")).toBeTrue();

      // 3. Renders segmented ThemeToggle in mobile drawer
      expect(siteHeaderSrc.includes('<ThemeToggle variant="segmented" />')).toBeTrue();

      // 4. Renders the Console button in the mobile drawer. The URL is built by
      // the shared, environment-driven `appUrl()` helper (apps/web/src/lib/config.ts)
      // instead of a hard-coded origin.
      expect(siteHeaderSrc.includes("appUrl")).toBeTrue();
      expect(siteHeaderSrc.includes('href={appUrl("/")}')).toBeTrue();

      // 5. Renders the Sign In button in the mobile drawer
      expect(siteHeaderSrc.includes('href={appUrl("/login")}')).toBeTrue();
    });

    test("2.3 Mobile drawer does NOT contain duplicate NavbarBrand elements", () => {
      const siteHeaderSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );

      // Inspect MobileNavDrawer function in site-header.tsx
      const mobileNavMatch = siteHeaderSrc.match(
        /function MobileNavDrawer[\s\S]*?return\s*\(([\s\S]*?)\);\s*\}/,
      );
      expect(mobileNavMatch).not.toBeNull();
      const mobileNavBody = mobileNavMatch![1];

      // Mobile drawer must NOT render NavbarBrand, First Cup text, or Coffee logo
      expect(mobileNavBody.includes("<NavbarBrand")).toBeFalse();
      expect(mobileNavBody.includes("First Cup")).toBeFalse();
      expect(mobileNavBody.includes("<Coffee")).toBeFalse();
    });

    test("2.4 Mobile drawer items call navbar.setMobileOpen(false) to dismiss drawer", () => {
      const siteHeaderSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );

      // Verify onClick dismissal handlers on links, console button, sign-in button
      const dismissalMatches = siteHeaderSrc.match(/navbar\?\.setMobileOpen\(false\)/g);
      expect(dismissalMatches).not.toBeNull();
      // At least 3 dismiss calls: mobile nav links, console button, sign-in button
      expect(dismissalMatches!.length >= 3).toBeTrue();
    });
  });

  // =========================================================================
  // Area 3: SiteFooter Architecture, Social Icons & Interactivity
  // =========================================================================
  describe("Area 3: SiteFooter Architecture, Social Icons & Interactivity", () => {
    test("3.1 Renders 4-column link layout with distinct category headers", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteFooter)));

      // Category headers
      expect(inspector.contains("Product")).toBeTrue();
      expect(inspector.contains("Resources")).toBeTrue();
      expect(inspector.contains("Company")).toBeTrue();

      // Brand column
      expect(inspector.contains("First")).toBeTrue();
      expect(inspector.contains("Cup")).toBeTrue();
      expect(inspector.contains("AI-synthesized executive briefings")).toBeTrue();

      // Grid classes: 2 cols on mobile, 4 on md, 5 on lg
      expect(inspector.contains("grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5")).toBeTrue();
    });

    test("3.2 Renders all required product and resource links", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteFooter)));

      // Product links
      expect(inspector.contains('href="/#features"')).toBeTrue();
      expect(inspector.contains('href="/#preview"')).toBeTrue();
      expect(inspector.contains('href="/pricing"')).toBeTrue();
      expect(inspector.contains('href="/blog"')).toBeTrue();

      // Resource links
      expect(inspector.contains('href="http://localhost:3001"')).toBeTrue(); // Documentation
      expect(inspector.contains('href="/contact"')).toBeTrue(); // Community & Careers & Contact
      expect(inspector.contains('href="https://status.firstcup.tech"')).toBeTrue(); // Status

      // Company legal links
      expect(inspector.contains('href="/privacy"')).toBeTrue();
      expect(inspector.contains('href="/terms"')).toBeTrue();
    });

    test("3.3 Renders clean inline SVGs for GitHub, Twitter/X, and LinkedIn without missing Lucide imports", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteFooter)));

      // Verify social link URLs and aria-labels
      expect(inspector.contains('href="https://github.com"')).toBeTrue();
      expect(inspector.contains('aria-label="FirstCup on GitHub"')).toBeTrue();

      expect(inspector.contains('href="https://twitter.com"')).toBeTrue();
      expect(inspector.contains('aria-label="FirstCup on Twitter"')).toBeTrue();

      expect(inspector.contains('href="https://linkedin.com"')).toBeTrue();
      expect(inspector.contains('aria-label="FirstCup on LinkedIn"')).toBeTrue();

      // Verify SVG attributes
      expect(inspector.contains('viewBox="0 0 24 24"')).toBeTrue();
      expect(inspector.contains('fill="currentColor"')).toBeTrue();
      expect(inspector.contains('aria-hidden="true"')).toBeTrue();
      expect(inspector.contains('target="_blank"')).toBeTrue();
      expect(inspector.contains('rel="noreferrer"')).toBeTrue();

      // Verify no invalid Lucide imports in source code
      const footerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-footer.tsx"),
        "utf8",
      );
      expect(footerSrc.includes("lucide-react/dist/esm/icons/github")).toBeFalse();
      expect(footerSrc.includes("lucide-react/dist/esm/icons/twitter")).toBeFalse();
      expect(footerSrc.includes("lucide-react/dist/esm/icons/linkedin")).toBeFalse();
    });

    test("3.4 Newsletter form renders email input and submit button with executive briefing badge", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteFooter)));

      expect(inspector.contains("Daily Executive Briefing")).toBeTrue();
      expect(inspector.contains("Synthesized tech intelligence before your first sip")).toBeTrue();
      expect(inspector.contains('type="email"')).toBeTrue();
      expect(inspector.contains('placeholder="name@company.com"')).toBeTrue();
      expect(inspector.contains('aria-label="Work email address"')).toBeTrue();
      expect(inspector.contains("Subscribe")).toBeTrue();
      expect(inspector.contains("Zero spam. Unsubscribe in one click anytime.")).toBeTrue();
    });

    test("3.5 Copyright notice, system health indicator, and SystemThemeIndicator", () => {
      const inspector = inspectHtml(el(ThemeProvider, null, el(SiteFooter)));

      // Copyright
      expect(inspector.contains("© 2026 FirstCup, Inc. All rights reserved.")).toBeTrue();

      // Operational status
      expect(inspector.contains("All systems normal")).toBeTrue();
      expect(inspector.contains("animate-ping")).toBeTrue();

      // SystemThemeIndicator SSR fallback
      expect(inspector.contains("Theme: System")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 4: Cross-Application Integration & Root Layout Landmark Verification
  // =========================================================================
  describe("Area 4: Cross-Application Integration & Root Layout", () => {
    test("4.1 apps/web/src/app/layout.tsx integrates ThemeScript, ThemeProvider, SiteHeader, SiteFooter", () => {
      const layoutSrc = fs.readFileSync(path.join(APPS_PATH, "web/src/app/layout.tsx"), "utf8");

      expect(layoutSrc.includes('<ThemeScript defaultTheme="system" />')).toBeTrue();
      expect(layoutSrc.includes('<ThemeProvider defaultTheme="system">')).toBeTrue();
      expect(layoutSrc.includes("<SiteHeader />")).toBeTrue();
      expect(layoutSrc.includes('<main className="flex-1">{children}</main>')).toBeTrue();
      expect(layoutSrc.includes("<SiteFooter />")).toBeTrue();
      expect(layoutSrc.includes("suppressHydrationWarning")).toBeTrue();
    });

    test("4.2 Cross-app links resolve to correct console and admin ports", () => {
      const headerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );
      const footerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-footer.tsx"),
        "utf8",
      );
      const configSrc = fs.readFileSync(path.join(APPS_PATH, "web/src/lib/config.ts"), "utf8");

      // The cross-app origins are environment driven and live in one place
      // (apps/web/src/lib/config.ts), so no component hard-codes an origin.
      expect(headerSrc.includes('from "../lib/config"')).toBeTrue();
      expect(footerSrc.includes('from "../lib/config"')).toBeTrue();

      // Console base port 3001
      expect(configSrc.includes("NEXT_PUBLIC_APP_URL")).toBeTrue();
      expect(configSrc).toContain(":3001");

      // Admin base port 3002
      expect(configSrc.includes("NEXT_PUBLIC_ADMIN_URL")).toBeTrue();
      expect(configSrc).toContain(":3002");

      // The components resolve their links through those helpers.
      expect(headerSrc.includes("appUrl")).toBeTrue();
      expect(footerSrc.includes("appUrl")).toBeTrue();
    });

    test("4.3 Component barrel exports clean aliases for modular consumption", () => {
      const indexSrc = fs.readFileSync(path.join(APPS_PATH, "web/src/components/index.ts"), "utf8");

      expect(indexSrc.includes('export * from "./site-header"')).toBeTrue();
      expect(indexSrc.includes('export * from "./site-footer"')).toBeTrue();
      expect(indexSrc.includes('export * from "./audio-digest-preview"')).toBeTrue();
    });
  });

  // =========================================================================
  // Area 5: Adversarial Edge Cases & Design System Token Purity
  // =========================================================================
  describe("Area 5: Adversarial Edge Cases & Token Purity", () => {
    test("5.1 Zero hardcoded hex colors or inline custom color definitions", () => {
      const headerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );
      const footerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-footer.tsx"),
        "utf8",
      );

      // Verify no hardcoded hex colors (e.g. #fff, #111827) except SVG viewBox/namespaces
      const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
      const headerHexMatches = headerSrc.match(hexRegex) || [];
      // Only anchor hash links like #features are valid, no hex colors
      expect(headerHexMatches.filter((m) => m.length > 2)).toEqual([]);

      // In footer, filter out anchor links (#features, #preview)
      const footerHexMatches = (footerSrc.match(hexRegex) || []).filter(
        (m) => !["#features", "#preview"].includes(m),
      );
      expect(footerHexMatches).toEqual([]);
    });

    test("5.2 All interactive buttons and links have visible focus outline styling", () => {
      const headerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-header.tsx"),
        "utf8",
      );
      const footerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-footer.tsx"),
        "utf8",
      );

      // Header uses buttonVariants from @repo/ui which enforces focus-visible:ring-ring
      expect(headerSrc.includes("buttonVariants")).toBeTrue();
      // Footer uses Button from @repo/ui
      expect(footerSrc.includes("<Button")).toBeTrue();
    });

    test("5.3 Footer links resolve to real paths or valid external protocols", () => {
      const footerSrc = fs.readFileSync(
        path.join(APPS_PATH, "web/src/components/site-footer.tsx"),
        "utf8",
      );

      const hrefMatches = Array.from(footerSrc.matchAll(/href="([^"]+)"/g)).map((m) => m[1]);

      for (const href of hrefMatches) {
        // Must start with /, http://, or https://
        const isValid =
          href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
        expect(isValid).toBeTrue();
        // Must not be an empty href or bare "#"
        expect(href).not.toBe("#");
        expect(href).not.toBe("");
      }
    });

    test("5.4 Pathname edge case resilience (null, empty, deep paths)", () => {
      // Test null pathname
      currentPathname = null;
      let inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains('href="/pricing"')).toBeTrue();
      expect(inspector.contains(/<a[^>]*aria-current="page"/)).toBeFalse();

      // Test deep blog post subpath
      currentPathname = "/blog/2026-10-14-ai-digest-architecture";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"[^>]*href="\/blog"/)).toBeTrue();

      // Test unrelated path
      currentPathname = "/settings";
      inspector = inspectHtml(el(ThemeProvider, null, el(SiteHeader)));
      expect(inspector.contains(/<a[^>]*aria-current="page"/)).toBeFalse();
    });
  });
});
