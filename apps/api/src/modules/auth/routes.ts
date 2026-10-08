import { Hono } from "hono";
import { auth } from "../../auth";
import { authGuard } from "../../middleware/auth-guard";
import type { AppBindings } from "../../types";

export const authRouter = new Hono<AppBindings>()
  // Mount Better Auth catch-all handler
  .all("/*", (c) => auth.handler(c.req.raw))
  // Type-safe session check endpoint for frontends
  .get("/session", authGuard, (c) => {
    const user = c.get("user");
    const session = c.get("session");
    return c.json({ user, session });
  });
