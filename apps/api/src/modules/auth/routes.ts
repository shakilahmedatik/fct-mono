import { Hono } from "hono";
import { auth } from "../../auth";
import { authGuard } from "../../middleware/auth-guard";
import type { AppBindings } from "../../types";

export const authRouter = new Hono<AppBindings>()
  // The type-safe session endpoint is registered BEFORE the Better Auth
  // catch-all. The catch-all is a terminal handler, so registering it first
  // meant this route was unreachable and always answered 404.
  .get("/session", authGuard, (c) => {
    const user = c.get("user");
    const session = c.get("session");
    return c.json({ user, session });
  })
  // Mount Better Auth catch-all handler.
  .all("/*", (c) => auth.handler(c.req.raw));
