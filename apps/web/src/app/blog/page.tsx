import { createApiClient } from "@repo/api-client";
import type { Metadata } from "next";
import { BlogIndexClient, type BlogPostItem, FALLBACK_BLOG_POSTS } from "./blog-index-client";

export const metadata: Metadata = {
  title: "Intelligence & Architecture Briefings — First Cup Tech",
  description:
    "Curated technology briefings, architecture deep-dives, and AI engineering analysis synthesized for tech leaders.",
};

async function getBlogPosts(): Promise<BlogPostItem[]> {
  try {
    const client = createApiClient();
    const res = await client.blog.posts.$get({ query: { limit: 20 } });
    if (!res.ok) return FALLBACK_BLOG_POSTS;
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) return FALLBACK_BLOG_POSTS;

    return data.posts.map((p, idx) => {
      const category: "ai" | "engineering" | "product" | "productivity" =
        p.tags?.includes("ai") || p.tags?.includes("voice")
          ? "ai"
          : p.tags?.includes("productivity")
            ? "productivity"
            : p.tags?.includes("product")
              ? "product"
              : "engineering";

      const categoryLabel =
        category === "ai"
          ? "AI & Voice"
          : category === "engineering"
            ? "Engineering"
            : category === "productivity"
              ? "Productivity"
              : "Product";

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category,
        categoryLabel,
        readTime: "5 min read",
        authorName: "First Cup Editorial",
        authorRole: "Technical Intelligence",
        authorInitials: "FC",
        publishedAt: p.publishedAt,
        tags: p.tags || [],
        isFeatured: idx === 0,
      };
    });
  } catch {
    return FALLBACK_BLOG_POSTS;
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <BlogIndexClient initialPosts={posts} />;
}
