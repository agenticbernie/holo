import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Holo Worker", () => {
  it("returns a request id from the health endpoint", async () => {
    const response = await SELF.fetch("http://holo.test/health");
    const body = (await response.json()) as { status: string; requestId: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.requestId).toMatch(/^req_/);
    expect(response.headers.get("X-Request-ID")).toBe(body.requestId);
  });

  it("allows the deployed Holo web origin", async () => {
    const response = await SELF.fetch("http://pipa.test/health", {
      headers: { Origin: "https://holo-web.hackonteam.workers.dev" },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://holo-web.hackonteam.workers.dev",
    );
  });

  it("serves an OpenAPI 3.1 document with Vietnamese endpoint metadata", async () => {
    const response = await SELF.fetch("http://holo.test/docs/openapi.json");
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
      info: { description: string };
    };

    expect(response.status).toBe(200);
    expect(document.openapi).toBe("3.1.0");
    expect(document.paths["/api/v1/recommendations"]).toBeDefined();
    expect(document.info.description).toContain("API backend");
  });

  it("creates and reads a SKU through D1 repositories", async () => {
    const payload = {
      name: "Váy kiểm thử",
      description: "SKU dùng cho integration test.",
      category: "dress",
      brand: "Holo Test",
      sellingPrice: 500000,
      stock: 20,
      styleTags: ["minimal"],
      targetAudience: ["women-25-34"],
    };
    const createResponse = await SELF.fetch("http://holo.test/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = (await createResponse.json()) as { skuId: string };
    const readResponse = await SELF.fetch(`http://holo.test/api/v1/products/${created.skuId}`);

    expect(createResponse.status).toBe(201);
    expect(created.skuId).toMatch(/^sku_/);
    expect(readResponse.status).toBe(200);
    expect(((await readResponse.json()) as { name: string }).name).toBe(payload.name);
    expect(env.DB).toBeDefined();
  });

  it("enqueues a dataset generation job without blocking the request", async () => {
    const response = await SELF.fetch("http://holo.test/api/v1/datasets/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parameters: {
          products: 10,
          kocs: 8,
          campaigns: 6,
          interactions: 100,
          coldStartRate: 0.25,
          seed: 20260806,
        },
      }),
    });
    const job = (await response.json()) as {
      jobId: string;
      status: string;
      parameters: { seed: number };
    };

    expect(response.status).toBe(202);
    expect(job.jobId).toMatch(/^dataset_/);
    expect(job.status).toBe("queued");
    expect(job.parameters.seed).toBe(20260806);
  });
});
