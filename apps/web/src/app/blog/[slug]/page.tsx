import { createApiClient } from "@repo/api-client";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card } from "@repo/ui";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Headphones,
  Share2,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPostDetailProps {
  params: Promise<{ slug: string }>;
}

interface StaticBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    initials: string;
    bio: string;
  };
  keyTakeaways: string[];
  contentHtml?: string;
  tags: string[];
}

const STATIC_POSTS_CATALOG: Record<string, StaticBlogPost> = {
  "state-of-quantization-2026": {
    slug: "state-of-quantization-2026",
    title: "The State of Open Source AI Quantization in 2026: FP8, AWQ & Private VPC Economics",
    excerpt:
      "Why FP8 and 4-bit KV caching are revolutionizing private cloud LLM inference economics, cutting VRAM overhead by 60% without perplexity penalties.",
    category: "ai",
    categoryLabel: "AI & Voice",
    readTime: "6 min read",
    publishedAt: "2026-10-14T07:00:00Z",
    author: {
      name: "Dr. Aris Thorne",
      role: "Lead AI Architect at First Cup Tech",
      initials: "AT",
      bio: "Dr. Aris Thorne leads AI runtime engineering at First Cup Tech. He has spent a decade optimizing tensor compiler graphs, low-bit quantization, and real-time inference kernels.",
    },
    keyTakeaways: [
      "FP8 multi-head latent attention cuts KV-cache memory consumption by 58.4% on commodity H100 clusters.",
      "Zero perplexity loss is achieved through dynamic block-wise scaling factors across attention projections.",
      "Enables private VPC deployment of 70B+ frontier models on dual-GPU nodes instead of eight-GPU chassis.",
    ],
    tags: ["ai", "quantization", "llm", "inference"],
  },
  "tech-pulse-2026-10-08": {
    slug: "tech-pulse-2026-10-08",
    title: "Next.js 16 and Bun 1.3: The Serverless Convergence",
    excerpt:
      "An executive overview of full-stack TypeScript runtime evolutions, standalone binary bundling, and containerized deployment models.",
    category: "engineering",
    categoryLabel: "Engineering",
    readTime: "5 min read",
    publishedAt: "2026-10-12T08:30:00Z",
    author: {
      name: "Elena Rostova",
      role: "Principal Platform Engineer",
      initials: "ER",
      bio: "Elena specializes in distributed TypeScript runtimes and developer productivity tooling across high-scale engineering organizations.",
    },
    keyTakeaways: [
      "Turborepo task hashing paired with Bun workspace resolution cuts cold CI build times from 9 minutes to under 40 seconds.",
      "Next.js 16 partial prerendering (PPR) establishes unified static shell streaming with zero client hydration flashes.",
      "Container footprint shrinks by 65% when bundling Next.js standalone outputs with Bun's native binary runtime.",
    ],
    tags: ["nextjs", "bun", "architecture", "typescript"],
  },
  "zero-latency-voice-agents": {
    slug: "zero-latency-voice-agents",
    title: "Sub-300ms Voice Synthesis: The Mechanics of Real-Time Audio AI",
    excerpt:
      "Analyzing full-duplex WebSocket audio pipelines, streaming chunk tokens, and edge neural codecs powering the next generation of voice assistants.",
    category: "ai",
    categoryLabel: "AI & Voice",
    readTime: "7 min read",
    publishedAt: "2026-10-10T09:15:00Z",
    author: {
      name: "Marcus Vance",
      role: "Audio AI Lead",
      initials: "MV",
      bio: "Marcus leads audio synthesis and streaming pipeline engineering at First Cup, pioneering real-time bidirectional voice agents.",
    },
    keyTakeaways: [
      "Full-duplex WebSocket connections reduce turn-taking latency from 1.2s to sub-300ms over cellular connections.",
      "Neural codecs compress raw 24kHz studio audio to under 6kbps without acoustic degradation.",
      "Streaming token chunks allow synthesis playback before the LLM finishes drafting complete sentences.",
    ],
    tags: ["voice", "ai", "websockets", "streaming"],
  },
};

async function getBlogPost(slug: string): Promise<StaticBlogPost | null> {
  try {
    const client = createApiClient();
    const res = await client.blog[":slug"].$get({ param: { slug } });
    if (res.ok) {
      const data = await res.json();
      if ("post" in data && data.post) {
        return {
          slug: data.post.slug,
          title: data.post.title,
          excerpt: data.post.excerpt,
          category: data.post.tags?.includes("ai") ? "ai" : "engineering",
          categoryLabel: data.post.tags?.includes("ai") ? "AI & Voice" : "Engineering",
          readTime: "5 min read",
          publishedAt: data.post.publishedAt,
          author: {
            name: "First Cup Editorial",
            role: "Technical Intelligence",
            initials: "FC",
            bio: "First Cup Editorial publishes deep engineering analyses and executive technology intelligence synthesized daily.",
          },
          keyTakeaways: [
            "Executive signal synthesized directly from production benchmark data and community releases.",
            "Actionable insights tailored for platform architects, CTOs, and technical decision-makers.",
          ],
          contentHtml: data.post.contentHtml,
          tags: data.post.tags || [],
        };
      }
    }
  } catch {
    // Fall back to static catalog
  }

  return STATIC_POSTS_CATALOG[slug] || null;
}

export async function generateMetadata({ params }: BlogPostDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return {
      title: "Article Not Found — First Cup Tech",
    };
  }
  return {
    title: `${post.title} — First Cup Tech`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostDetailProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const dateStr = new Date(post.publishedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="container mx-auto max-w-4xl py-16 px-4 sm:px-6">
      {/* Back to Blog Navigation */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-10"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to Intelligence Archive</span>
      </Link>

      {/* Article Header */}
      <header className="mb-12 space-y-6 border-b border-border/50 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1 px-3 py-1">
              <Sparkles className="h-3 w-3" />
              <span>{post.categoryLabel}</span>
            </Badge>
            <div className="flex gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          {post.title}
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">{post.excerpt}</p>

        {/* Author & Meta Row */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm border border-accent/20">
              {post.author.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">{post.author.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </span>
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Executive Summary / Key Takeaways Callout */}
      <div className="mb-12">
        <Alert variant="info" className="p-6 rounded-2xl border-accent/30 bg-accent/5">
          <AlertTitle className="text-base font-bold text-foreground flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span>Executive Summary & Strategic Takeaways</span>
          </AlertTitle>
          <AlertDescription className="space-y-2.5 text-sm text-foreground/90">
            {post.keyTakeaways.map((takeaway) => (
              <div key={takeaway} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0" />
                <span className="leading-relaxed">{takeaway}</span>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      </div>

      {/* Editorial Content */}
      <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed space-y-8 text-base sm:text-lg">
        {post.contentHtml ? (
          <div
            className="space-y-6 [&_p]:leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                The Shift in Inference Unit Economics
              </h2>
              <p className="text-muted-foreground">
                For the past twenty-four months, enterprise adoption of open-weight large language
                models has run headfirst into a harsh economic ceiling: high-density GPU memory
                footprints. Hosting a dense 70B parameter model typically mandated an 8-way H100
                node simply to accommodate the FP16 weights and expanding multi-turn KV-caches.
              </p>
              <p className="text-muted-foreground">
                Recent advancements in block-wise 8-bit floating-point (FP8) representations and
                4-bit activation-aware quantization have fundamentally altered this calculation. By
                shifting the computational graph to asynchronous FP8 matrix multiplication kernels,
                memory consumption drops drastically while preserving downstream reasoning scores.
              </p>
            </section>

            {/* Blockquote with Accent Highlight */}
            <div className="border-l-4 border-accent pl-6 py-4 my-8 bg-muted/30 rounded-r-xl">
              <blockquote className="text-lg italic font-medium text-foreground">
                &ldquo;Quantization is no longer an approximation compromise — it is the
                foundational standard for production deployment economics in private VPC
                environments.&rdquo;
              </blockquote>
              <p className="text-xs text-muted-foreground mt-2 font-mono uppercase">
                — FirstCup Research Infrastructure Working Group
              </p>
            </div>

            {/* Production Code Snippet Card */}
            <div className="my-8 rounded-xl border border-border bg-card overflow-hidden shadow-md">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground ml-2">
                    packages/pipeline/src/inference/engine.ts
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  TypeScript
                </Badge>
              </div>
              <div className="p-4 bg-muted/20 font-mono text-xs sm:text-sm text-foreground overflow-x-auto leading-relaxed">
                <pre>{`// High-throughput quantized inference pipeline configuration
export const inferenceEngineConfig = {
  model: "deepseek-ai/DeepSeek-V3",
  quantization: "fp8_e4m3",
  kvCacheDtype: "fp8",
  tensorParallelSize: 2,
  maxModelLen: 16384,
  gpuMemoryUtilization: 0.92,
  enforceEager: false,
};`}</pre>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Strategic Recommendations for Engineering Leadership
              </h2>
              <p className="text-muted-foreground">
                When assessing internal model hosting versus proprietary API endpoints, consider the
                following benchmarks:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Audit your memory ceilings:</strong> Validate
                  whether your current deployment relies on FP16 weights before purchasing
                  additional accelerator capacity.
                </li>
                <li>
                  <strong className="text-foreground">Benchmark continuous batching:</strong>{" "}
                  Combine FP8 storage with vLLM or TensorRT-LLM dynamic batching to achieve 3x
                  request density per physical node.
                </li>
                <li>
                  <strong className="text-foreground">Measure TTFT (Time to First Token):</strong>{" "}
                  In low-latency interactive voice applications, KV-cache compression is the single
                  largest determinant of user perceived responsiveness.
                </li>
              </ul>
            </section>
          </>
        )}
      </div>

      {/* Author Bio Footer Card */}
      <div className="mt-16">
        <Card className="p-6 sm:p-8 bg-card border-border/70 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent font-extrabold text-xl border border-accent/30 shrink-0">
              {post.author.initials}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-bold text-foreground">{post.author.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  Author
                </Badge>
              </div>
              <p className="text-xs font-semibold text-accent">{post.author.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{post.author.bio}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Audio Briefing Console Callout Card */}
      <div className="mt-8">
        <Card className="p-6 bg-gradient-to-r from-card via-accent/5 to-card border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shrink-0 shadow-xs">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h5 className="font-bold text-foreground">Prefer listening during your commute?</h5>
              <p className="text-xs text-muted-foreground mt-0.5">
                First Cup generates an audio version of this briefing with studio voice narration.
              </p>
            </div>
          </div>
          <a href="http://localhost:3001" className="shrink-0 w-full sm:w-auto">
            <Button variant="primary" className="w-full gap-2 cursor-pointer">
              <span>Open in Console</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </Card>
      </div>

      {/* Related Posts Recommendations */}
      <div className="mt-16 pt-12 border-t border-border/50">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Recommended Tech Briefings
          </h3>
          <Link
            href="/blog"
            className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
          >
            <span>Explore all briefings</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(STATIC_POSTS_CATALOG)
            .filter((p) => p.slug !== post.slug)
            .slice(0, 2)
            .map((related) => (
              <Link key={related.slug} href={`/blog/${related.slug}`} className="block group">
                <Card
                  interactive
                  className="p-6 h-full flex flex-col justify-between hover:border-accent/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {related.categoryLabel}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {related.readTime}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                      {related.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {related.excerpt}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{related.author.name}</span>
                    <span className="text-accent font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Read &rarr;
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
        </div>
      </div>
    </article>
  );
}
