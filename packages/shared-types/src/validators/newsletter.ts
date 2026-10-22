import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
