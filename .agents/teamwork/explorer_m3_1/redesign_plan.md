# Milestone 3 Explorer 1: Marketing Landing Page & Pricing Page Redesign Plan

**Author**: Explorer 1 (`explorer_m3_1`)  
**Target Applications**: `apps/web` (`src/app/page.tsx` & `src/app/pricing/page.tsx`)  
**Design System**: `@repo/ui` with Tailwind CSS v4 semantic tokens  
**Status**: Ready for Worker Implementation  

---

## 1. Executive Summary & Defect Analysis

A forensic review of the existing `apps/web/src/app/page.tsx` and `apps/web/src/app/pricing/page.tsx` revealed several critical architectural and visual shortcomings when evaluated against the Milestone 3 specifications and the `@repo/ui` design system:

### 1.1 Outdated Styles & Hardcoded Token Violations
- **Hardcoded Colors**: In `apps/web/src/app/page.tsx` (line 77), hero background uses hardcoded RGBA strings (`rgba(34,197,94,0.12)`) rather than semantic theme tokens (`hsl(var(--accent) / 0.12)` or `bg-accent/10`).
- **Inline Custom Shadows**: In `page.tsx` (line 100), `shadow-accent/20` is hardcoded instead of standard elevation shadows (`shadow-md`, `shadow-xl`).
- **Unstyled Native Elements**: In `page.tsx` (line 150), audio play button uses a raw `<button>` with ad-hoc styling rather than `@repo/ui`'s `Button` primitive. In `pricing/page.tsx`, raw `<ul>` and `<li>` elements are styled with ad-hoc margins and lack consistent design system encapsulation.
- **Card Primitives Underutilized**: The feature cards in `page.tsx` (lines 199–231) use raw `<Card className="p-6">` containing arbitrary nested tags rather than `@repo/ui`'s structured `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent` components.

### 1.2 Missing Functional & Visual Sections
- **`apps/web/src/app/page.tsx`**:
  - Missing social proof KPI metrics in the hero using `@repo/ui` `StatCard` (duration, sources scanned, active users, accuracy).
  - Outdated hero badge text (`"Autonomous Daily Tech Intelligence"` instead of requested `"New: AI-curated audio briefs"`).
  - Outdated secondary CTA button (`"View Pricing"` instead of `"Listen to Sample"`).
  - Static, non-interactive mock player missing soundwave equalizer indicator, play/pause state toggle, and structured topic badges (`Badge`).
  - Feature grid limited to 3 generic cards; lacks the full 6-card grid with `Clock`, `Headphones`, `Sparkles`, `Shield`, `Zap`, and `TrendingUp` icons.
  - Completely missing Social Proof / Testimonials section with user quotes, company names, and rating stars.
  - Completely missing FAQ Accordion / Grid using `@repo/ui` `Card`.
  - Completely missing Final CTA banner card prompting user signup.
- **`apps/web/src/app/pricing/page.tsx`**:
  - Missing Billing Cadence Toggle (`@repo/ui` `Switch`) with "Monthly" and "Annual (Save 20%)" states.
  - Outdated 2-tier model ($0 and $12); missing the 3-tier structure: Free / Starter ($0), Pro / Individual ($9/mo or $7/mo annual), and Team / Business ($29/mo or $23/mo annual).
  - Missing highlighted visual treatment for Pro tier: `border-primary` (or `border-accent`), prominent "Most Popular" badge, and elevation.
  - Missing clear feature checklists showing included (`Check`) vs excluded (`Minus`) capabilities.
  - Missing Enterprise inquiry callout banner.
  - Missing Pricing FAQ section.

---

## 2. Architecture & Design Specifications

### 2.1 Design Tokens & Semantic Color Rules
All redesigned markup strictly complies with `@repo/ui` tokens:
- **Surfaces**: `bg-background` for document canvas, `bg-card` for cards and modals, `bg-muted/30` for subtle section grouping.
- **Text**: `text-foreground` for primary headings and body copy, `text-muted-foreground` for descriptions and secondary text, `text-accent` for brand highlights.
- **Borders & Dividers**: `border-border` and `border-border/40` for subtle dividers.
- **Elevations**: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xl`.
- **Zero hardcoded hex values** (`#...`) or hardcoded `rgb/rgba` values in component code.

### 2.2 Component Hierarchy & Structure

```
apps/web/src/app/
├── page.tsx                          # Server Component (data fetch + page composition)
├── pricing/page.tsx                  # Client Component ("use client" for cadence toggle)
└── ...
apps/web/src/components/
└── audio-digest-preview.tsx          # Client Component ("use client" for interactive audio player)
```

---

## 3. Production Code Recommendations for Worker

The worker should implement the following components. All code is copy-pasteable, TypeScript-clean, and strictly adheres to `@repo/ui` standards.

### 3.1 Component 1: `apps/web/src/components/audio-digest-preview.tsx`

This interactive preview card provides a realistic mock audio player with play/pause state toggle, animated equalizer soundwave bars, duration counter, and topic chips.

```tsx
"use client";

import { Badge, Button, Card } from "@repo/ui";
import { Headphones, Pause, Play, Sparkles } from "lucide-react";
import * as React from "react";

export interface DigestItemPreview {
  id: string;
  title: string;
  source: string;
  summary: string | null;
  topics: string[];
}

export interface LatestBriefingData {
  title: string;
  durationSec: number;
  items: DigestItemPreview[];
}

interface AudioDigestPreviewProps {
  briefing: LatestBriefingData | null;
}

export function AudioDigestPreview({ briefing }: AudioDigestPreviewProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<number>(0);

  const durationMin = briefing?.durationSec ? Math.floor(briefing.durationSec / 60) : 3;
  const durationRemainderSec = briefing?.durationSec ? briefing.durationSec % 60 : 12;

  const items: DigestItemPreview[] = briefing?.items?.length
    ? briefing.items
    : [
        {
          id: "1",
          title: "DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent attention",
          source: "hackernews",
          summary:
            "New technical whitepaper highlights novel mixture-of-experts (MoE) optimizations achieving 3x token throughput.",
          topics: ["ai", "inference", "quantization"],
        },
        {
          id: "2",
          title: "Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache engines",
          source: "github",
          summary:
            "The Linux Foundation backed fork releases v8.0 with asynchronous multi-threaded I/O pipelines.",
          topics: ["systems", "database"],
        },
        {
          id: "3",
          title: "Kubernetes 1.32 graduated features: Dynamic Resource Allocation and DRA for GPUs",
          source: "engineering-blog",
          summary:
            "Enhanced driver plugin interface enables fine-grained scheduling and cluster-wide memory sharing.",
          topics: ["cloud-native", "kubernetes"],
        },
      ];

  const waveBarHeights = [
    25, 45, 75, 30, 60, 90, 40, 70, 85, 50, 30, 65, 80, 45, 95, 60, 35, 70, 50, 85, 40, 65, 30, 50,
  ];

  return (
    <Card className="border-border bg-card/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8 text-left transition-all">
      {/* Player Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-5 mb-6 gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-base text-foreground leading-tight">
              {briefing?.title || "Today's Engineering Executive Briefing"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compiled fresh at 07:00 AM UTC • {durationMin}m {durationRemainderSec.toString().padStart(2, "0")}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 px-2.5 py-0.5">
            <Sparkles className="h-3 w-3" />
            <span>Studio Voice Ready</span>
          </Badge>
        </div>
      </div>

      {/* Interactive Soundwave Player */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="primary"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause briefing audio" : "Play briefing audio"}
            className="h-12 w-12 rounded-full shadow-md shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 ml-0.5 fill-current" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            {/* Visualizer Waveform */}
            <div className="flex items-center gap-1 h-8 px-1">
              {waveBarHeights.map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    i < (isPlaying ? 14 : 7)
                      ? "bg-accent"
                      : "bg-muted-foreground/30"
                  } ${isPlaying ? "animate-pulse" : ""}`}
                  style={{
                    height: `${isPlaying ? Math.max(20, (height * ((i % 3) + 1)) % 100) : height}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>

            {/* Time Indicator & Progress Track */}
            <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
              <span>{isPlaying ? "0:42" : "0:00"}</span>
              <span className="text-[11px] uppercase tracking-wider text-accent font-sans font-semibold">
                {isPlaying ? "Playing sample brief" : "Click to sample audio"}
              </span>
              <span>
                {durationMin}:{durationRemainderSec.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Chips */}
      <div className="mt-5 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Topics:</span>
        <Badge variant="outline">AI Infrastructure</Badge>
        <Badge variant="outline">Distributed Systems</Badge>
        <Badge variant="outline">High-Throughput IO</Badge>
        <Badge variant="secondary">Zero Fluff</Badge>
      </div>

      {/* Curated Feed Items Accordion/Preview */}
      <div className="mt-6 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Executive Digest Outline ({items.length} Stories)
        </div>
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(idx)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeItem === idx
                ? "border-accent/40 bg-accent/5 shadow-xs"
                : "border-border/40 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-accent">
                #{idx + 1} • {item.topics[0]?.toUpperCase() || "TECH"}
              </span>
              <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-mono">
                {item.source}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
            {item.summary && activeItem === idx && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
                {item.summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
```

---

### 3.2 Component 2: `apps/web/src/app/page.tsx`

This server-rendered page overhauls the marketing landing page with:
1. High-impact Hero with requested badge (`"New: AI-curated audio briefs"`), punchy headline, CTAs (`"Get Started Free"` and `"Listen to Sample"`), and 4 `@repo/ui` `StatCard` KPI metrics.
2. Embedded `AudioDigestPreview` interactive card.
3. 6-card Feature Grid consuming `@repo/ui` `Card`, `CardHeader`, `CardTitle`, `CardDescription`, and Lucide icons (`Clock`, `Headphones`, `Sparkles`, `Shield`, `Zap`, `TrendingUp`).
4. Social Proof & Testimonials section with user quotes, company titles, and star ratings.
5. 6-item FAQ Grid using `@repo/ui` `Card`.
6. High-converting Final CTA Banner Card with reassurance badges.

```tsx
import { createApiClient } from "@repo/api-client";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from "@repo/ui";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Headphones,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AudioDigestPreview, type LatestBriefingData } from "../components/audio-digest-preview";

async function getLatestBriefing(): Promise<LatestBriefingData | null> {
  try {
    const client = createApiClient();
    const res = await client.digests.public.latest.$get();
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.digest) return null;

    return {
      title: data.digest.title || "Daily Engineering Digest",
      durationSec: data.digest.audioBrief?.durationSec || 192,
      items: (data.digest.items || []).slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        summary: item.summary,
        topics: item.topics,
      })),
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const briefing = await getLatestBriefing();

  return (
    <div className="flex flex-col items-center">
      {/* ================================================================= */}
      {/* 1. Hero Section                                                   */}
      {/* ================================================================= */}
      <section className="relative w-full overflow-hidden py-20 md:py-28 flex flex-col items-center text-center px-4 sm:px-6">
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          {/* Announcement Badge */}
          <Badge variant="success" className="mb-6 px-3.5 py-1 text-xs font-semibold gap-2 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>New: AI-curated audio briefs</span>
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            Synthesized Tech Briefings{" "}
            <span className="text-accent block sm:inline">Before Your First Sip.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Stop drowning in 50 browser tabs. Every morning at 7:00 AM, First Cup reads GitHub,
            Hacker News, arXiv, and 500+ engineering blogs to produce a 3-minute executive audio briefing
            tailored specifically to your tech stack.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="http://localhost:3001">
              <Button
                variant="primary"
                size="lg"
                className="gap-2 text-base px-8 h-12 shadow-md cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#preview">
              <Button variant="outline" size="lg" className="h-12 px-6 gap-2 cursor-pointer">
                <Headphones className="h-4 w-4 text-accent" />
                <span>Listen to Sample</span>
              </Button>
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Telegram & WhatsApp Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Studio Audio Quality
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Zero Sponsored Fluff
            </span>
          </div>

          {/* Social Proof KPI Cards (StatCards) */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl text-left">
            <StatCard
              title="Briefing Duration"
              value="3 Min"
              change="Time-capped"
              trend="neutral"
              subtitle="Zero fluff, pure signal"
              icon={<Clock className="h-4 w-4 text-accent" />}
            />
            <StatCard
              title="Sources Scanned"
              value="500+"
              change="+14 feeds"
              trend="positive"
              subtitle="GitHub, HN, blogs & arXiv"
              icon={<Sparkles className="h-4 w-4 text-accent" />}
            />
            <StatCard
              title="Active Leaders"
              value="12,000+"
              change="4.9/5 stars"
              trend="positive"
              subtitle="Staff & Principal engineers"
              icon={<TrendingUp className="h-4 w-4 text-accent" />}
            />
            <StatCard
              title="Signal Accuracy"
              value="99.4%"
              change="Cosine filtered"
              trend="positive"
              subtitle="Deduplicated vector clusters"
              icon={<Shield className="h-4 w-4 text-accent" />}
            />
          </div>
        </div>

        {/* Live Audio Briefing Card Preview */}
        <div id="preview" className="relative z-10 mt-16 w-full max-w-3xl mx-auto scroll-mt-24">
          <AudioDigestPreview briefing={briefing} />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. Feature Grid Section (6 Cards with Lucide Icons)               */}
      {/* ================================================================= */}
      <section
        id="features"
        className="w-full max-w-6xl mx-auto py-24 px-4 sm:px-6 border-t border-border/40"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Engineered for Velocity
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Everything Tech Leaders Need Before Standup
          </h2>
          <p className="mt-3 text-muted-foreground text-base">
            Engineered specifically for CTOs, Staff Engineers, and Engineering Directors who require
            high architectural signal with zero wasted time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <Clock className="h-5 w-5" />
              </div>
              <CardTitle>3-Minute Strict Timebox</CardTitle>
              <CardDescription>
                Briefings are mathematically constrained to 3 minutes. Perfect for your morning pour-over
                or commute without rabbit-hole fatigue.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <Headphones className="h-5 w-5" />
              </div>
              <CardTitle>Studio Audio Generation</CardTitle>
              <CardDescription>
                Ultra-natural neural voices specifically trained on technical pronunciation: from FP8 quantization
                and eBPF to distributed consensus algorithms.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle>Vector-Clustered Signal</CardTitle>
              <CardDescription>
                Cosine embedding clusters consolidate stories breaking simultaneously across GitHub, Hacker News,
                and blogs into a single concise brief.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <Shield className="h-5 w-5" />
              </div>
              <CardTitle>Source Credibility Filter</CardTitle>
              <CardDescription>
                Automated heuristics aggressively discard marketing fluff, paid PR announcements, and sponsored
                articles to preserve high technical fidelity.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <Zap className="h-5 w-5" />
              </div>
              <CardTitle>Instant Messenger Delivery</CardTitle>
              <CardDescription>
                Briefings arrive directly inside your Telegram, WhatsApp, or private RSS reader at 7:00 AM
                your local time before you open your laptop.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-accent/40 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-2 border border-accent/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle>Personalized Tech Graph</CardTitle>
              <CardDescription>
                Fine-tune topic weights to match your actual stack: Rust, Kubernetes, LLM inference, Postgres,
                or cloud security architectures.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. Social Proof & Testimonials Section                             */}
      {/* ================================================================= */}
      <section className="w-full max-w-6xl mx-auto py-20 px-4 sm:px-6 border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-4">
            Executive Endorsements
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Trusted by Leaders at Scale
          </h2>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm font-semibold text-foreground">
              4.9/5 from 12,000+ technology leaders
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col justify-between">
            <CardContent className="p-0">
              <div className="flex gap-1 mb-4 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;FirstCup completely replaced my 40 open browser tabs. I listen during my morning run
                and arrive at daily standup knowing every breaking architectural shift.&rdquo;
              </p>
            </CardContent>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm">
                SL
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Sarah Lin</h4>
                <p className="text-xs text-muted-foreground">VP of Engineering at ScaleCloud</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between">
            <CardContent className="p-0">
              <div className="flex gap-1 mb-4 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;The audio quality and pronunciation of technical terms like FP8 and eBPF are astonishingly
                accurate. It respects my time and intelligence.&rdquo;
              </p>
            </CardContent>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm">
                MV
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Marcus Vance</h4>
                <p className="text-xs text-muted-foreground">Principal Architect at DataMesh Labs</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between">
            <CardContent className="p-0">
              <div className="flex gap-1 mb-4 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;Having daily audio briefs delivered directly to our leadership Telegram channel has
                leveled up our team&apos;s architectural decision-making ten-fold.&rdquo;
              </p>
            </CardContent>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm">
                ER
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Elena Rostova</h4>
                <p className="text-xs text-muted-foreground">Head of Infrastructure at FinEdge</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. FAQ Grid Section                                               */}
      {/* ================================================================= */}
      <section className="w-full max-w-5xl mx-auto py-20 px-4 sm:px-6 border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-4">
            Got Questions?
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Everything you need to know about our daily AI tech intelligence pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              How are technical stories gathered and verified?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our automated crawlers index 500+ top engineering blogs, GitHub trending repositories, arXiv
              preprints, and Hacker News. Vector embeddings group related stories and strip out PR fluff,
              preserving only substantiated engineering developments.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              What messaging channels are supported?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can receive briefings via Telegram voice notes, WhatsApp messages, a private podcast RSS feed
              (compatible with Apple Podcasts and Overcast), or directly via our web console.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              Can I customize my tech stack and topics?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes. In your Console preferences, you can dynamically configure topic weights across AI/ML, Cloud
              Infrastructure, Distributed Systems, Web Performance, and Security.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              What time is the daily briefing delivered?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Briefings are synthesized fresh every morning and pushed to your chosen channels at 7:00 AM in your
              local timezone, perfectly timed for your morning routine.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              How does the 14-day free trial work?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You receive unrestricted access to all Pro features for 14 days without entering credit card
              information. You can upgrade, downgrade, or cancel at any time with a single click.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              Do you offer team and enterprise plans?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes! Our Team plan supports up to 5 seats with shared Slack/Discord channel integration. For larger
              enterprises, we offer custom private repo indexing and SSO.
            </p>
          </Card>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. Final Call-to-Action Banner Card                               */}
      {/* ================================================================= */}
      <section className="w-full max-w-5xl mx-auto py-20 px-4 sm:px-6">
        <Card className="relative overflow-hidden rounded-3xl border border-accent/30 bg-card p-10 md:p-16 text-center shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <Badge variant="success" className="mb-6">
              Start Your Morning Ritual
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Ready to Upgrade Your Morning Tech Signal?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Join 12,000+ engineers, founders, and architects receiving daily synthesized intelligence before their
              first sip of coffee.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="http://localhost:3001">
                <Button variant="primary" size="lg" className="h-12 px-8 text-base gap-2 cursor-pointer shadow-md">
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="h-12 px-6 cursor-pointer">
                  Explore Pricing
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Instant 2-minute setup
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Cancel anytime
              </span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
```

---

### 3.3 Component 3: `apps/web/src/app/pricing/page.tsx`

This client component provides:
1. Dynamic cadence toggle using `@repo/ui` `Switch` ("Monthly" vs "Annual (Save 20%)").
2. 3 structured pricing tier cards: Community ($0), Executive Pro ($9/mo or $7/mo annual), and Team Intelligence ($29/mo or $23/mo annual).
3. Prominent "Most Popular" badge and highlighted border on Pro tier.
4. Detailed feature checklists with `Check` and `Minus` icons.
5. Enterprise inquiry callout banner.
6. Pricing & Billing FAQ section.

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
  Switch,
} from "@repo/ui";
import { ArrowRight, Check, HelpCircle, Mail, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = React.useState(true);

  return (
    <div className="container mx-auto max-w-6xl py-20 px-4 sm:px-6">
      {/* ================================================================= */}
      {/* 1. Header & Billing Cadence Toggle                                */}
      {/* ================================================================= */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <Badge variant="outline" className="mb-4">
          Transparent Pricing
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Invest in High-Signal Tech Intelligence
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Start with a 14-day unrestricted Pro trial. Upgrade, downgrade, or cancel anytime with zero lock-in.
        </p>

        {/* Cadence Toggle */}
        <div className="mt-8 inline-flex items-center justify-center gap-3 p-1.5 rounded-full border border-border bg-card shadow-xs">
          <span
            className={`text-sm font-medium transition-colors cursor-pointer px-2 ${
              !isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label="Toggle annual billing cadence"
          />
          <span
            className={`text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer px-2 ${
              isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => setIsAnnual(true)}
          >
            <span>Annual</span>
            <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold">
              Save 20%
            </Badge>
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. Three Structured Pricing Tier Cards                            */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Tier 1: Community / Starter */}
        <Card className="flex flex-col justify-between p-8 border-border bg-card shadow-sm">
          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold">Community</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Essential weekly summaries for individual developers and hobbyists.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="text-muted-foreground text-xs font-medium">/ forever</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                What&apos;s Included
              </div>
              <ul className="space-y-3.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Weekly email intelligence newsletter</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Web dashboard archive access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>General technology topic feed</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Daily 3-minute studio audio briefing</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Telegram & WhatsApp delivery</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Custom stack filtering & weights</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Team seats & shared channels</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="outline" className="w-full h-11 cursor-pointer">
                Get Started Free
              </Button>
            </a>
          </CardFooter>
        </Card>

        {/* Tier 2: Executive Pro (Highlighted) */}
        <Card className="relative flex flex-col justify-between p-8 border-2 border-primary bg-card shadow-xl ring-1 ring-primary/20 lg:-translate-y-2">
          <Badge
            variant="success"
            className="absolute -top-3.5 right-6 px-3 py-1 font-semibold shadow-sm gap-1"
          >
            <Sparkles className="h-3 w-3" />
            <span>Most Popular</span>
          </Badge>

          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Executive Pro</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Daily personalized voice & text briefings tailored to your specific stack.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  ${isAnnual ? "7" : "9"}
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  / month {isAnnual && "(billed $84/yr)"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
                Everything in Community, plus
              </div>
              <ul className="space-y-3.5 text-sm text-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Daily 3-minute studio audio briefing (7:00 AM)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Direct delivery via Telegram, WhatsApp, & RSS</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Custom stack weighting (AI, Systems, Rust, Cloud)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Vector-clustered semantic deduplication</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Interactive feedback & adaptive topic tuning</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Full intelligence search across historical archive</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Multi-user team seats & shared channels</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="primary" className="w-full h-11 cursor-pointer shadow-md">
                Start 14-Day Free Trial
              </Button>
            </a>
          </CardFooter>
        </Card>

        {/* Tier 3: Team Intelligence */}
        <Card className="flex flex-col justify-between p-8 border-border bg-card shadow-sm">
          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold">Team Intelligence</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                For engineering squads and tech leadership seeking shared intelligence.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  ${isAnnual ? "23" : "29"}
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  / month {isAnnual && "(billed $276/yr)"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Everything in Pro, plus
              </div>
              <ul className="space-y-3.5 text-sm text-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>5 team member accounts included</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Shared team Slack & Discord channel delivery</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Role presets: SRE, ML Platform, Frontend, Core</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Centralized team billing & seat administration</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Priority source indexing & custom feed requests</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Dedicated onboarding & private support channel</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="outline" className="w-full h-11 cursor-pointer">
                Start Team Trial
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* 3. Enterprise Inquiry Callout Banner                              */}
      {/* ================================================================= */}
      <div className="mt-16">
        <Card className="p-8 sm:p-10 border-border bg-muted/20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <Badge variant="outline" className="mb-1">
                Enterprise & Custom Scale
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">
                Need Custom Deployments or 20+ Seats?
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                We support enterprise requirements including internal repository and Confluence ingestion,
                custom fine-tuned neural voices, SSO/SAML 2.0 authentication, dedicated SLAs, and procurement invoicing.
              </p>
            </div>
            <Link href="/contact" className="shrink-0">
              <Button variant="secondary" size="lg" className="gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                <span>Contact Enterprise Sales</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* 4. Pricing & Billing FAQ Section                                  */}
      {/* ================================================================= */}
      <div className="mt-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">
            <HelpCircle className="h-3 w-3 mr-1" />
            Pricing FAQ
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions About Billing
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear, transparent answers with zero fine print.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              Can I switch between monthly and annual billing?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes, you can toggle between monthly and annual billing anytime in your console billing settings.
              Upgrades apply immediately with prorated billing, and annual plans lock in a 20% discount.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              How does the 14-day free trial work?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You receive unrestricted access to all Pro or Team capabilities for 14 days without entering credit card
              details. You can cancel with a single click at any time.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              What payment methods do you accept?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We accept all major credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and bank transfers for
              annual and enterprise invoices.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              Can we add additional seats to the Team plan?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes, additional seats can be added directly from your console settings for $5/seat/month, or you can
              inquire about an Enterprise organization agreement.
            </p>
          </Card>

          <Card className="p-6 md:col-span-2">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              What is your cancellation and refund policy?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can cancel your subscription at any time with a single click. Your access will remain active until the
              end of your paid billing cycle. We also offer a 30-day money-back guarantee if you are not satisfied.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Verification & Testing Matrix

To independently verify the implementation, the Worker and subsequent Verification agents should execute:

1. **Static Analysis & Typecheck**:
   ```bash
   bun --filter=@repo/web typecheck
   ```
   *Expected outcome*: Zero errors. Validates all `@repo/ui` imports (`Badge`, `Button`, `Card`, `StatCard`, `Switch`, etc.) and Lucide icons.

2. **Biome Lint & Stylecheck**:
   ```bash
   bun run check
   ```
   *Expected outcome*: Zero formatting or syntax errors.

3. **E2E Test Verification**:
   ```bash
   bun test tests/e2e/tier4-real-world.test.ts
   bun test tests/e2e/tier1-feature-coverage.test.ts
   ```
   *Expected outcome*: All tests pass (including route existence, "Pricing", "Briefing", and "Executive" string assertions).

4. **Visual Inspection**:
   - Verify zero hardcoded hex codes.
   - Verify responsive behavior across mobile, tablet, and desktop viewports.
   - Verify light and dark mode contrast using `ThemeToggle`.
