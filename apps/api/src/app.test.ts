import { describe, expect, it } from "bun:test";
import { app } from "./app";
import { isBanActive } from "./middleware/auth-guard";

describe("First Cup Tech Hono API App", () => {
  it("GET /health returns 200 and healthy service payload", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      status: string;
      timestamp: string;
      service: string;
    };
    expect(data.status).toBe("ok");
    expect(data.service).toBe("firstcup-api");
    expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("GET /ready reports the dependency checks rather than a hard-coded ready", async () => {
    const res = await app.request("/ready");
    // Without a reachable database and Redis the service is NOT ready, and it
    // must say so. The previous implementation always returned `ready: true`.
    const data = (await res.json()) as {
      ready: boolean;
      checks?: { postgres: boolean; redis: boolean };
      service: string;
    };
    expect(data.service).toBe("firstcup-api");
    expect(typeof data.ready).toBe("boolean");
    expect(data.checks).toBeDefined();
    if (!data.ready) {
      expect(res.status).toBe(503);
    } else {
      expect(res.status).toBe(200);
    }
  });

  it("injects secure headers on every response", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
  });

  it("handles 404 for unknown routes cleanly", async () => {
    const res = await app.request("/non-existent-endpoint-xyz");
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Not found");
  });
});

describe("Authentication is reachable", () => {
  it("mounts the Better Auth handler on the path the client uses", async () => {
    // Better Auth's default basePath is `/api/auth` and the client in
    // `@repo/api-client` calls that path. The handler used to be mounted at
    // `/auth`, so every sign-in, sign-up and session request 404'd.
    const res = await app.request("/api/auth/get-session");
    expect(res.status).not.toBe(404);
  });

  it("does not mount the auth handler on the old /auth path", async () => {
    const res = await app.request("/auth/get-session");
    expect(res.status).toBe(404);
  });
});

describe("Admin and playground routes require authentication", () => {
  /**
   * The admin router's guards must be registered BEFORE the playground's
   * handlers. Hono matches routes in registration order, so a playground
   * mounted first answers before the admin guard can ever run — which is
   * exactly how 33 admin endpoints ended up being publicly reachable.
   */
  it("registers the admin guard before the playground handlers", () => {
    const routes = app.routes;
    const adminGuardIndex = routes.findIndex(
      (route) => route.path === "/admin/*" && route.method === "ALL",
    );
    const playgroundIndex = routes.findIndex((route) => route.path.startsWith("/admin/playground"));

    expect(adminGuardIndex).toBeGreaterThan(-1);
    expect(playgroundIndex).toBeGreaterThan(-1);
    expect(adminGuardIndex).toBeLessThan(playgroundIndex);
  });

  const protectedPaths = [
    "/admin/stats",
    "/admin/users",
    "/admin/digests",
    "/admin/playground/sources",
    "/admin/playground/ai/settings",
    "/admin/playground/audio/settings",
    "/admin/playground/sessions",
    "/admin/playground/queues/status",
  ];

  for (const path of protectedPaths) {
    it(`GET ${path} is not publicly accessible`, async () => {
      const res = await app.request(path);
      // 401 when the session can be checked and no session exists. 503 when
      // the database is not reachable, so the session cannot be checked at
      // all. Either way the request must not succeed and must not return any
      // payload.
      expect([401, 503]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  }

  it("rejects a mutating playground request without a session", async () => {
    const res = await app.request("/admin/playground/tier4/enqueue-prod", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: "test-session" }),
    });
    expect([401, 503]).toContain(res.status);
  });
});

describe("Public webhooks verify their signature", () => {
  it("rejects an unsigned Paddle webhook", async () => {
    const res = await app.request("/billing/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_type: "subscription.created",
        data: { custom_data: { userId: "victim" }, id: "x", customer_id: "y" },
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a Paddle webhook with a malformed signature", async () => {
    const res = await app.request("/billing/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "paddle-signature": "ts=1;h1=deadbeef",
      },
      body: JSON.stringify({ event_type: "subscription.created", data: {} }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a Telegram webhook without the secret token", async () => {
    const res = await app.request("/delivery/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: { chat: { id: 1 }, text: "/start some-user-id" },
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a Telegram webhook with a wrong secret token", async () => {
    const res = await app.request("/delivery/telegram/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "definitely-not-the-secret",
      },
      body: JSON.stringify({
        message: { chat: { id: 1 }, text: "/start some-user-id" },
      }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Outbound targets cannot be redirected by the caller", () => {
  it("rejects an unknown x-ai-provider value", async () => {
    const res = await app.request("/admin/playground/ai/settings", {
      headers: { "x-ai-provider": "https://evil.example.com/v1" },
    });
    // The request is rejected by the auth guard first; either way it must not
    // be processed as a provider override.
    expect([400, 401]).toContain(res.status);
  });
});

describe("Error responses use a consistent JSON envelope", () => {
  it("returns JSON, not plain text, for an unknown route", async () => {
    const res = await app.request("/admin/playground/definitely-not-a-route");
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("Ban enforcement", () => {
  it("does not treat an unbanned user as banned", () => {
    expect(isBanActive({ id: "u1", banned: false })).toBe(false);
  });

  it("treats a ban with no expiry as permanent", () => {
    expect(isBanActive({ id: "u1", banned: true })).toBe(true);
    expect(isBanActive({ id: "u1", banned: true, banExpires: null })).toBe(true);
  });

  it("treats a ban whose expiry is in the future as active", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isBanActive({ id: "u1", banned: true, banExpires: future })).toBe(true);
  });

  it("treats a ban whose expiry has passed as lifted", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isBanActive({ id: "u1", banned: true, banExpires: past })).toBe(false);
  });

  it("does not treat an unparseable expiry as lifted — an unban must be explicit", () => {
    expect(isBanActive({ id: "u1", banned: true, banExpires: "not-a-date" })).toBe(true);
  });
});
