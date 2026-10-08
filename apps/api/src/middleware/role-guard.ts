import { createMiddleware } from "hono/factory";

export function roleGuard(requiredRole: string) {
  return createMiddleware(async (c, next) => {
    const user = c.get("user") as { role?: string } | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (user.role !== requiredRole) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  });
}
