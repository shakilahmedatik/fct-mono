import type { FeedbackType } from "@repo/shared-types/enums";
import { enqueueDigestGeneration } from "../../lib/queue-client";
import { digestRepository } from "./repository";

export const digestService = {
  async getUserDigests(userId: string, limit = 10, offset = 0) {
    return digestRepository.findUserDigests(userId, limit, offset);
  },

  async getLatestDigest(userId: string) {
    return digestRepository.findLatestUserDigest(userId);
  },

  async getDigestById(id: string, userId: string) {
    const digest = await digestRepository.findById(id);
    if (!digest) throw new Error("Digest not found");
    if (digest.userId && digest.userId !== userId)
      throw new Error("Unauthorized to view this digest");
    return digest;
  },

  async submitFeedback(
    userId: string,
    data: { digestId?: string; digestItemId?: string; type: FeedbackType; note?: string },
  ) {
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
