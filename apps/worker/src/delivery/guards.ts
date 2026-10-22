import type { DeliveryChannel } from "./types";

/**
 * The parts of the audio brief that the delivery guards need.
 */
export interface DeliveryBriefState {
  status: string | null;
  audioUrl: string | null;
  deliveryStatus: string | null;
  deliveryChannel: string | null;
}

/**
 * Pre-send idempotency guard.
 *
 * The `audio_brief` row carries a single delivery status, and a digest is
 * delivered to exactly one channel (the preferred channel of the user), so the
 * row is a reliable "already sent" marker for that (digest, channel) pair.
 *
 * TODO(db): a dedicated `delivery_attempts` table with a unique index on
 * (digest_id, user_id, channel) would allow a per-user, per-channel outcome
 * (the master digest is delivered to many users but has only one audio brief
 * row). The database schema is owned by another team.
 */
export function isAlreadyDelivered(
  brief: DeliveryBriefState | null | undefined,
  channel: DeliveryChannel,
): boolean {
  if (!brief) return false;
  return brief.deliveryStatus === "sent" && brief.deliveryChannel === channel;
}

/**
 * Raised while the audio of a digest is still being generated.
 *
 * The delivery job is retried by BullMQ (the job options carry a backoff), so
 * the briefing is sent as soon as the audio is available.
 */
export class AudioNotReadyError extends Error {
  constructor(digestId: string, status: string | null) {
    super(
      `The audio brief of digest ${digestId} is not ready yet (status=${status ?? "missing"}). The delivery is retried.`,
    );
    this.name = "AudioNotReadyError";
  }
}

/**
 * Make sure the audio exists before the briefing is sent.
 *
 * A failed synthesis does not block the delivery: the briefing is then sent
 * without the audio attachment.
 */
export function ensureAudioReady(
  brief: DeliveryBriefState | null | undefined,
  options: { audioEnabled: boolean; digestId: string },
): void {
  if (!options.audioEnabled) return;
  if (!brief) return;
  if (brief.status === "ready" || brief.status === "failed") return;

  throw new AudioNotReadyError(options.digestId, brief.status);
}
