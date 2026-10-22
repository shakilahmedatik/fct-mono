import { db, schema } from "@repo/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { generateEmbedding } from "../ai";
import type { ClusteredStory, NormalizedSignal, SourceName } from "../types";
import { mapWithConcurrency } from "./concurrency";
import { logger } from "./logger";

export const EMBEDDING_DIM = 384; // xenova-all-minilm-l6-v2 dimension

/**
 * Embeddings are generated with a small amount of concurrency. Fully serial
 * generation was needlessly slow, but unbounded concurrency can exhaust
 * memory when the ONNX runtime loads the model.
 */
const EMBEDDING_CONCURRENCY = 4;

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function serializeEmbedding(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

export function deserializeEmbedding(buf: Buffer): Float32Array {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return new Float32Array(ab);
}

/**
 * The dominant source of a cluster.
 *
 * The dominant source is the *most frequent* source of the signals in the
 * cluster — it drives the source weighting during ranking and is shown to the
 * reader as the source badge. Taking the source of the first signal (the
 * previous behaviour) picked the wrong source roughly half of the time.
 *
 * Ties are broken by the order in which the sources first appear in the
 * cluster, which is deterministic for a given input order.
 */
export function computeDominantSource(signals: NormalizedSignal[]): string {
  if (signals.length === 0) return "unknown";

  const counts = new Map<SourceName, number>();
  const firstSeen = new Map<SourceName, number>();

  signals.forEach((signal, index) => {
    counts.set(signal.source, (counts.get(signal.source) ?? 0) + 1);
    if (!firstSeen.has(signal.source)) {
      firstSeen.set(signal.source, index);
    }
  });

  let bestSource = signals[0].source;
  let bestCount = counts.get(bestSource) ?? 0;

  for (const [source, count] of counts) {
    if (count > bestCount) {
      bestSource = source;
      bestCount = count;
      continue;
    }
    if (count === bestCount) {
      const bestFirst = firstSeen.get(bestSource) ?? 0;
      const candidateFirst = firstSeen.get(source) ?? 0;
      if (candidateFirst < bestFirst) {
        bestSource = source;
      }
    }
  }

  return bestSource;
}

async function embedSignals(signals: NormalizedSignal[]): Promise<Float32Array[]> {
  const embeddings = await mapWithConcurrency(signals, EMBEDDING_CONCURRENCY, async (signal) => {
    const text = `${signal.title} ${signal.summary || ""} ${signal.topics.join(" ")}`;
    const embedding = await generateEmbedding(text);
    return new Float32Array(embedding);
  });

  return embeddings;
}

/**
 * In-memory clustering only — does NOT persist to DB.
 * Used by the playground for dry-run / preview mode.
 */
export async function clusterSignalsInMemory(
  signals: NormalizedSignal[],
  clusterThreshold = 0.75,
): Promise<ClusteredStory[]> {
  if (signals.length === 0) return [];

  // Generate real AI embeddings (bounded concurrency)
  const embeddings = await embedSignals(signals);

  // Union-Find clustering
  const parent = signals.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  };

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      if (cosineSimilarity(embeddings[i], embeddings[j]) >= clusterThreshold) {
        union(i, j);
      }
    }
  }

  const clusterGroups = new Map<number, number[]>();
  for (let i = 0; i < signals.length; i++) {
    const root = find(i);
    if (!clusterGroups.has(root)) clusterGroups.set(root, []);
    clusterGroups.get(root)!.push(i);
  }

  const stories: ClusteredStory[] = [];

  for (const memberIndices of clusterGroups.values()) {
    const clusterSignals = memberIndices.map((idx) => signals[idx]);
    const clusterId = crypto.randomUUID();

    // Centroid vector
    const centroid = new Float32Array(EMBEDDING_DIM);
    for (const idx of memberIndices) {
      const emb = embeddings[idx];
      for (let k = 0; k < EMBEDDING_DIM; k++) {
        centroid[k] += emb[k];
      }
    }
    let norm = 0;
    for (let k = 0; k < EMBEDDING_DIM; k++) {
      centroid[k] /= memberIndices.length;
      norm += centroid[k] * centroid[k];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let k = 0; k < EMBEDDING_DIM; k++) centroid[k] /= norm;
    }

    const canonicalTitle = clusterSignals.reduce((best, cur) =>
      cur.title.length > best.title.length ? cur : best,
    ).title;

    const dominantSource = computeDominantSource(clusterSignals);
    const allTopics = Array.from(new Set(clusterSignals.flatMap((s) => s.topics)));

    stories.push({
      id: crypto.randomUUID(),
      canonicalTitle,
      dominantSource,
      topics: allTopics,
      clusterId,
      embedding: centroid,
      signals: clusterSignals,
      isExistingStory: false,
    });
  }

  return stories;
}

/**
 * Full cluster + persist — writes stories and memberships to Postgres.
 */
export async function clusterAndPersistStories(
  signals: NormalizedSignal[],
  lookbackDays = 7,
  clusterThreshold = 0.75,
): Promise<ClusteredStory[]> {
  if (signals.length === 0) return [];

  // 1. Calculate embeddings for each signal (bounded concurrency)
  const embeddings = await embedSignals(signals);

  // 2. In-memory Union-Find clustering across today's signals
  const parent = signals.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  };

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      if (cosineSimilarity(embeddings[i], embeddings[j]) >= clusterThreshold) {
        union(i, j);
      }
    }
  }

  // 3. Group signals into clusters
  const clusterGroups = new Map<number, number[]>();
  for (let i = 0; i < signals.length; i++) {
    const root = find(i);
    if (!clusterGroups.has(root)) clusterGroups.set(root, []);
    clusterGroups.get(root)!.push(i);
  }

  // 4. Fetch recent active stories from Postgres for cross-day linking.
  //    The ordering is explicit: without it PostgreSQL is free to return the
  //    rows in any order, which made the linking non-deterministic.
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const recentDbStories = await db.query.stories.findMany({
    where: and(eq(schema.stories.status, "active"), gte(schema.stories.lastSeenAt, since)),
    orderBy: [desc(schema.stories.lastSeenAt)],
    limit: 100,
  });

  const clusteredStories: ClusteredStory[] = [];

  for (const memberIndices of clusterGroups.values()) {
    const clusterSignals = memberIndices.map((idx) => signals[idx]);
    const newClusterId = crypto.randomUUID();

    // Centroid vector
    const centroid = new Float32Array(EMBEDDING_DIM);
    for (const idx of memberIndices) {
      const emb = embeddings[idx];
      for (let k = 0; k < EMBEDDING_DIM; k++) {
        centroid[k] += emb[k];
      }
    }
    let norm = 0;
    for (let k = 0; k < EMBEDDING_DIM; k++) {
      centroid[k] /= memberIndices.length;
      norm += centroid[k] * centroid[k];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let k = 0; k < EMBEDDING_DIM; k++) centroid[k] /= norm;
    }

    // Pick canonical title (longest informative headline)
    const canonicalTitle = clusterSignals.reduce((best, cur) =>
      cur.title.length > best.title.length ? cur : best,
    ).title;

    // Dominant source (most frequent source in the cluster) & merged topics
    const dominantSource = computeDominantSource(clusterSignals);
    const allTopics = Array.from(new Set(clusterSignals.flatMap((s) => s.topics)));

    // Check cross-day link with DB stories. The *best* matching candidate is
    // used, not the first one above the threshold.
    let matchedDbStory: (typeof recentDbStories)[number] | null = null;
    let bestSimilarity = -1;

    for (const dbStory of recentDbStories) {
      if (!dbStory.embedding) continue;
      const dbVec = deserializeEmbedding(dbStory.embedding as Buffer);
      // Ensure dimensionality matches before cosine similarity
      if (dbVec.length !== EMBEDDING_DIM) continue;

      const similarity = cosineSimilarity(centroid, dbVec);
      if (similarity < clusterThreshold) continue;
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        matchedDbStory = dbStory;
      }
    }

    let finalStoryId = matchedDbStory?.id ?? null;
    let isExisting = false;

    // The cluster id of a re-linked story is the one already stored on the
    // story row, so `stories.cluster_id` and the cluster id used by the
    // memberships/signals of that story can never diverge.
    const clusterId = matchedDbStory?.clusterId ?? newClusterId;

    if (finalStoryId) {
      // Update existing story lastSeenAt (and keep the cluster id in sync)
      isExisting = true;
      await db
        .update(schema.stories)
        .set({
          lastSeenAt: new Date(),
          topics: allTopics,
          clusterId,
          updatedAt: new Date(),
        })
        .where(eq(schema.stories.id, finalStoryId));
    } else {
      // Create new story in DB
      finalStoryId = crypto.randomUUID();
      await db.insert(schema.stories).values({
        id: finalStoryId,
        canonicalTitle,
        clusterId,
        dominantSource,
        status: "active",
        embeddingModel: "xenova-all-minilm-l6-v2",
        embedding: serializeEmbedding(centroid),
        embeddingDim: EMBEDDING_DIM,
        topics: allTopics,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      });
    }

    // Insert memberships for all signals in this cluster in one round trip.
    // `onConflictDoNothing` ignores exactly the unique-constraint violations
    // (a source item that was already ingested) — the previous implementation
    // swallowed *every* error, which hid real database failures.
    for (const sig of clusterSignals) {
      sig.clusterId = clusterId;
    }

    if (clusterSignals.length > 0) {
      await db
        .insert(schema.storyMemberships)
        .values(
          clusterSignals.map((sig) => ({
            id: crypto.randomUUID(),
            storyId: finalStoryId,
            sourceItemId: `${sig.source}:${sig.sourceItemId}`,
            source: sig.source,
            url: sig.url,
            title: sig.title,
            summary: sig.summary,
            contentHash: sig.contentHash,
            publishedAt: sig.publishedAt,
            isFollowUp: isExisting,
            rankScore: sig.engagementScore * 0.5 + sig.freshnessScore * 0.5,
            topics: sig.topics,
          })),
        )
        .onConflictDoNothing();
    }

    clusteredStories.push({
      id: finalStoryId,
      canonicalTitle,
      dominantSource,
      topics: allTopics,
      clusterId,
      embedding: centroid,
      signals: clusterSignals,
      isExistingStory: isExisting,
    });
  }

  logger.info(
    { clusters: clusteredStories.length, candidates: recentDbStories.length },
    "Clustered and persisted stories",
  );

  return clusteredStories;
}
