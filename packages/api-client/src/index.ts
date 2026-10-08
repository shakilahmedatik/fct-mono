import type { AppType } from "@repo/api";
import { hc } from "hono/client";

export type { AppType };

export function createApiClient(
  baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
) {
  return hc<AppType>(baseUrl, {
    init: {
      credentials: "include",
    },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
