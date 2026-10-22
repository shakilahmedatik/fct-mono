import type { FeedbackType } from "@repo/shared-types/enums";
import { HTTPException } from "hono/http-exception";
import { enqueueDigestGeneration } from "../../lib/queue-client";
import { type DigestFilters, digestRepository } from "./repository";

export const digestService = {
  async getUserDigests(userId: string, limit = 10, offset = 0, filters: DigestFilters = {}) {
    return digestRepository.findUserDigests(userId, limit, offset, filters);
  },

  async getLatestDigest(userId: string) {
    return digestRepository.findLatestUserDigest(userId);
  },

  async getLatestMasterDigest() {
    return digestRepository.findLatestMasterDigest();
  },

  async getDigestById(id: string, userId: string) {
    const digest = await digestRepository.findById(id);
    // These were generic `Error`s, so Hono's default handler turned a missing
    // digest and a forbidden one into a 500. They are now the correct status.
    if (!digest) {
      throw new HTTPException(404, { message: "Digest not found" });
    }
    if (digest.userId && digest.userId !== userId) {
      throw new HTTPException(403, { message: "Forbidden: this digest belongs to another user" });
    }
    return digest;
  },

  async submitFeedback(
    userId: string,
    data: { digestId?: string; digestItemId?: string; type: FeedbackType; note?: string },
  ) {
    // Confirm the referenced item belongs to the caller before recording
    // feedback against it.
    if (data.digestItemId) {
      const owned = await digestRepository.findDigestItemOwnedBy(data.digestItemId, userId);
      if (!owned) {
        throw new HTTPException(404, { message: "Digest item not found" });
      }
    }

    return digestRepository.createFeedback({
      id: crypto.randomUUID(),
      userId,
      digestId: data.digestId,
      digestItemId: data.digestItemId,
      type: data.type,
      note: data.note,
    });
  },

  async triggerGeneration(userId: string) {
    const job = await enqueueDigestGeneration({ userId, force: true });
    return { jobId: job.id, message: "Digest generation queued" };
  },
};
