import { Badge, Button, Card } from "@repo/ui";
import { ArrowRight, Bot, CheckCircle2, Headphones, Play, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden py-24 md:py-32 flex flex-col items-center text-center px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <Badge variant="success" className="mb-6 px-3.5 py-1 text-xs font-semibold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous Daily Tech Intelligence</span>
          </Badge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Synthesized Tech Briefings{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Before Your First Sip.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Stop drowning in 50 browser tabs. Every morning at 7:00 AM, First Cup reads GitHub,
            Hacker News, and engineering blogs to produce a 3-minute executive audio briefing
            tailored specifically to your stack.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="http://localhost:3001">
              <Button
                variant="primary"
                size="lg"
                className="gap-2 text-base px-8 h-12 shadow-lg shadow-emerald-500/20"
              >
                <span>Start 14-Day Pro Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="h-12 px-6">
                View Pricing
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Telegram & WhatsApp Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ElevenLabs Studio Voice
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero fluff
            </span>
          </div>
        </div>

        {/* Live Audio Briefing Card Preview */}
        <div className="relative z-10 mt-16 w-full max-w-3xl mx-auto">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 text-left">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Today&apos;s Engineering Digest</h4>
                  <p className="text-xs text-muted-foreground">
                    Generated at 07:00 AM UTC • 3m 12s
                  </p>
                </div>
              </div>
              <Badge variant="success">Ready</Badge>
            </div>

            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/30">
              <button
                type="button"
                aria-label="Play sample briefing audio"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <Play className="h-5 w-5 ml-0.5" />
              </button>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/3 rounded-full" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1:04</span>
                  <span>3:12</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="p-3 rounded-lg border border-border/30 bg-muted/20">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
                  <span>#1 • AI / LLM INFERENCE</span>
                  <span className="text-muted-foreground">hacker news</span>
                </div>
                <p className="text-sm font-medium">
                  DeepSeek-V3 architecture analysis: FP8 quantization and multi-head latent
                  attention
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border/30 bg-muted/20">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
                  <span>#2 • DISTRIBUTED SYSTEMS</span>
                  <span className="text-muted-foreground">github</span>
                </div>
                <p className="text-sm font-medium">
                  Valkey 8.0 benchmarks demonstrate 3x throughput improvement over legacy cache
                  engines
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section
        id="features"
        className="w-full max-w-6xl mx-auto py-24 px-4 sm:px-6 border-t border-border/40"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Engineered for Velocity
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything a Tech Leader Needs in Minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Automated Multi-Source Crawler</h3>
            <p className="text-sm text-muted-foreground">
              Ingests from GitHub trending, Hacker News top stories, Substack newsletters, and major
              tech papers automatically.
            </p>
          </Card>

          <Card className="p-6">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Vector-Clustered Signal</h3>
            <p className="text-sm text-muted-foreground">
              Duplicate stories across sources are unified through semantic cosine embeddings,
              eliminating repetitive headlines.
            </p>
          </Card>

          <Card className="p-6">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Direct Messaging Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Receive your morning voice notes and bullet points directly in Telegram or WhatsApp
              before you even open your laptop.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
