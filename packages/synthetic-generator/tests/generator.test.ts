import type { DatasetGenerationParameters } from "@pipa/domain";
import { describe, expect, it } from "vitest";
import { generateSyntheticDataset } from "../src/index";

const parameters: DatasetGenerationParameters = {
  products: 10,
  kocs: 8,
  campaigns: 6,
  interactions: 100,
  coldStartRate: 0.25,
  seed: 20260806,
};

describe("synthetic dataset generator", () => {
  it("produces reproducible output and deterministic fallback warnings", async () => {
    const options = { now: "2026-08-06T00:00:00.000Z", requestId: "req_test" };
    const first = await generateSyntheticDataset(parameters, options);
    const second = await generateSyntheticDataset(parameters, options);

    expect(first).toEqual(second);
    expect(first.fallbackUsed).toBe(true);
    expect(first.dataset.products).toHaveLength(10);
    expect(first.dataset.kocs.filter((koc) => koc.isColdStart)).toHaveLength(2);
    expect(first.dataset.campaignResults).toHaveLength(100);
    expect(new Set(first.dataset.campaignResults.map((result) => result.resultId)).size).toBe(100);
    expect(
      first.dataset.campaignResults.every(
        (result) => result.revenue === result.orders * result.sellingPrice,
      ),
    ).toBe(true);
    expect(first.dataset.warnings.every((warning) => warning.code === "KIMI_FALLBACK")).toBe(true);
  });
});
