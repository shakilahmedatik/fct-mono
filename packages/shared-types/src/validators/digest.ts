import { z } from "zod";

export const digestQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(["pending", "generated", "delivered", "failed"]).optional(),
  type: z.enum(["daily_audio", "weekly_newsletter"]).optional(),
});
export type DigestQueryInput = z.infer<typeof digestQuerySchema>;

export const feedbackSchema = z.object({
  digestId: z.string().optional(),
  digestItemId: z.string().optional(),
  type: z.enum(["helpful", "not_helpful", "too_basic", "too_advanced"]),
  note: z.string().max(500).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;
