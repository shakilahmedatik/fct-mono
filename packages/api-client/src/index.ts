import type { AppType } from "@repo/api";
import { hc } from "hono/client";

export * from "./auth";
export * from "./http";
export type { AppType };

/**
 * Credentials mode forwarded to every request.
 *
 * Structurally identical to the DOM `RequestCredentials` type, redeclared here
 * so the package does not need the DOM lib.
 */
export type CredentialsMode = "omit" | "same-origin" | "include";

export interface ApiClientOptions {
  /**
   * Credentials mode forwarded to every request.
   *
   * Defaults to `"include"` because the API authenticates with an httpOnly
   * session cookie.
   */
  credentials?: CredentialsMode;
  /**
   * Headers sent with every request. A per-request `headers` option is merged
   * on top of these.
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Custom fetch implementation (tests, SSR, instrumentation). */
  fetch?: typeof fetch;
}

/**
 * Creates a typed Hono client for the First Cup API.
 *
 * Per-request overrides are supported by the underlying Hono client: the
 * second argument of every endpoint call is merged over the client defaults,
 * so a single call can opt out of the cookie credentials or add headers.
 *
 * @example
 * ```ts
 * const client = createApiClient("http://localhost:4000", { credentials: "include" });
 *
 * // per-request override
 * const res = await client.health.$get({ init: { credentials: "omit" } });
 *
 * // safe error handling
 * const { data, error } = await parseResponse(res);
 * if (error) throw error;
 * ```
 */
export function createApiClient(
  baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  options: ApiClientOptions = {},
) {
  const { credentials = "include", headers, fetch: fetchImpl } = options;

  return hc<AppType>(baseUrl, {
    init: { credentials },
    headers,
    fetch: fetchImpl,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
