import { afterEach, describe, expect, it, vi } from "vitest";
import { createHoloApiClient } from "../src";

describe("Holo API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses a health response through the runtime schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "holo-api",
            environment: "test",
            requestId: "req_test",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const health = await createHoloApiClient("/api/holo").health();
    expect(health.service).toBe("holo-api");
    expect(fetch).toHaveBeenCalledWith("/api/holo/health", expect.any(Object));
  });

  it("surfaces structured API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "NOT_FOUND", message: "Không tìm thấy.", requestId: "req_missing" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    await expect(createHoloApiClient().getProduct("missing")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      requestId: "req_missing",
    });
  });
});
