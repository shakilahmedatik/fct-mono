import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db, schema } from "@repo/db";
import { betterAuth } from "better-auth";
import { getAllowedOrigins } from "./lib/origins";

const isProd = process.env.NODE_ENV === "production";

/**
 * Session cookie domain.
 *
 * By default the cookie is host-only (no `domain` attribute), so it is only
 * sent to the API host. Opting into a shared parent domain means EVERY
 * subdomain of that domain receives the session cookie, so it is off unless
 * explicitly configured.
 */
const cookieDomain = process.env.COOKIE_DOMAIN;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  advanced: {
    // Deterministic cookie names so the Next.js middleware can check for the
    // session cookie without guessing: `fc.session_token` in development and
    // `__Secure-fc.session_token` in production (the `__Secure-` prefix is
    // added automatically when `useSecureCookies` is on).
    cookiePrefix: "fc",
    useSecureCookies: isProd,
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
  },
  trustedOrigins: getAllowedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      // New accounts start on the free tier. The previous default of "PRO"
      // meant every signup was entitled to paid behaviour and the cohort
      // paywall could never engage.
      plan: {
        type: "string",
        defaultValue: "FREE",
        input: false,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      // `banExpires` has to be declared here or better-auth does not return it
      // on `session.user`, which makes a temporary ban indistinguishable from a
      // permanent one — the guard would never be able to lift it.
      banExpires: {
        type: "date",
        required: false,
        input: false,
      },
      telegramChatId: {
        type: "string",
        required: false,
        input: false,
      },
      preferredDeliveryChannel: {
        type: "string",
        defaultValue: "telegram",
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;

/** Names of the cookies Better Auth sets, for middleware / proxy code. */
export const SESSION_COOKIE_NAMES = [
  "fc.session_token",
  "__Secure-fc.session_token",
  "fc.session_data",
  "__Secure-fc.session_data",
] as const;
