import { describe, expect, it } from "bun:test";
import { app } from "./app";

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

  it("GET /ready returns 200 ready probe", async () => {
    const res = await app.request("/ready");
    expect(res.status).toBe(200);

    const data = (await res.json()) as { ready: boolean; service: string };
    expect(data.ready).toBe(true);
    expect(data.service).toBe("firstcup-api");
  });

  it("injects secure headers on every response", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("handles 404 for unknown routes cleanly", async () => {
    const res = await app.request("/non-existent-endpoint-xyz");
    expect(res.status).toBe(404);
  });
});
