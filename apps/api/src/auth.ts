import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db, schema } from "@repo/db";
import { betterAuth } from "better-auth";

const isProd = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || (isProd ? ".firstcup.tech" : undefined);

export const auth = betterAuth({
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
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://firstcup.tech",
    "https://app.firstcup.tech",
    "https://admin.firstcup.tech",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      plan: {
        type: "string",
        defaultValue: "PRO",
      },
      banned: {
        type: "boolean",
        defaultValue: false,
      },
      telegramChatId: {
        type: "string",
        required: false,
      },
      preferredDeliveryChannel: {
        type: "string",
        defaultValue: "telegram",
      },
    },
  },
});

export type Auth = typeof auth;
