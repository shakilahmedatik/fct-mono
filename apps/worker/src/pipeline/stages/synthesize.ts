import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { workerLogger } from "../../lib/logger";
import type { RankedStory } from "../types";

export function formatBlogDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function generateDailyAudioScript(
  stories: RankedStory[],
  date = new Date(),
): {
  script: string;
  durationSec: number;
} {
  const formattedDate = formatBlogDate(date);
  const intro = `Good morning. Here is your First Cup Tech audio briefing for ${formattedDate}.`;
  const outro = "That concludes your briefing. Have an exceptional and focused build day.";

  const storyLines: string[] = [];

  for (let i = 0; i < stories.length; i++) {
    const item = stories[i];
    const lead =
      i === 0 ? "Leading today's tech developments" : i === 1 ? "Next up" : "Also in tech";
    const src = item.story.dominantSource.toUpperCase();
    const cleanTitle = item.story.canonicalTitle.replace(/[.!?]+$/, "");
    const topSignal = item.story.signals[0];
    const summary = topSignal?.summary ? `${topSignal.summary.replace(/[.!?]+$/, "")}.` : "";

    storyLines.push(
      `${lead}, reported via ${src}: ${cleanTitle}. ${summary} Why this matters: ${item.whyItMatters}`,
    );
  }

  const fullScript = `${intro}\n\n${storyLines.join("\n\n")}\n\n${outro}`;
  const words = fullScript.split(/\s+/).length;
  // ~150 words per minute
  const durationSec = Math.max(30, Math.ceil((words / 150) * 60));

  return { script: fullScript, durationSec };
}

export async function generateAndPersistBlogPost(
  stories: RankedStory[],
  date = new Date(),
): Promise<string> {
  const formattedDate = formatBlogDate(date);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const slug = `briefing-${yyyy}-${mm}-${dd}`;

  const topStory = stories[0];
  const title = topStory
    ? `Tech Pulse: ${topStory.story.canonicalTitle} (${formattedDate})`
    : `First Cup Tech: Daily Signals (${formattedDate})`;

  const excerpt = topStory?.story.signals[0]?.summary
    ? `${topStory.story.signals[0].summary.slice(0, 160)}... Curated high-signal engineering briefing.`
    : `Curated high-signal engineering and startup intelligence for ${formattedDate}.`;

  const allTags = Array.from(new Set(stories.flatMap((s) => s.story.topics)));

  const articlesHtml = stories
    .map((item, idx) => {
      const topSig = item.story.signals[0];
      const url = topSig?.url || "https://firstcup.tech";
      const summary =
        topSig?.summary || "Read the primary discussion for detailed technical evaluation.";

      return `
      <article class="mb-8 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div class="flex items-center gap-2 mb-3">
          <span class="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-mono font-bold text-secondary-foreground">
            #${idx + 1} ${item.story.dominantSource.toUpperCase()}
          </span>
          <span class="text-xs text-muted-foreground font-mono">
            Score: ${item.rankScore}
          </span>
        </div>
        <h3 class="text-xl font-bold text-foreground hover:text-accent transition-colors">
          <a href="${url}" target="_blank" rel="noopener noreferrer">
            ${item.story.canonicalTitle}
          </a>
        </h3>
        <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
          ${summary}
        </p>
        <div class="my-4 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-foreground">
          <strong class="text-accent uppercase tracking-wider text-xs block mb-1">
            Why It Matters For Engineering Roadmaps
          </strong>
          ${item.whyItMatters}
        </div>
        <div class="mt-4 flex items-center justify-between">
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold uppercase tracking-wider text-accent hover:underline">
            Read Primary Source &rarr;
          </a>
        </div>
      </article>
      `;
    })
    .join("\n");

  const contentHtml = `
    <div class="prose max-w-none text-foreground">
      <p class="lead text-lg text-muted-foreground mb-8">
        Your daily engineering radar tracking breakthrough developments, infrastructure updates, and high-impact technology shifts for <strong>${formattedDate}</strong>.
      </p>
      ${articlesHtml}
    </div>
  `;

  // Upsert blog post
  const existingPost = await db.query.blogPosts.findFirst({
    where: eq(schema.blogPosts.slug, slug),
  });

  if (existingPost) {
    await db
      .update(schema.blogPosts)
      .set({
        title,
        excerpt,
        contentHtml,
        tags: allTags,
        updatedAt: new Date(),
      })
      .where(eq(schema.blogPosts.slug, slug));
  } else {
    await db.insert(schema.blogPosts).values({
      id: crypto.randomUUID(),
      slug,
      title,
      excerpt,
      contentHtml,
      tags: allTags,
      digestDate: date,
      publishedAt: new Date(),
    });
  }

  workerLogger.info({ slug, title }, "Daily public blog post generated and saved.");
  return slug;
}
