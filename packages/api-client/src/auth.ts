import { createAuthClient } from "better-auth/react";

export function createFirstCupAuthClient(
  baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
) {
  return createAuthClient({
    baseURL,
  });
}

export const authClient = createFirstCupAuthClient();
export type FirstCupAuthClient = typeof authClient;
