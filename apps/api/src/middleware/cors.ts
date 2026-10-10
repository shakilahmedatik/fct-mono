import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://firstcup.tech",
  "https://app.firstcup.tech",
  "https://admin.firstcup.tech",
];

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin.endsWith(".firstcup.tech")) return origin;
    return ALLOWED_ORIGINS[0];
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-ai-provider"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
});
