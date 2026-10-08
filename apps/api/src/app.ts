import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimiter } from "./middleware/rate-limiter";
import { requestIdMiddleware } from "./middleware/request-id";
import { secureHeadersMiddleware } from "./middleware/secure-headers";
import { adminRouter } from "./modules/admin/routes";
import { authRouter } from "./modules/auth/routes";
import { billingRouter } from "./modules/billing/routes";
import { blogRouter } from "./modules/blog/routes";
import { contactRouter } from "./modules/contact/routes";
import { deliveryRouter } from "./modules/delivery/routes";
import { digestRouter } from "./modules/digest/routes";
import { newsletterRouter } from "./modules/newsletter/routes";
import { userRouter } from "./modules/user/routes";
import type { AppBindings } from "./types";

export const app = new Hono<AppBindings>()
  .use("*", corsMiddleware)
  .use("*", requestIdMiddleware)
  .use("*", loggerMiddleware)
  .use("*", secureHeadersMiddleware)
  .use("*", rateLimiter(120, 60))
  // Health checks
  .get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "firstcup-api",
    }),
  )
  .get("/ready", (c) =>
    c.json({
      ready: true,
      uptime: process.uptime(),
      service: "firstcup-api",
    }),
  )
  // Mount modular route handlers
  .route("/auth", authRouter)
  .route("/user", userRouter)
  .route("/digests", digestRouter)
  .route("/billing", billingRouter)
  .route("/delivery", deliveryRouter)
  .route("/blog", blogRouter)
  .route("/newsletter", newsletterRouter)
  .route("/contact", contactRouter)
  .route("/admin", adminRouter);

export default app;
export type AppType = typeof app;
