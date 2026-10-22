import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paddle webhook signature verification.
 *
 * Paddle signs each webhook with an HMAC over `<timestamp>:<raw body>` using
 * the account's webhook secret, and sends it as:
 *
 *   Paddle-Signature: ts=<unix seconds>;h1=<hex digest>
 */

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export interface PaddleSignatureParts {
  timestamp: number;
  hash: string;
}

export function parsePaddleSignature(header: string | undefined): PaddleSignatureParts | null {
  if (!header) return null;

  const parts = new Map<string, string>();
  for (const segment of header.split(";")) {
    const index = segment.indexOf("=");
    if (index === -1) continue;
    parts.set(segment.slice(0, index).trim(), segment.slice(index + 1).trim());
  }

  const ts = parts.get("ts");
  const h1 = parts.get("h1");
  if (!ts || !h1) return null;

  const timestamp = Number.parseInt(ts, 10);
  if (!Number.isFinite(timestamp)) return null;

  return { timestamp, hash: h1 };
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify a Paddle webhook signature.
 *
 * Fails closed: if no secret is configured, the webhook is rejected rather
 * than accepted unverified.
 */
export function verifyPaddleSignature(
  header: string | undefined,
  rawBody: string,
  secret: string | undefined = process.env.PADDLE_WEBHOOK_SECRET,
): { valid: boolean; reason?: string } {
  if (!secret) {
    return { valid: false, reason: "PADDLE_WEBHOOK_SECRET is not configured" };
  }

  const parsed = parsePaddleSignature(header);
  if (!parsed) {
    return { valid: false, reason: "Missing or malformed Paddle-Signature header" };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (age > SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, reason: "Signature timestamp is outside the tolerance window" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}:${rawBody}`)
    .digest("hex");

  if (!safeEqual(expected, parsed.hash)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}
