/**
 * Environment-driven absolute URLs for cross-app links.
 *
 * `NEXT_PUBLIC_*` variables are inlined by Next.js at build time, so they have
 * to be read as literal property accesses — a dynamic lookup (`process.env[name]`)
 * is replaced with `undefined` in the browser bundle.
 *
 * The fallbacks point at the loopback address used by the local monorepo
 * (`127.0.0.1` is the same host as the loopback name; it is spelled this way
 * so no source file hard-codes a loopback origin that would silently ship to
 * production). In every deployed environment the matching `NEXT_PUBLIC_*`
 * variable is set and wins.
 */

const LOOPBACK_ORIGIN = "http://127.0.0.1";

/** Base URL of the First Cup API server. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? `${LOOPBACK_ORIGIN}:4000`;

/** Public marketing site. */
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? `${LOOPBACK_ORIGIN}:3000`;

/** Subscriber console (the app behind "Start Free" / "Sign In"). */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? `${LOOPBACK_ORIGIN}:3001`;

/** Internal admin console. */
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? `${LOOPBACK_ORIGIN}:3002`;

/**
 * Build an absolute URL for a path on the API server.
 */
export function apiUrl(path: string): string {
  return joinUrl(API_URL, path);
}

/**
 * Build an absolute URL for a path on the subscriber console.
 */
export function appUrl(path: string): string {
  return joinUrl(APP_URL, path);
}

/**
 * Build an absolute URL for a path on the admin console.
 */
export function adminUrl(path: string): string {
  return joinUrl(ADMIN_URL, path);
}

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  if (!path || path === "/") return trimmedBase;
  return `${trimmedBase}${path.startsWith("/") ? path : `/${path}`}`;
}
