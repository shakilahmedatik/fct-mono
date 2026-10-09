import { createApiClient } from "@repo/api-client";
import { Badge, Card } from "@repo/ui";
import Link from "next/link";

interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
}

async function getBlogPosts(): Promise<BlogPostItem[]> {
  try {
    const client = createApiClient();
    const res = await client.blog.posts.$get({ query: { limit: 10 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.posts || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      publishedAt: p.publishedAt,
      tags: p.tags || [],
    }));
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  const displayPosts = posts.length
    ? posts
    : [
        {
          id: "1",
          slug: "tech-pulse-2026-10-08",
          title: "Next.js 16 and Bun 1.3: The Serverless Convergence",
          excerpt:
            "An executive overview of full-stack TypeScript runtime evolutions and containerized deployment models.",
          publishedAt: new Date().toISOString(),
          tags: ["nextjs", "bun", "architecture"],
        },
        {
          id: "2",
          slug: "state-of-quantization-2026",
          title: "The State of Open Source AI Quantization",
          excerpt:
            "Why FP8 and 4-bit KV caching are revolutionizing private cloud LLM inference economics.",
          publishedAt: new Date().toISOString(),
          tags: ["ai", "llm", "quantization"],
        },
      ];

  return (
    <div className="container mx-auto max-w-4xl py-20 px-4 sm:px-6">
      <div className="mb-12">
        <Badge variant="outline" className="mb-4">
          Intelligence Archive
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Curated Technology Briefings
        </h1>
        <p className="text-muted-foreground">
          Historical briefings and deep-dives synthesized across the engineering ecosystem.
        </p>
      </div>

      <div className="space-y-6">
        {displayPosts.map((post) => {
          const dateStr = new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          return (
            <Link key={post.id} href={`/blog/${post.slug}`} className="block">
              <Card className="p-6 hover:border-accent/40 transition-colors cursor-pointer">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{dateStr}</span>
                  <div className="flex gap-1.5">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2 text-foreground hover:text-accent transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
