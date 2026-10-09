import { db, schema } from "@repo/db";
import { and, eq, gte } from "drizzle-orm";
import { workerLogger } from "../../lib/logger";
import type { ClusteredStory, NormalizedSignal } from "../types";

export const EMBEDDING_DIM = 256;

export function generateDeterministicEmbedding(text: string): Float32Array {
  const vec = new Float32Array(EMBEDDING_DIM);
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return vec;

  for (const token of tokens) {
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) + hash + token.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM;
    vec[idx] += 1.0;

    // Subword n-grams for typo resilience
    if (token.length >= 4) {
      for (let i = 0; i <= token.length - 3; i++) {
        const sub = token.slice(i, i + 3);
        let subHash = 5381;
        for (let j = 0; j < sub.length; j++) {
          subHash = ((subHash << 5) + subHash + sub.charCodeAt(j)) | 0;
        }
        const subIdx = Math.abs(subHash) % EMBEDDING_DIM;
        vec[subIdx] += 0.3;
      }
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

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

export async function clusterAndPersistStories(
  signals: NormalizedSignal[],
  lookbackDays = 7,
): Promise<ClusteredStory[]> {
  if (signals.length === 0) return [];

  // 1. Calculate embeddings for each signal
  const embeddings = signals.map((s) =>
    generateDeterministicEmbedding(`${s.title} ${s.summary || ""} ${s.topics.join(" ")}`),
  );

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

  const CLUSTER_THRESHOLD = 0.75;
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      if (cosineSimilarity(embeddings[i], embeddings[j]) >= CLUSTER_THRESHOLD) {
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

  // 4. Fetch recent active stories from Postgres for cross-day linking
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const recentDbStories = await db.query.stories.findMany({
    where: and(eq(schema.stories.status, "active"), gte(schema.stories.lastSeenAt, since)),
    limit: 100,
  });

  const clusteredStories: ClusteredStory[] = [];

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

    // Pick canonical title (longest informative headline)
    const canonicalTitle = clusterSignals.reduce((best, cur) =>
      cur.title.length > best.title.length ? cur : best,
    ).title;

    // Dominant source & merged topics
    const dominantSource = clusterSignals[0].source;
    const allTopics = Array.from(new Set(clusterSignals.flatMap((s) => s.topics)));

    // Check cross-day link with DB stories
    let matchedDbStoryId: string | null = null;
    for (const dbStory of recentDbStories) {
      if (dbStory.embedding) {
        const dbVec = deserializeEmbedding(dbStory.embedding as Buffer);
        if (cosineSimilarity(centroid, dbVec) >= CLUSTER_THRESHOLD) {
          matchedDbStoryId = dbStory.id;
          break;
        }
      }
    }

    let finalStoryId = matchedDbStoryId;
    let isExisting = false;

    if (finalStoryId) {
      // Update existing story lastSeenAt
      isExisting = true;
      await db
        .update(schema.stories)
        .set({
          lastSeenAt: new Date(),
          topics: allTopics,
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
        embeddingModel: "deterministic-hash-v1",
        embedding: serializeEmbedding(centroid),
        embeddingDim: EMBEDDING_DIM,
        topics: allTopics,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      });
    }

    // Insert or update memberships for all signals in this cluster
    for (const sig of clusterSignals) {
      sig.clusterId = clusterId;
      try {
        await db.insert(schema.storyMemberships).values({
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
        });
      } catch (_err) {
        // Ignore unique constraint violation if sourceItemId was already ingested
      }
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

  workerLogger.info(
    { totalClusters: clusteredStories.length, signalsCount: signals.length },
    "Clustering and story resolution complete.",
  );

  return clusteredStories;
}
