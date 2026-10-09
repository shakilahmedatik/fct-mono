import { createApiClient } from "@repo/api-client";
import { Badge, Button } from "@repo/ui";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPostDetailProps {
  params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string) {
  try {
    const client = createApiClient();
    const res = await client.blog[":slug"].$get({ param: { slug } });
    if (!res.ok) return null;
    const data = await res.json();
    if ("post" in data) {
      return data.post;
    }
    return null;
  } catch {
    return null;
  }
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

  const tags: string[] = post.tags || [];

  return (
    <article className="container mx-auto max-w-3xl py-16 px-4 sm:px-6">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Intelligence Archive</span>
      </Link>

      <header className="mb-10 space-y-4 border-b border-border/40 pb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </span>
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            <div className="flex gap-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[11px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.2]">
          {post.title}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
      </header>

      {/* Editorial Content */}
      <div
        className="max-w-none text-foreground leading-relaxed space-y-4"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mt-16 pt-8 border-t border-border/40 flex items-center justify-between">
        <Link href="/blog">
          <Button variant="outline" size="sm">
            &larr; More Briefings
          </Button>
        </Link>
        <a href="http://localhost:3001">
          <Button variant="primary" size="sm">
            Get Daily Audio on Console &rarr;
          </Button>
        </a>
      </div>
    </article>
  );
}
