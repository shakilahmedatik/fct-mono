import { redis } from "../../lib/redis";
import { logger } from "../../middleware/logger";
import { billingRepository } from "./repository";

/** Events this application knows how to act on. Anything else is acknowledged and ignored. */
const HANDLED_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.canceled",
  "subscription.past_due",
]);

const EVENT_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 7;

export const billingService = {
  async handlePaddleWebhook(
    event: {
      event_type: string;
      event_id?: string;
      data: Record<string, unknown>;
    },
    options: { eventId?: string } = {},
  ) {
    const { event_type, data } = event;
    const eventId = options.eventId ?? event.event_id;

    if (!HANDLED_EVENTS.has(event_type)) {
      logger.info({ eventType: event_type }, "Ignoring unhandled Paddle event type");
      return { received: true, handled: false };
    }

    // Paddle retries webhooks. Applying the same event twice must be a no-op.
    if (eventId) {
      try {
        const claimed = await redis.set(
          `paddle:event:${eventId}`,
          "1",
          "EX",
          EVENT_DEDUPE_TTL_SECONDS,
          "NX",
        );
        if (claimed !== "OK") {
          logger.info({ eventId, eventType: event_type }, "Paddle event already processed");
          return { received: true, handled: false, duplicate: true };
        }
      } catch (error) {
        // Redis being unavailable must not block legitimate billing updates;
        // the worst case is a repeated (idempotent) subscription write.
        logger.warn(
          { err: error instanceof Error ? error.message : String(error), eventId },
          "Could not record Paddle event id; continuing without deduplication",
        );
      }
    }

    switch (event_type) {
      case "subscription.created":
      case "subscription.activated": {
        const customData = (data.custom_data || {}) as Record<string, string>;
        const userId = customData.userId || customData.user_id;

        if (!userId) {
          logger.warn(
            { eventType: event_type },
            "Paddle event without a user id; nothing to update",
          );
          break;
        }

        await billingRepository.updateSubscription(userId, {
          paddleCustomerId: data.customer_id ? String(data.customer_id) : undefined,
          paddleSubscriptionId: data.id ? String(data.id) : undefined,
          subscriptionStatus: "active",
          plan: "PRO",
        });
        break;
      }
      case "subscription.canceled": {
        const user = await billingRepository.findByPaddleSubscriptionId(String(data.id));
        if (user) {
          await billingRepository.updateSubscription(user.id, {
            subscriptionStatus: "canceled",
            plan: "FREE",
          });
        }
        break;
      }
      case "subscription.past_due": {
        const user = await billingRepository.findByPaddleSubscriptionId(String(data.id));
        if (user) {
          await billingRepository.updateSubscription(user.id, {
            subscriptionStatus: "past_due",
          });
        }
        break;
      }
      default:
        break;
    }

    return { received: true, handled: true };
  },
};
