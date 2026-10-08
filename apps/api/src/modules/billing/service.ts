import { billingRepository } from "./repository";

export const billingService = {
  async handlePaddleWebhook(event: { event_type: string; data: Record<string, unknown> }) {
    const { event_type, data } = event;

    switch (event_type) {
      case "subscription.created":
      case "subscription.activated": {
        const customData = (data.custom_data || {}) as Record<string, string>;
        const userId = customData.userId || customData.user_id;

        if (userId) {
          await billingRepository.updateSubscription(userId, {
            paddleCustomerId: String(data.customer_id),
            paddleSubscriptionId: String(data.id),
            subscriptionStatus: "active",
            plan: "PRO",
          });
        }
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
    }

    return { received: true };
  },
};
