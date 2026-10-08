import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";

export const billingRepository = {
  async updateSubscription(
    userId: string,
    data: {
      paddleCustomerId?: string;
      paddleSubscriptionId?: string;
      subscriptionStatus?: string;
      plan?: "FREE" | "PRO";
    },
  ) {
    const [updated] = await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return updated;
  },

  async findByPaddleCustomerId(customerId: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.paddleCustomerId, customerId),
    });
  },

  async findByPaddleSubscriptionId(subscriptionId: string) {
    return db.query.users.findFirst({
      where: eq(schema.users.paddleSubscriptionId, subscriptionId),
    });
  },
};
