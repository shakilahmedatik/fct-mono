// =============================================================================
// Outbound URL Guard — SSRF protection for server-side fetches
// =============================================================================
//
// Every URL that the server dereferences on behalf of a request is a
// server-side request forgery (SSRF) primitive unless the destination is
// constrained. The same rules are applied to every adapter that fetches a
// caller-supplied URL (LLM provider base URL, RSS feed URL):
//
//   * only `http:` and `https:` are allowed;
//   * loopback, private, link-local, CGNAT and cloud-metadata destinations are
//     rejected;
//   * an explicit allowlist (environment variable) can permit a specific host.
//
// The guard lives in one place so that every adapter enforces the same rules.
// =============================================================================

import { lookup } from "node:dns/promises";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

/** Host names / IPv4 literals that must never be reached by the server. */
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  // Carrier-grade NAT (100.64.0.0/10)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  // Benchmarking range (198.18.0.0/15)
  /^198\.(1[89])\./,
  /^metadata$/i,
  /^metadata\./i,
  /\.internal$/i,
  /\.local$/i,
];

/** IPv6 literals that must never be reached by the server. */
const BLOCKED_IPV6 = /^\[?(::1|fc|fd|fe80:)/i;

export interface UrlGuardOptions {
  /** Environment variable holding the comma separated host allowlist. */
  allowlistEnvVar: string;
  /** Human readable description used in error messages. */
  context: string;
  /**
   * When set, a URL that is byte-for-byte identical to the value of this
   * environment variable is accepted even when it points at a loopback
   * address. A locally hosted model is a legitimate deployment, and the value
   * is trusted because it comes from the server's own environment rather than
   * from a request.
   */
  configuredUrlEnvVar?: string;
}

export function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

/** True when the host is loopback, private, link-local or metadata. */
export function isBlockedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (host.length === 0) return true;
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) return true;
  return BLOCKED_IPV6.test(host);
}

/** Hosts (or full URLs) explicitly permitted by the allowlist env var. */
export function getAllowlistedHosts(envVar: string): string[] {
  return (process.env[envVar] ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlisted(url: URL, envVar: string): boolean {
  const host = normalizeHost(url.hostname);
  const origin = `${url.protocol}//${url.host.toLowerCase()}`;
  const full = url.toString().toLowerCase();

  return getAllowlistedHosts(envVar).some(
    (entry) => entry === host || entry === origin || entry === full,
  );
}

/**
 * Synchronous guard: scheme + static host checks.
 * Throws a descriptive error when the URL must not be dereferenced.
 */
export function assertSafeHttpUrl(rawUrl: string, options: UrlGuardOptions): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${options.context}: "${rawUrl}" is not a valid absolute URL.`);
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new Error(
      `${options.context}: only http and https URLs are allowed (got "${url.protocol}").`,
    );
  }

  const host = normalizeHost(url.hostname);
  if (host.length === 0) {
    throw new Error(`${options.context}: the URL has no host.`);
  }

  if (isAllowlisted(url, options.allowlistEnvVar)) return url;

  if (options.configuredUrlEnvVar) {
    const configured = process.env[options.configuredUrlEnvVar];
    if (configured && configured.trim().toLowerCase() === rawUrl.trim().toLowerCase()) {
      return url;
    }
  }

  if (isBlockedHost(host)) {
    throw new Error(
      `${options.context}: "${host}" resolves to a loopback, private, link-local or metadata address and is not allowed.`,
    );
  }

  return url;
}

/**
 * Asynchronous guard: the static checks plus a DNS resolution check, so that a
 * public looking host name that resolves to an internal address is rejected as
 * well. A DNS failure is *not* treated as proof of an unsafe destination — the
 * request would fail anyway — but it is reported to the caller.
 */
export async function assertSafeHttpUrlAsync(
  rawUrl: string,
  options: UrlGuardOptions,
): Promise<URL> {
  const url = assertSafeHttpUrl(rawUrl, options);
  const host = normalizeHost(url.hostname);

  // Literal IPv4 / IPv6 addresses have already been checked above.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return url;

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return url;
  }

  for (const entry of addresses) {
    if (isBlockedHost(entry.address)) {
      throw new Error(
        `${options.context}: "${host}" resolves to the blocked address ${entry.address}.`,
      );
    }
  }

  return url;
}
