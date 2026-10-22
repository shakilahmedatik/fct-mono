import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Telegram webhook security.
 *
 * Two independent controls:
 *
 * 1. `X-Telegram-Bot-Api-Secret-Token` — the header Telegram sends when the
 *    webhook is registered with a `secret_token`. Without this check anyone
 *    who learns the URL can post arbitrary updates.
 * 2. A signed, expiring link token — `/start <token>` can no longer name a
 *    bare user id, so a caller cannot rebind somebody else's Telegram chat.
 */

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;

function secret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET || process.env.BETTER_AUTH_SECRET;
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify the webhook secret token sent by Telegram.
 */
export function verifyTelegramSecretToken(header: string | undefined): {
  valid: boolean;
  reason?: string;
} {
  const expected = secret();
  if (!expected) {
    return {
      valid: false,
      reason: "TELEGRAM_WEBHOOK_SECRET is not configured",
    };
  }

  if (!header) {
    return { valid: false, reason: "Missing X-Telegram-Bot-Api-Secret-Token header" };
  }

  if (!safeEqual(header, expected)) {
    return { valid: false, reason: "Secret token mismatch" };
  }

  return { valid: true };
}

/**
 * Mint a signed, expiring token that identifies a user to the webhook.
 */
export function createTelegramLinkToken(userId: string): string {
  const key = secret();
  if (!key) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET (or BETTER_AUTH_SECRET) must be configured to create Telegram link tokens",
    );
  }

  const expiresAt = Date.now() + LINK_TOKEN_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verify a link token and return the user id it refers to.
 */
export function verifyTelegramLinkToken(token: string): {
  valid: boolean;
  userId?: string;
  reason?: string;
} {
  const key = secret();
  if (!key) {
    return { valid: false, reason: "Telegram link token secret is not configured" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Malformed link token" };
  }

  const [userId, expiresAtRaw, signature] = parts;
  const expiresAt = Number.parseInt(expiresAtRaw, 10);

  if (!userId || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: "Malformed link token" };
  }

  if (expiresAt < Date.now()) {
    return { valid: false, reason: "Link token has expired" };
  }

  const expected = createHmac("sha256", key).update(`${userId}.${expiresAtRaw}`).digest("hex");

  if (!safeEqual(expected, signature)) {
    return { valid: false, reason: "Invalid link token signature" };
  }

  return { valid: true, userId };
}

/**
 * Build the `t.me` deep link a user opens to connect their Telegram account.
 */
export function buildTelegramDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}
