/**
 * Challenger 1: Milestone 3 Web App Revamp Empirical Challenge Suite
 * Focus Areas:
 * 1. Landing Page (`apps/web/src/app/page.tsx`):
 *    - Hero headline & copy
 *    - Dual CTA buttons ("Get Started Free" & "Listen to Sample")
 *    - 4 StatCard values ("3 Min", "500+", "12,000+", "99.4%") with titles, subtitles, and trends
 *    - Embedded AudioDigestPreview with play/pause and equalizer visualizer bars
 *    - 6-card Feature Grid with Lucide icons
 *    - Executive endorsements / testimonials with 5-star ratings and author avatars
 *    - 6-card FAQ grid
 *    - Final Call-to-Action banner card
 * 2. Pricing Page (`apps/web/src/app/pricing/page.tsx`):
 *    - Community ($0), Executive Pro ($9/$7), Team Intelligence ($29/$23) cards
 *    - Feature checklists with Check and Minus icons
 *    - Billing cadence Switch toggle (Monthly vs Annual - Save 20%)
 *    - Enterprise inquiry banner linking to /contact
 *    - 5-card Pricing FAQ
 * 3. Contact Page (`apps/web/src/app/contact/page.tsx`):
 *    - Form labels (Name, Email, Inquiry Type, Subject, Message) and required marks
 *    - Form inputs, Select dropdown options, and Textarea
 *    - Support info sidebar: direct channels (support, enterprise, press) and response SLAs
 *    - Client validation & interactive Alert submission feedback
 * 4. Blog Suite (`apps/web/src/app/blog/page.tsx` & `[slug]/page.tsx`):
 *    - Blog index featured article hero, category filter tabs, search input, article cards, newsletter banner
 *    - Blog post detail: back link, category badge, reading time, author meta
 *    - Executive Summary alert (Alert variant="info") with key takeaways
 *    - Editorial prose, code snippet card, and author bio card
 *    - Valid catalog slugs vs 404 on unknown slug
 * 5. Shell & Global Layout (`layout.tsx`, `SiteHeader`, `SiteFooter`):
 *    - Root layout with ThemeScript and ThemeProvider
 *    - SiteHeader with brand logo, nav links, ThemeToggle, and mobile drawer
 *    - SiteFooter with newsletter signup, 4-column layout, social SVGs, and live theme indicator
 * 6. Adversarial Stress & Edge Cases:
 *    - Resilience to API client network failures and null payloads
 *    - Empty topic chips and null briefing summaries
 *    - Semantic design token adherence (zero hardcoded forbidden color classes)
 */

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import React from "../../apps/web/node_modules/react";
import { renderToStaticMarkup } from "../../apps/web/node_modules/react-dom/server";
import {
  AudioDigestPreview,
  type LatestBriefingData,
} from "../../apps/web/src/components/audio-digest-preview";
import { SiteFooter } from "../../apps/web/src/components/site-footer";
import { SiteHeader } from "../../apps/web/src/components/site-header";
import { ThemeProvider } from "../../packages/ui/src";
import { inspectHtml } from "./harness/test-utils";

// Dynamic imports for Next.js app pages
const getHomePage = async () => (await import("../../apps/web/src/app/page")).default;
const getPricingPage = async () => (await import("../../apps/web/src/app/pricing/page")).default;
const getContactPage = async () => (await import("../../apps/web/src/app/contact/page")).default;
const getBlogPage = async () => (await import("../../apps/web/src/app/blog/page")).default;
const getBlogPostPage = async () =>
  (await import("../../apps/web/src/app/blog/[slug]/page")).default;
const getBlogPostMetadata = async () =>
  (await import("../../apps/web/src/app/blog/[slug]/page")).generateMetadata;

describe("Challenger M3: Web App Revamp Empirical Challenge Suite", () => {
  // =========================================================================
  // Area 1: Landing Page (`apps/web/src/app/page.tsx`)
  // =========================================================================
  describe("Area 1: Landing Page Verification", () => {
    test("1.1 Hero Section renders headline, announcement badge, and subtitle", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Announcement badge
      expect(inspector.contains("New: AI-curated audio briefs")).toBeTrue();

      // Hero headline
      expect(inspector.contains("Synthesized Tech Briefings")).toBeTrue();
      expect(inspector.contains("Before Your First Sip.")).toBeTrue();

      // Subtitle copy
      expect(
        inspector.contains(
          "Stop drowning in 50 browser tabs. Every morning at 7:00 AM, First Cup reads GitHub",
        ),
      ).toBeTrue();
    });

    test("1.2 Dual CTA buttons are present with correct destination links and styles", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Primary CTA: Get Started Free linking to Console (http://localhost:3001)
      expect(inspector.contains("Get Started Free")).toBeTrue();
      expect(inspector.hasAttribute("href", "http://localhost:3001")).toBeTrue();

      // Secondary CTA: Listen to Sample linking to #preview anchor
      expect(inspector.contains("Listen to Sample")).toBeTrue();
      expect(inspector.hasAttribute("href", "#preview")).toBeTrue();

      // Trust guarantees
      expect(
        inspector.contains("Telegram &amp; WhatsApp Delivery") ||
          inspector.contains("Telegram & WhatsApp Delivery"),
      ).toBeTrue();
      expect(inspector.contains("Studio Audio Quality")).toBeTrue();
      expect(inspector.contains("Zero Sponsored Fluff")).toBeTrue();
    });

    test("1.3 Four StatCard KPI metric tiles render correct values, titles, and trends", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // StatCard 1: Duration
      expect(inspector.contains("Briefing Duration")).toBeTrue();
      expect(inspector.contains("3 Min")).toBeTrue();
      expect(inspector.contains("Time-capped")).toBeTrue();
      expect(inspector.contains("Zero fluff, pure signal")).toBeTrue();

      // StatCard 2: Sources
      expect(inspector.contains("Sources Scanned")).toBeTrue();
      expect(inspector.contains("500+")).toBeTrue();
      expect(inspector.contains("+14 feeds")).toBeTrue();
      expect(
        inspector.contains("GitHub, HN, blogs &amp; arXiv") ||
          inspector.contains("GitHub, HN, blogs & arXiv"),
      ).toBeTrue();

      // StatCard 3: Active Leaders
      expect(inspector.contains("Active Leaders")).toBeTrue();
      expect(inspector.contains("12,000+")).toBeTrue();
      expect(inspector.contains("4.9/5 stars")).toBeTrue();
      expect(
        inspector.contains("Staff &amp; Principal engineers") ||
          inspector.contains("Staff & Principal engineers"),
      ).toBeTrue();

      // StatCard 4: Signal Accuracy
      expect(inspector.contains("Signal Accuracy")).toBeTrue();
      expect(inspector.contains("99.4%")).toBeTrue();
      expect(inspector.contains("Cosine filtered")).toBeTrue();
      expect(inspector.contains("Deduplicated vector clusters")).toBeTrue();
    });

    test("1.4 Feature Grid contains exactly 6 feature cards with Lucide icons and descriptions", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Section header
      expect(inspector.contains("Everything Tech Leaders Need Before Standup")).toBeTrue();

      // 6 Feature Titles
      expect(inspector.contains("3-Minute Strict Timebox")).toBeTrue();
      expect(inspector.contains("Studio Audio Generation")).toBeTrue();
      expect(inspector.contains("Vector-Clustered Signal")).toBeTrue();
      expect(inspector.contains("Source Credibility Filter")).toBeTrue();
      expect(inspector.contains("Instant Messenger Delivery")).toBeTrue();
      expect(inspector.contains("Personalized Tech Graph")).toBeTrue();

      // Technical descriptions check
      expect(inspector.contains("FP8 quantization and eBPF")).toBeTrue();
      expect(inspector.contains("Telegram, WhatsApp, or private RSS reader")).toBeTrue();
      expect(inspector.contains("Rust, Kubernetes, LLM inference")).toBeTrue();
    });

    test("1.5 Executive Endorsements section renders 3 testimonials with 5-star ratings and author avatars", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Section header and aggregate rating
      expect(inspector.contains("Trusted by Leaders at Scale")).toBeTrue();
      expect(inspector.contains("4.9/5 from 12,000+ technology leaders")).toBeTrue();

      // Testimonial 1: Sarah Lin
      expect(inspector.contains("Sarah Lin")).toBeTrue();
      expect(inspector.contains("VP of Engineering at ScaleCloud")).toBeTrue();
      expect(inspector.contains("FirstCup completely replaced my 40 open browser tabs")).toBeTrue();

      // Testimonial 2: Marcus Vance
      expect(inspector.contains("Marcus Vance")).toBeTrue();
      expect(inspector.contains("Principal Architect at DataMesh Labs")).toBeTrue();
      expect(
        inspector.contains("The audio quality and pronunciation of technical terms"),
      ).toBeTrue();

      // Testimonial 3: Elena Rostova
      expect(inspector.contains("Elena Rostova")).toBeTrue();
      expect(inspector.contains("Head of Infrastructure at FinEdge")).toBeTrue();
      expect(inspector.contains("Having daily audio briefs delivered directly")).toBeTrue();
    });

    test("1.6 FAQ section renders 6 comprehensive question-and-answer cards", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      expect(inspector.contains("Frequently Asked Questions")).toBeTrue();
      expect(inspector.contains("How are technical stories gathered and verified?")).toBeTrue();
      expect(inspector.contains("What messaging channels are supported?")).toBeTrue();
      expect(inspector.contains("Can I customize my tech stack and topics?")).toBeTrue();
      expect(inspector.contains("What time is the daily briefing delivered?")).toBeTrue();
      expect(inspector.contains("How does the 14-day free trial work?")).toBeTrue();
      expect(inspector.contains("Do you offer team and enterprise plans?")).toBeTrue();
    });

    test("1.7 Final CTA section renders converted banner with actions and guarantees", async () => {
      const HomePage = await getHomePage();
      const element = await HomePage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      expect(inspector.contains("Ready to Upgrade Your Morning Tech Signal?")).toBeTrue();
      expect(inspector.contains("Start 14-Day Free Trial")).toBeTrue();
      expect(inspector.contains("Explore Pricing")).toBeTrue();
      expect(inspector.contains("No credit card required")).toBeTrue();
      expect(inspector.contains("Instant 2-minute setup")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 2: Pricing Page (`apps/web/src/app/pricing/page.tsx`)
  // =========================================================================
  describe("Area 2: Pricing Page Verification", () => {
    test("2.1 Renders Community ($0), Executive Pro ($7/$9), and Team Intelligence ($23/$29) tiers", async () => {
      const PricingPage = await getPricingPage();
      const element = React.createElement(PricingPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Header
      expect(inspector.contains("Invest in High-Signal Tech Intelligence")).toBeTrue();

      // Tier 1: Community
      expect(inspector.contains("Community")).toBeTrue();
      expect(inspector.contains("$0")).toBeTrue();
      expect(inspector.contains("/ forever")).toBeTrue();
      expect(inspector.contains("Weekly email intelligence newsletter")).toBeTrue();

      // Tier 2: Executive Pro
      expect(inspector.contains("Executive Pro")).toBeTrue();
      expect(inspector.contains("Most Popular")).toBeTrue();
      expect(inspector.contains("$7") || inspector.contains("$9")).toBeTrue();
      expect(inspector.contains("Daily 3-minute studio audio briefing (7:00 AM)")).toBeTrue();
      expect(
        inspector.contains("Direct delivery via Telegram, WhatsApp, &amp; RSS") ||
          inspector.contains("Direct delivery via Telegram, WhatsApp, & RSS"),
      ).toBeTrue();

      // Tier 3: Team Intelligence
      expect(inspector.contains("Team Intelligence")).toBeTrue();
      expect(inspector.contains("$23") || inspector.contains("$29")).toBeTrue();
      expect(inspector.contains("5 team member accounts included")).toBeTrue();
      expect(
        inspector.contains("Shared team Slack &amp; Discord channel delivery") ||
          inspector.contains("Shared team Slack & Discord channel delivery"),
      ).toBeTrue();
    });

    test("2.2 Billing cadence switch renders with switch role and Save 20% badge", async () => {
      const PricingPage = await getPricingPage();
      const element = React.createElement(PricingPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      expect(inspector.hasRole("switch")).toBeTrue();
      expect(inspector.hasAttribute("aria-label", "Toggle annual billing cadence")).toBeTrue();
      expect(inspector.contains("Monthly")).toBeTrue();
      expect(inspector.contains("Annual")).toBeTrue();
      expect(inspector.contains("Save 20%")).toBeTrue();
    });

    test("2.3 Feature checklists contain Check (included) and Minus (excluded) indicators", async () => {
      const PricingPage = await getPricingPage();
      const element = React.createElement(PricingPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Check for Lucide check and minus SVG classes or paths
      expect(inspector.contains("lucide-check")).toBeTrue();
      expect(inspector.contains("lucide-minus")).toBeTrue();

      // Community tier has minus indicators for premium features
      expect(
        inspector.contains("Team seats &amp; shared channels") ||
          inspector.contains("Team seats & shared channels"),
      ).toBeTrue();
    });

    test("2.4 Enterprise inquiry banner and Billing FAQ render completely", async () => {
      const PricingPage = await getPricingPage();
      const element = React.createElement(PricingPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Enterprise Banner
      expect(inspector.contains("Need Custom Deployments or 20+ Seats?")).toBeTrue();
      expect(inspector.contains("Contact Enterprise Sales")).toBeTrue();
      expect(inspector.hasAttribute("href", "/contact")).toBeTrue();

      // FAQ
      expect(inspector.contains("Frequently Asked Questions About Billing")).toBeTrue();
      expect(inspector.contains("Can I switch between monthly and annual billing?")).toBeTrue();
      expect(inspector.contains("What payment methods do you accept?")).toBeTrue();
      expect(inspector.contains("What is your cancellation and refund policy?")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 3: Contact Page (`apps/web/src/app/contact/page.tsx`)
  // =========================================================================
  describe("Area 3: Contact Page Verification", () => {
    test("3.1 Form renders all semantic input slots, labels with required marks, and textarea", async () => {
      const ContactPage = await getContactPage();
      const element = React.createElement(ContactPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Heading (handling HTML encoded apostrophe)
      expect(inspector.contains("Here to Elevate Your Daily Intelligence")).toBeTrue();

      // Form labels
      expect(inspector.contains("Full Name")).toBeTrue();
      expect(inspector.contains("Work Email")).toBeTrue();
      expect(inspector.contains("Inquiry Type")).toBeTrue();
      expect(inspector.contains("Subject")).toBeTrue();
      expect(inspector.contains("Message")).toBeTrue();

      // Required indicator asterisk
      expect(inspector.contains("text-destructive")).toBeTrue();

      // Inputs & Textarea
      expect(inspector.hasAttribute("id", "contact-name")).toBeTrue();
      expect(inspector.hasAttribute("id", "contact-email")).toBeTrue();
      expect(inspector.hasAttribute("id", "contact-subject")).toBeTrue();
      expect(inspector.hasAttribute("id", "contact-message")).toBeTrue();
      expect(inspector.contains("<textarea")).toBeTrue();

      // Submit Button
      expect(inspector.contains("Send Message")).toBeTrue();
    });

    test("3.2 Select dropdown renders all 4 inquiry options", async () => {
      const ContactPage = await getContactPage();
      const element = React.createElement(ContactPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      expect(inspector.contains("General Support")).toBeTrue();
      expect(inspector.contains("Enterprise Sales")).toBeTrue();
      expect(
        inspector.contains("Press &amp; Media") || inspector.contains("Press & Media"),
      ).toBeTrue();
      expect(inspector.contains("Feedback")).toBeTrue();
    });

    test("3.3 Support channels and SLA sidebar render contact emails and dispatch hours", async () => {
      const ContactPage = await getContactPage();
      const element = React.createElement(ContactPage);
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Direct email channels
      expect(inspector.contains("support@firstcup.tech")).toBeTrue();
      expect(inspector.contains("enterprise@firstcup.tech")).toBeTrue();
      expect(inspector.contains("press@firstcup.tech")).toBeTrue();

      // SLA metrics
      expect(
        inspector.contains("Availability &amp; SLA") || inspector.contains("Availability & SLA"),
      ).toBeTrue();
      expect(inspector.contains("06:00 – 21:00 UTC")).toBeTrue();
      expect(
        inspector.contains("&lt; 45 minutes") || inspector.contains("< 45 minutes"),
      ).toBeTrue();
      expect(inspector.contains("&lt; 2 hours") || inspector.contains("< 2 hours")).toBeTrue();
      expect(inspector.contains("Engineers Online")).toBeTrue();
    });
  });

  // =========================================================================
  // Area 4: Blog Suite (`apps/web/src/app/blog/page.tsx` & `[slug]/page.tsx`)
  // =========================================================================
  describe("Area 4: Blog Suite Verification", () => {
    test("4.1 Blog index renders Featured Article Hero, Tabs, and article grid", async () => {
      const BlogPage = await getBlogPage();
      const element = await BlogPage();
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Hero
      expect(
        inspector.contains("Curated Technology &amp; Architecture Briefings") ||
          inspector.contains("Curated Technology & Architecture Briefings"),
      ).toBeTrue();
      expect(inspector.contains("Featured Intelligence")).toBeTrue();
      expect(inspector.contains("The State of Open Source AI Quantization in 2026")).toBeTrue();
      expect(inspector.contains("Read Briefing")).toBeTrue();

      // Category filter tabs
      expect(inspector.hasRole("tablist")).toBeTrue();
      expect(inspector.contains("AI &amp; Voice") || inspector.contains("AI & Voice")).toBeTrue();
      expect(inspector.contains("Engineering")).toBeTrue();
      expect(inspector.contains("Productivity")).toBeTrue();

      // Search input
      expect(inspector.hasAttribute("placeholder", "Search briefings or tags...")).toBeTrue();

      // Fallback articles in grid
      expect(inspector.contains("Next.js 16 and Bun 1.3: The Serverless Convergence")).toBeTrue();
      expect(
        inspector.contains("Sub-300ms Voice Synthesis: The Mechanics of Real-Time Audio AI"),
      ).toBeTrue();
      expect(
        inspector.contains("Valkey 8.0 Benchmarks: Replacing Redis in High-Concurrency Queues"),
      ).toBeTrue();

      // Newsletter banner
      expect(inspector.contains("Never Miss a Breakthrough Architecture Shift")).toBeTrue();
      expect(inspector.contains("Subscribe Free")).toBeTrue();
    });

    test("4.2 Blog post detail renders Executive Summary alert, code snippet, and author bio", async () => {
      const BlogPostPage = await getBlogPostPage();
      const element = await BlogPostPage({
        params: Promise.resolve({ slug: "state-of-quantization-2026" }),
      });
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Navigation back
      expect(inspector.contains("Back to Intelligence Archive")).toBeTrue();

      // Category badge & Title
      expect(inspector.contains("AI &amp; Voice") || inspector.contains("AI & Voice")).toBeTrue();
      expect(inspector.contains("The State of Open Source AI Quantization in 2026")).toBeTrue();

      // Executive Summary alert
      expect(
        inspector.contains("Executive Summary &amp; Strategic Takeaways") ||
          inspector.contains("Executive Summary & Strategic Takeaways"),
      ).toBeTrue();
      expect(
        inspector.contains("FP8 multi-head latent attention cuts KV-cache memory consumption"),
      ).toBeTrue();
      expect(
        inspector.contains("Zero perplexity loss is achieved through dynamic block-wise scaling"),
      ).toBeTrue();

      // Author bio card
      expect(inspector.contains("Dr. Aris Thorne")).toBeTrue();
      expect(inspector.contains("Lead AI Architect at First Cup Tech")).toBeTrue();
      expect(
        inspector.contains("Dr. Aris Thorne leads AI runtime engineering at First Cup Tech"),
      ).toBeTrue();

      // Code snippet preview (handles encoded quotes)
      expect(inspector.contains("packages/pipeline/src/inference/engine.ts")).toBeTrue();
      expect(
        inspector.contains("quantization: &quot;fp8_e4m3&quot;") || inspector.contains("fp8_e4m3"),
      ).toBeTrue();

      // Recommended briefings
      expect(inspector.contains("Recommended Tech Briefings")).toBeTrue();
    });

    test("4.3 Blog post detail triggers Next.js notFound() on non-existent slug", async () => {
      const BlogPostPage = await getBlogPostPage();
      let threw404 = false;

      try {
        await BlogPostPage({
          params: Promise.resolve({ slug: "completely-invalid-slug-404" }),
        });
      } catch (err: unknown) {
        // Next.js notFound() throws NEXT_HTTP_ERROR_FALLBACK;404
        const e = err as { message?: string; digest?: string } | null;
        if (
          e?.message?.includes("NEXT_HTTP_ERROR_FALLBACK") ||
          e?.digest?.includes("NEXT_HTTP_ERROR_FALLBACK")
        ) {
          threw404 = true;
        }
      }

      expect(threw404).toBeTrue();
    });

    test("4.4 Blog post generateMetadata returns valid metadata for existing and missing slugs", async () => {
      const generateMetadata = await getBlogPostMetadata();

      const validMeta = await generateMetadata({
        params: Promise.resolve({ slug: "tech-pulse-2026-10-08" }),
      });
      expect(validMeta.title).toContain("Next.js 16 and Bun 1.3");
      expect(validMeta.description).toContain("executive overview");

      const invalidMeta = await generateMetadata({
        params: Promise.resolve({ slug: "non-existent-slug" }),
      });
      expect(invalidMeta.title).toBe("Article Not Found — First Cup Tech");
    });
  });

  // =========================================================================
  // Area 5: Shell & Layout (`SiteHeader`, `SiteFooter`, `RootLayout`)
  // =========================================================================
  describe("Area 5: Shell & Layout Verification", () => {
    test("5.1 SiteHeader renders brand logo, navigation links, and theme toggle", () => {
      const element = React.createElement(
        ThemeProvider,
        { defaultTheme: "system" },
        React.createElement(SiteHeader),
      );
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Brand
      expect(inspector.contains("First Cup")).toBeTrue();
      expect(inspector.contains("Tech")).toBeTrue();

      // Desktop Nav Links
      expect(inspector.contains("Features")).toBeTrue();
      expect(inspector.contains("Pricing")).toBeTrue();
      expect(inspector.contains("Blog")).toBeTrue();
      expect(inspector.contains("Contact")).toBeTrue();

      // Header actions
      expect(inspector.contains("Sign In")).toBeTrue();
      expect(inspector.contains("Console")).toBeTrue();
      expect(inspector.hasAttribute("href", "http://localhost:3001")).toBeTrue();

      // Theme toggle wrapper
      expect(
        inspector.contains("lucide-sun") ||
          inspector.contains("lucide-moon") ||
          inspector.contains("Theme"),
      ).toBeTrue();
    });

    test("5.2 SiteFooter renders newsletter row, 4-column link layout, and social icons", () => {
      const element = React.createElement(
        ThemeProvider,
        { defaultTheme: "system" },
        React.createElement(SiteFooter),
      );
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      // Newsletter
      expect(inspector.contains("Synthesized tech intelligence before your first sip")).toBeTrue();
      expect(inspector.contains("Subscribe")).toBeTrue();

      // 4 Navigation columns
      expect(inspector.contains("Product")).toBeTrue();
      expect(inspector.contains("Resources")).toBeTrue();
      expect(inspector.contains("Company")).toBeTrue();

      // Social links
      expect(inspector.hasAttribute("aria-label", "FirstCup on GitHub")).toBeTrue();
      expect(inspector.hasAttribute("aria-label", "FirstCup on Twitter")).toBeTrue();
      expect(inspector.hasAttribute("aria-label", "FirstCup on LinkedIn")).toBeTrue();

      // Copyright & Status
      expect(inspector.contains("© 2026 FirstCup, Inc. All rights reserved.")).toBeTrue();
      expect(inspector.contains("All systems normal")).toBeTrue();
    });

    test("5.3 Root layout contains zero-FOUC ThemeScript and ThemeProvider", () => {
      const layoutPath = path.resolve(__dirname, "../../apps/web/src/app/layout.tsx");
      const layoutContent = fs.readFileSync(layoutPath, "utf8");

      expect(layoutContent).toContain('<ThemeScript defaultTheme="system"');
      expect(layoutContent).toContain('<ThemeProvider defaultTheme="system"');
      expect(layoutContent).toContain("suppressHydrationWarning");
      expect(layoutContent).toContain("<SiteHeader");
      expect(layoutContent).toContain("<SiteFooter");
    });
  });

  // =========================================================================
  // Area 6: Adversarial Stress & Edge Cases
  // =========================================================================
  describe("Area 6: Adversarial Stress & Edge Cases", () => {
    test("6.1 AudioDigestPreview is resilient to null briefing data (API down)", () => {
      const element = React.createElement(AudioDigestPreview, { briefing: null });
      const html = renderToStaticMarkup(element);
      const inspector = inspectHtml(html);

      expect(inspector.contains("Engineering Executive Briefing")).toBeTrue();
      expect(inspector.contains("Compiled fresh at 07:00 AM UTC • 3m 12s")).toBeTrue();
      expect(inspector.contains("Studio Voice Ready")).toBeTrue();
      expect(inspector.contains("Executive Digest Outline (3 Stories)")).toBeTrue();
      expect(inspector.contains("DeepSeek-V3 architecture analysis")).toBeTrue();
    });

    test("6.2 AudioDigestPreview handles malformed or empty items without throwing", () => {
      const malformedData: LatestBriefingData = {
        title: "Custom Stream",
        durationSec: 180,
        items: [
          {
            id: "m-1",
            title: "Empty topics and null summary test",
            source: "arXiv",
            summary: null,
            topics: [],
          },
        ],
      };

      expect(() => {
        const element = React.createElement(AudioDigestPreview, { briefing: malformedData });
        const html = renderToStaticMarkup(element);
        expect(html.includes("Custom Stream")).toBeTrue();
        expect(html.includes("TECH")).toBeTrue(); // fallback when topics is empty
      }).not.toThrow();
    });

    test("6.3 All valid blog catalog slugs render with full fidelity", async () => {
      const BlogPostPage = await getBlogPostPage();
      const slugs = [
        "state-of-quantization-2026",
        "tech-pulse-2026-10-08",
        "zero-latency-voice-agents",
      ];

      for (const slug of slugs) {
        const element = await BlogPostPage({ params: Promise.resolve({ slug }) });
        const html = renderToStaticMarkup(element);
        expect(html.length).toBeGreaterThan(10000);
        expect(
          html.includes("Executive Summary &amp; Strategic Takeaways") ||
            html.includes("Executive Summary & Strategic Takeaways"),
        ).toBeTrue();
        expect(html.includes("Recommended Tech Briefings")).toBeTrue();
      }
    });

    test("6.4 Design Token Conformance: Zero hardcoded hex colors in newly revamped web app source", () => {
      const webSrcPath = path.resolve(__dirname, "../../apps/web/src");
      const files = [
        "app/page.tsx",
        "app/pricing/page.tsx",
        "app/contact/page.tsx",
        "app/blog/page.tsx",
        "app/blog/[slug]/page.tsx",
        "app/blog/blog-index-client.tsx",
        "components/site-header.tsx",
        "components/site-footer.tsx",
        "components/audio-digest-preview.tsx",
      ];

      for (const relPath of files) {
        const fullPath = path.join(webSrcPath, relPath);
        const content = fs.readFileSync(fullPath, "utf8");

        // Disallow hex colors (#fff, #1a1a1a, etc.) except inside CSS or comments or code preview blocks
        // Match inline hex patterns like `bg-[#123456]` or `text-[#...]`
        const inlineHexMatch = content.match(/(?:bg|text|border|ring)-\[#(?:[0-9a-fA-F]{3,8})\]/g);
        expect(inlineHexMatch).toBeNull();
      }
    });
  });
});
