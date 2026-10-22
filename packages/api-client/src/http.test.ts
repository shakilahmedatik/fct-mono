import { describe, expect, it } from "bun:test";
import { ApiError, apiError, isApiError, parseResponse, readJson } from "./http";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("api-client response helpers", () => {
  it("parses a JSON body into data", async () => {
    const parsed = await parseResponse<{ id: string }>(jsonResponse({ id: "dig_1" }));

    expect(parsed.ok).toBeTrue();
    expect(parsed.status).toBe(200);
    expect(parsed.data).toEqual({ id: "dig_1" });
    expect(parsed.error).toBeNull();
  });

  it("falls back to text when the body is not JSON", async () => {
    const parsed = await parseResponse(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      }),
    );

    expect(parsed.ok).toBeFalse();
    expect(parsed.data).toBeNull();
    expect(parsed.text).toBe("Internal Server Error");
    expect(parsed.error).toBeInstanceOf(ApiError);
    expect(parsed.error?.status).toBe(500);
  });

  it("does not throw on a malformed JSON body", async () => {
    const parsed = await parseResponse(new Response("{not json", { status: 200 }));

    expect(parsed.ok).toBeTrue();
    expect(parsed.data).toBeNull();
    expect(parsed.text).toBe("{not json");
    expect(parsed.error).toBeNull();
  });

  it("handles an empty body", async () => {
    const parsed = await parseResponse(new Response(null, { status: 204 }));

    expect(parsed.ok).toBeTrue();
    expect(parsed.data).toBeNull();
    expect(parsed.text).toBe("");
  });

  it("builds an error message from a JSON error body", async () => {
    const parsed = await parseResponse(
      jsonResponse({ error: "Digest not found" }, { status: 404 }),
    );

    expect(parsed.error?.message).toContain("404");
    expect(parsed.error?.message).toContain("Digest not found");
    expect(parsed.error?.body).toEqual({ error: "Digest not found" });
  });

  it("readJson returns the payload on success", async () => {
    await expect(readJson(jsonResponse({ id: "dig_1" }))).resolves.toEqual({ id: "dig_1" });
  });

  it("readJson throws an ApiError on failure", async () => {
    await expect(readJson(new Response("boom", { status: 500 }))).rejects.toBeInstanceOf(ApiError);
  });

  it("apiError builds an ApiError from a status and body", () => {
    const error = apiError(422, { message: "Invalid payload" }, "Unprocessable Entity");

    expect(isApiError(error)).toBeTrue();
    expect(error.status).toBe(422);
    expect(error.message).toContain("Invalid payload");
  });
});
