"use client";

import { createApiClient } from "@repo/api-client";

/**
 * Pragmatic email shape check. The API owns the authoritative validation
 * (`newsletterSubscribeSchema` uses `z.string().email()`); this only avoids a
 * pointless round-trip for an obviously malformed address.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export type SubscribeResult = { ok: true } | { ok: false; message: string };

/**
 * Subscribe an address to the newsletter.
 *
 * Returns an error result instead of throwing so callers can render an honest
 * failure state — the previous implementation reported "subscribed" without
 * ever contacting the API.
 */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  try {
    const client = createApiClient();
    const res = await client.newsletter.subscribe.$post({ json: { email: trimmed } });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as unknown as { error?: string } | null;
      return {
        ok: false,
        message: data?.error ?? `Subscription failed (HTTP ${res.status}). Please try again.`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "We could not reach the server. Your address was not subscribed.",
    };
  }
}
