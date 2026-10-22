/**
 * Single source of truth for the browser origins this API trusts.
 *
 * Both the CORS middleware and Better Auth's `trustedOrigins` read from here so
 * the two can never drift apart — a mismatch between them is how an origin
 * ends up able to make credentialed cross-origin calls.
 */

const LOCAL_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

const PRODUCTION_ORIGINS = [
  "https://firstcup.tech",
  "https://app.firstcup.tech",
  "https://admin.firstcup.tech",
];

function parseOriginList(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
}

/**
 * Allowed origins.
 *
 * `ALLOWED_ORIGINS` overrides everything when set. Otherwise the local origins
 * are always allowed and the production origins are added in production.
 *
 * NOTE: this is an exact-match allowlist on purpose. A suffix match such as
 * `origin.endsWith(".firstcup.tech")` would trust every subdomain of the
 * estate — including a forgotten or dangling one — with credentialed requests.
 */
export function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured) {
    const parsed = parseOriginList(configured);
    if (parsed.length > 0) return Array.from(new Set(parsed));
  }

  const isProd = process.env.NODE_ENV === "production";
  // In production the local origins are NOT added implicitly: a browser sitting
  // on `localhost:3000` is some other program on the machine, and trusting it
  // with credentialed requests is exactly the hole the exact-match allowlist
  // exists to close. A production deployment sets `ALLOWED_ORIGINS` (the prod
  // Compose file makes it required).
  const origins = isProd ? PRODUCTION_ORIGINS : LOCAL_ORIGINS;
  return Array.from(new Set(origins));
}

export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin.replace(/\/+$/, ""));
}
