import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  persona: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramUsername: z.string().optional(),
  phoneNumber: z.string().optional(),
  preferredDeliveryChannel: z.enum(["telegram", "whatsapp", "email"]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const userPreferenceSchema = z.object({
  topics: z.array(z.string()).min(1, "Select at least one topic"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  timezone: z.string(),
  deliveryHour: z.number().int().min(0).max(23),
  audioEnabled: z.boolean(),
  channelEnabled: z.boolean(),
});
export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>;
