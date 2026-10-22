import type { schema } from "@repo/db";
import { userRepository } from "./repository";

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error("User not found");
    return user;
  },

  async updateProfile(
    userId: string,
    data: Partial<
      Pick<
        typeof schema.users.$inferInsert,
        | "name"
        | "persona"
        | "telegramChatId"
        | "telegramUsername"
        | "phoneNumber"
        | "preferredDeliveryChannel"
      >
    >,
  ) {
    return userRepository.updateProfile(userId, data);
  },

  async getPreferences(userId: string) {
    const pref = await userRepository.findPreferenceByUserId(userId);
    if (!pref) {
      return userRepository.upsertPreference(userId, {});
    }
    return pref;
  },

  async updatePreferences(
    userId: string,
    data: Partial<typeof schema.userPreferences.$inferInsert>,
  ) {
    return userRepository.upsertPreference(userId, data);
  },
};
