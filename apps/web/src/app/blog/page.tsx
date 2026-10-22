import { createApiClient } from "@repo/api-client";
import type { Metadata } from "next";
import { BlogIndexClient, type BlogPostItem } from "./blog-index-client";

export const metadata: Metadata = {
  title: "Intelligence & Architecture Briefings — First Cup Tech",
  description:
    "Curated technology briefings, architecture deep-dives, and AI engineering analysis synthesized for tech leaders.",
};

type BlogPostsResult = { posts: BlogPostItem[]; error?: string };

async function getBlogPosts(): Promise<BlogPostsResult> {
  try {
    const client = createApiClient();
    const res = await client.blog.posts.$get({ query: { limit: 20 } });
    if (!res.ok) {
      return { posts: [], error: `The briefing archive is unavailable (HTTP ${res.status}).` };
    }
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) {
      return { posts: [], error: undefined };
    }

    const posts = data.posts.map((p, idx) => {
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
    return { posts };
  } catch {
    return { posts: [], error: "The briefing archive could not be loaded." };
  }
}

export default async function BlogPage() {
  const { posts, error } = await getBlogPosts();
  return <BlogIndexClient initialPosts={posts} initialError={error} />;
}
