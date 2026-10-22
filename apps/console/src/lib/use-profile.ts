"use client";

import { createApiClient } from "@repo/api-client";
import * as React from "react";

/**
 * The subset of the signed-in user the console renders.
 *
 * Everything here comes from `GET /user/me`, which is behind the API's
 * `authGuard` — it is the session, not a hard-coded profile.
 */
export interface SessionProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  plan: string | null;
  persona: string | null;
}

export interface UseProfileResult {
  profile: SessionProfile | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Load the signed-in user's profile.
 *
 * The sidebar and the dashboard header both need it, and the API has no
 * session endpoint that returns the account plan/persona, so the profile is
 * fetched from the authenticated `GET /user/me` route.
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = React.useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const client = createApiClient();
        const res = await client.user.me.$get();
        if (cancelled) return;
        if (!res.ok) {
          setError(`Your profile could not be loaded (HTTP ${res.status}).`);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        const user = data?.user;
        if (cancelled) return;
        setProfile({
          id: user?.id ?? "",
          name: user?.name ?? null,
          email: user?.email ?? null,
          role: user?.role ?? null,
          plan: user?.plan ?? null,
          persona: user?.persona ?? null,
        });
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Your profile could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, isLoading, error };
}

/** Initials for the sidebar avatar. */
export function initialsFor(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
