import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

type SessionUser = {
  id: string;
  role?: string | null;
  banned?: boolean | null;
  banExpires?: Date | string | null;
};

/**
 * Is the ban on this user currently in force?
 *
 * Exported so it can be unit-tested without a database — the rule is subtle
 * (a ban with an expiry in the past is not active; a ban with no expiry is
 * permanent) and a regression here silently re-enables banned accounts.
 */
export function isBanActive(user: SessionUser): boolean {
  if (!user.banned) return false;
  const expires = user.banExpires ? new Date(user.banExpires) : null;
  if (expires && !Number.isNaN(expires.getTime())) {
    return expires.getTime() > Date.now();
  }
  return true;
}

/**
 * Require a valid session.
 *
 * A banned user is rejected here. Previously the `banned` flag was written by
 * the admin API but never read anywhere, so the admin "ban" button had no
 * effect on an existing session.
 */
export const authGuard = createMiddleware(async (c, next) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;

  try {
    session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
  } catch {
    // The session could not be verified because a dependency is unavailable.
    // That is not the same as "not signed in" — say so with a 503 rather than
    // pretending the request was unauthenticated or letting it become a 500.
    return c.json({ error: "Authentication service unavailable" }, 503);
  }

  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = session.user as SessionUser;

  if (isBanActive(user)) {
    // Revoke the session so a banned user cannot keep using an already-issued
    // cookie. `revokeSessions` revokes every session for the current user.
    try {
      await auth.api.revokeSessions({ headers: c.req.raw.headers });
    } catch {
      // Best effort: still refuse the request even if revocation fails.
    }
    return c.json({ error: "Account suspended" }, 403);
  }

  c.set("user", session.user);
  c.set("session", session.session);

  await next();
});
