/**
 * Environment-driven absolute URLs for the admin app.
 *
 * `NEXT_PUBLIC_*` variables are inlined by Next.js at build time, so they must
 * be read as literal property accesses — a dynamic lookup is replaced with
 * `undefined` in the browser bundle.
 *
 * The fallbacks point at the loopback address used by the local monorepo. In
 * every deployed environment the matching `NEXT_PUBLIC_*` variable is set and
 * wins.
 */

const LOOPBACK_ORIGIN = "http://127.0.0.1";

/** Base URL of the First Cup API server. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? `${LOOPBACK_ORIGIN}:4000`;

/** Public marketing site. */
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? `${LOOPBACK_ORIGIN}:3000`;

/** Subscriber console. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? `${LOOPBACK_ORIGIN}:3001`;

/** Internal admin console (this app). */
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? `${LOOPBACK_ORIGIN}:3002`;

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  if (!path || path === "/") return trimmedBase;
  return `${trimmedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL for a path on the marketing site. */
export function webUrl(path: string): string {
  return joinUrl(WEB_URL, path);
}

/** Absolute URL for a path on the subscriber console. */
export function appUrl(path: string): string {
  return joinUrl(APP_URL, path);
}
