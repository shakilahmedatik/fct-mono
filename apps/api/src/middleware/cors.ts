import { cors } from "hono/cors";
import { getAllowedOrigins } from "../lib/origins";

const ALLOWED_ORIGINS = getAllowedOrigins();

export const corsMiddleware = cors({
  origin: (origin) => {
    // No Origin header (same-origin, curl, server-to-server) — no CORS headers
    // needed, so there is nothing to reflect.
    if (!origin) return undefined;

    // Exact match only. A suffix match would trust every subdomain of the
    // estate with credentialed requests.
    if (ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ""))) return origin;

    // Disallowed origin: return no header at all rather than reflecting a
    // different (allowed) origin, which would make the response readable by
    // an unrelated site.
    return undefined;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // `x-ai-provider` is deliberately NOT in the allowlist. The header now
  // carries only a provider *id* — the server resolves the base URL, key and
  // model itself — so it is no longer an SSRF vector, but keeping it
  // same-origin-only is defence in depth: a cross-origin caller cannot even
  // choose which configured provider the server uses. Cross-origin callers
  // simply get the server's active provider.
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
});
