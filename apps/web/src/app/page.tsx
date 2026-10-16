import { createApiClient } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@repo/ui";
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
          <Badge
            variant="success"
            className="mb-6 px-3.5 py-1 text-xs font-semibold gap-2 shadow-xs"
          >
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
            Hacker News, arXiv, and 500+ engineering blogs to produce a 3-minute executive audio
            briefing tailored specifically to your tech stack.
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
                Briefings are mathematically constrained to 3 minutes. Perfect for your morning
                pour-over or commute without rabbit-hole fatigue.
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
                Ultra-natural neural voices specifically trained on technical pronunciation: from
                FP8 quantization and eBPF to distributed consensus algorithms.
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
                Cosine embedding clusters consolidate stories breaking simultaneously across GitHub,
                Hacker News, and blogs into a single concise brief.
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
                Automated heuristics aggressively discard marketing fluff, paid PR announcements,
                and sponsored articles to preserve high technical fidelity.
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
                Briefings arrive directly inside your Telegram, WhatsApp, or private RSS reader at
                7:00 AM your local time before you open your laptop.
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
                Fine-tune topic weights to match your actual stack: Rust, Kubernetes, LLM inference,
                Postgres, or cloud security architectures.
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
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={`hero-star-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
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
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={`t1-star-${i}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;FirstCup completely replaced my 40 open browser tabs. I listen during my
                morning run and arrive at daily standup knowing every breaking architectural
                shift.&rdquo;
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
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={`t2-star-${i}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;The audio quality and pronunciation of technical terms like FP8 and eBPF are
                astonishingly accurate. It respects my time and intelligence.&rdquo;
              </p>
            </CardContent>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm">
                MV
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Marcus Vance</h4>
                <p className="text-xs text-muted-foreground">
                  Principal Architect at DataMesh Labs
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between">
            <CardContent className="p-0">
              <div className="flex gap-1 mb-4 text-amber-400">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={`t3-star-${i}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;Having daily audio briefs delivered directly to our leadership Telegram
                channel has leveled up our team&apos;s architectural decision-making
                ten-fold.&rdquo;
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
              Our automated crawlers index 500+ top engineering blogs, GitHub trending repositories,
              arXiv preprints, and Hacker News. Vector embeddings group related stories and strip
              out PR fluff, preserving only substantiated engineering developments.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              What messaging channels are supported?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can receive briefings via Telegram voice notes, WhatsApp messages, a private
              podcast RSS feed (compatible with Apple Podcasts and Overcast), or directly via our
              web console.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              Can I customize my tech stack and topics?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes. In your Console preferences, you can dynamically configure topic weights across
              AI/ML, Cloud Infrastructure, Distributed Systems, Web Performance, and Security.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              What time is the daily briefing delivered?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Briefings are synthesized fresh every morning and pushed to your chosen channels at
              7:00 AM in your local timezone, perfectly timed for your morning routine.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              How does the 14-day free trial work?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You receive unrestricted access to all Pro features for 14 days without entering
              credit card information. You can upgrade, downgrade, or cancel at any time with a
              single click.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-base text-foreground mb-2">
              Do you offer team and enterprise plans?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes! Our Team plan supports up to 5 seats with shared Slack/Discord channel
              integration. For larger enterprises, we offer custom private repo indexing and SSO.
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
              Join 12,000+ engineers, founders, and architects receiving daily synthesized
              intelligence before their first sip of coffee.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="http://localhost:3001">
                <Button
                  variant="primary"
                  size="lg"
                  className="h-12 px-8 text-base gap-2 cursor-pointer shadow-md"
                >
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
