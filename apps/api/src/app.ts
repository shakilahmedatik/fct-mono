import { db } from "@repo/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "./middleware/body-limit";
import { corsMiddleware } from "./middleware/cors";
import { logger, loggerMiddleware } from "./middleware/logger";
import { rateLimiter } from "./middleware/rate-limiter";
import { requestIdMiddleware } from "./middleware/request-id";
import { secureHeadersMiddleware } from "./middleware/secure-headers";
import { requestTimeout } from "./middleware/timeout";
import { adminRouter } from "./modules/admin/routes";
import { authRouter } from "./modules/auth/routes";
import { billingRouter } from "./modules/billing/routes";
import { blogRouter } from "./modules/blog/routes";
import { contactRouter } from "./modules/contact/routes";
import { deliveryRouter } from "./modules/delivery/routes";
import { digestRouter } from "./modules/digest/routes";
import { newsletterRouter } from "./modules/newsletter/routes";
import { playgroundRouter } from "./modules/playground/routes";
import { userRouter } from "./modules/user/routes";
import type { AppBindings } from "./types";

/**
 * How long a single dependency probe may take.
 *
 * A readiness probe is polled every few seconds by the orchestrator, so it has
 * to answer quickly. The request timeout middleware would eventually cut the
 * request off, but only after 30s — long enough for the orchestrator to have
 * already given up on the probe.
 */
const READINESS_PROBE_TIMEOUT_MS = 2_000;

async function probe<T>(operation: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), READINESS_PROBE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Readiness: verify the dependencies this service actually needs.
 *
 * The previous implementation returned a hard-coded `ready: true`, so an
 * instance that could not reach Postgres or Redis was still advertised as
 * ready and kept receiving traffic — turning a dependency outage into 100%
 * request hangs instead of a clean removal from the load balancer.
 */
async function checkDependencies(): Promise<{ postgres: boolean; redis: boolean }> {
  const [postgres, redis] = await Promise.all([
    probe(
      db.$client`SELECT 1`.then(() => true),
      false,
    ),
    probe(
      import("./lib/redis")
        .then(({ redis: client }) =>
          client.status === "ready"
            ? client
                .ping()
                .then(() => true)
                .catch(() => false)
            : false,
        )
        .catch(() => false),
      false,
    ),
  ]);

  return { postgres, redis };
}

export const app = new Hono<AppBindings>()
  .use("*", corsMiddleware)
  .use("*", requestIdMiddleware)
  .use("*", loggerMiddleware)
  .use("*", secureHeadersMiddleware)
  .use("*", bodyLimit())
  .use("*", requestTimeout())
  .use("*", rateLimiter(120, 60))
  // Health checks
  .get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "firstcup-api",
    }),
  )
  .get("/ready", async (c) => {
    const checks = await checkDependencies();
    const ready = checks.postgres && checks.redis;
    return c.json(
      {
        ready,
        checks,
        uptime: process.uptime(),
        service: "firstcup-api",
      },
      ready ? 200 : 503,
    );
  })
  // Mount modular route handlers.
  //
  // `/auth` is mounted at `/api/auth` to match Better Auth's default
  // `basePath` (`/api/auth`) and the default `basePath` used by the
  // `better-auth/react` client in `@repo/api-client`. The handler previously
  // sat under `/auth`, so every sign-in, sign-up and session request 404'd.
  .route("/api/auth", authRouter)
  .route("/user", userRouter)
  .route("/digests", digestRouter)
  .route("/billing", billingRouter)
  .route("/delivery", deliveryRouter)
  .route("/blog", blogRouter)
  .route("/newsletter", newsletterRouter)
  .route("/contact", contactRouter)
  // The admin router is mounted BEFORE the playground router on purpose.
  // Hono matches routes in registration order, so mounting the playground
  // first meant its terminal handlers ran before the admin router's
  // `authGuard` / `roleGuard` middleware could ever be reached.
  .route("/admin", adminRouter)
  .route("/admin/playground", playgroundRouter)
  .notFound((c) =>
    c.json(
      {
        error: "Not found",
        path: c.req.path,
        requestId: c.get("requestId"),
      },
      404,
    ),
  )
  .onError((err, c) => {
    const requestId = c.get("requestId");

    if (err instanceof HTTPException) {
      return c.json(
        {
          error: err.message || "Request failed",
          status: err.status,
          requestId,
        },
        err.status as 400,
      );
    }

    logger.error(
      {
        err: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        method: c.req.method,
        path: c.req.path,
        requestId,
      },
      "Unhandled request error",
    );

    // The internal message is logged, never returned: upstream SDK errors can
    // embed URLs, credentials and upstream response bodies.
    return c.json(
      {
        error: "Internal Server Error",
        requestId,
      },
      500,
    );
  });

export default app;
export type AppType = typeof app;
