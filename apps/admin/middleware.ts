import { type NextRequest, NextResponse } from "next/server";

/**
 * Cookie names that indicate a signed-in session.
 *
 * Better Auth names its session cookie `<cookiePrefix>.session_token`. The
 * default prefix is `better-auth`, and the cookie is prefixed with
 * `__Secure-` when the auth server is served over HTTPS (Better Auth derives
 * this from the configured base URL). `dont_remember` is the cookie Better
 * Auth issues for a session that is not persisted across browser restarts.
 *
 * `fc-session` is kept as a tolerant fallback in case the auth server is
 * configured with a custom `advanced.cookiePrefix`.
 *
 * ASSUMPTION: the auth server keeps Better Auth's default cookie prefix. The
 * list above covers the default, the HTTPS-prefixed variant and a custom
 * prefix, so the middleware still protects the route if the prefix changes.
 */
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.dont_remember",
  "__Secure-better-auth.dont_remember",
  "fc-session",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return typeof value === "string" && value.length > 0;
  });
}

export function middleware(request: NextRequest) {
  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Everything except the sign-in route, Next.js internals and static files.
   */
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
