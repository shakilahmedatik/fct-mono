"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Headphones,
  Mail,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { subscribeToNewsletter } from "../../lib/newsletter";

export interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "ai" | "engineering" | "product" | "productivity";
  categoryLabel: string;
  readTime: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  publishedAt: string;
  tags: string[];
  isFeatured?: boolean;
}

interface BlogIndexClientProps {
  initialPosts?: BlogPostItem[];
  /**
   * Set when the server could not reach the API. The page renders an explicit
   * error state instead of substituting fabricated articles.
   */
  initialError?: string;
}

export function BlogIndexClient({ initialPosts = [], initialError }: BlogIndexClientProps) {
  const posts = initialPosts;
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = React.useState("");
  const [newsletterStatus, setNewsletterStatus] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [newsletterError, setNewsletterError] = React.useState("");

  const featuredPost = posts.find((p) => p.isFeatured) || posts[0];

  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      const matchesTab = activeTab === "all" || post.category === activeTab;
      const matchesQuery =
        searchQuery.trim() === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesQuery;
    });
  }, [posts, activeTab, searchQuery]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError("");
    setNewsletterStatus("submitting");
    const result = await subscribeToNewsletter(newsletterEmail);
    if (result.ok) {
      setNewsletterStatus("success");
      setNewsletterEmail("");
      return;
    }
    setNewsletterStatus("error");
    setNewsletterError(result.message);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ai":
        return <Sparkles className="h-4 w-4" />;
      case "engineering":
        return <Cpu className="h-4 w-4" />;
      case "productivity":
        return <Zap className="h-4 w-4" />;
      case "product":
        return <Compass className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-16 px-4 sm:px-6">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="outline" className="mb-4 px-3 py-1 text-xs gap-1.5">
          <Headphones className="h-3.5 w-3.5 text-accent" />
          <span>Executive Intelligence Archive</span>
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Curated Technology & Architecture Briefings
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          In-depth technical analyses, AI system architectures, and engineering deep-dives
          synthesized for technology leaders.
        </p>
      </div>

      {/* Load failure — never substituted with fabricated articles. */}
      {initialError && (
        <Alert variant="destructive" className="mb-16" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Briefings Unavailable</AlertTitle>
          <AlertDescription>
            {initialError} Please reload the page or try again shortly — no cached articles are
            shown in the meantime.
          </AlertDescription>
        </Alert>
      )}

      {/* Featured Article Hero Card */}
      {featuredPost && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Featured Intelligence
            </span>
            <Badge variant="success">Latest Release</Badge>
          </div>

          <Card className="overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-accent/5 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="success" className="gap-1">
                    {getCategoryIcon(featuredPost.category)}
                    <span>{featuredPost.categoryLabel}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {featuredPost.readTime}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(featuredPost.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <Link href={`/blog/${featuredPost.slug}`} className="block group">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-accent transition-colors leading-tight">
                    {featuredPost.title}
                  </h2>
                </Link>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                {/* Author Info & CTA */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm border border-accent/20">
                      {featuredPost.authorInitials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {featuredPost.authorName}
                      </p>
                      <p className="text-xs text-muted-foreground">{featuredPost.authorRole}</p>
                    </div>
                  </div>

                  <Link href={`/blog/${featuredPost.slug}`}>
                    <Button variant="primary" className="gap-2 shadow-xs cursor-pointer">
                      <span>Read Briefing</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Graphical Hero Preview Card */}
              <div className="lg:col-span-5 bg-muted/40 rounded-2xl p-6 border border-border/60 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground uppercase">
                      Architecture Metric
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Verified Benchmark
                    </Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/40 shadow-xs">
                    <div className="text-xs text-muted-foreground">Inference Throughput</div>
                    <div className="text-3xl font-extrabold text-accent mt-1">+310%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      FP8 Multi-Head Latent Attention
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/40 shadow-xs">
                    <div className="text-xs text-muted-foreground">Host VRAM Footprint</div>
                    <div className="text-3xl font-extrabold text-foreground mt-1">-58.4%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Commodity H100 GPU Cluster
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Private Cloud Ready
                  </span>
                  <span>FirstCup Research</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="mb-10 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="ai">AI & Voice</TabsTrigger>
              <TabsTrigger value="engineering">Engineering</TabsTrigger>
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="productivity">Productivity</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full md:w-72">
            <Input
              placeholder="Search briefings or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      {/* Article Card Grid */}
      {filteredPosts.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-border p-8">
          <p className="text-muted-foreground text-sm">
            No briefings found matching your filter criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setActiveTab("all");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const dateStr = new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block h-full group">
                <Card
                  interactive
                  className="flex flex-col justify-between h-full hover:border-accent/50 transition-all duration-200 overflow-hidden"
                >
                  <CardHeader className="p-6 pb-4 space-y-3">
                    {/* Thumbnail Accent Header */}
                    <div className="h-32 rounded-xl bg-gradient-to-tr from-muted/60 via-card to-accent/10 border border-border/40 p-4 flex flex-col justify-between relative overflow-hidden group-hover:border-accent/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[11px] font-semibold gap-1">
                          {getCategoryIcon(post.category)}
                          <span>{post.categoryLabel}</span>
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-background/80 px-2 py-0.5 rounded-md font-mono text-muted-foreground border border-border/40"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <CardTitle className="text-lg font-bold leading-snug group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="p-6 pt-0 border-t border-border/40 mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-[11px]">
                        {post.authorInitials}
                      </div>
                      <span className="font-medium text-foreground">{post.authorName}</span>
                    </div>
                    <span>{dateStr}</span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Newsletter Subscription Callout Banner */}
      <div className="mt-24">
        <Card className="relative overflow-hidden border border-accent/30 bg-gradient-to-r from-card via-accent/5 to-card p-8 sm:p-12 shadow-xl">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <Mail className="h-3.5 w-3.5" />
              <span>Daily Executive Dispatch</span>
            </Badge>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Never Miss a Breakthrough Architecture Shift
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Join 12,000+ engineering leaders receiving our 3-minute morning audio briefing and
              concise technical synthesis directly in Telegram, WhatsApp, or inbox.
            </p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-center max-w-md mx-auto"
            >
              <div className="w-full">
                <Input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                  required
                  aria-label="Email address for the newsletter"
                  aria-invalid={newsletterStatus === "error" ? "true" : undefined}
                  aria-describedby={
                    newsletterStatus === "error" ? "blog-newsletter-error" : undefined
                  }
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto whitespace-nowrap shadow-xs cursor-pointer"
                isLoading={newsletterStatus === "submitting"}
              >
                Subscribe Free
              </Button>
            </form>

            {newsletterStatus === "success" && (
              <Alert variant="success" className="mt-4 text-left">
                <AlertTitle>Subscription Confirmed</AlertTitle>
                <AlertDescription>
                  Welcome aboard! Your first synthesized technology digest arrives tomorrow morning
                  at 07:00 UTC.
                </AlertDescription>
              </Alert>
            )}

            {newsletterStatus === "error" && (
              <Alert variant="destructive" className="mt-4 text-left" role="alert">
                <AlertTitle>Subscription Failed</AlertTitle>
                <AlertDescription>
                  <span id="blog-newsletter-error">
                    {newsletterError || "Please enter a valid business email address."}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Zero spam. Instant one-click unsubscribe anytime. Free weekly edition included.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
